import { z } from 'zod';
import { router, protectedProcedure, teacherProcedure } from '../trpc';
import { prisma } from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';

export const gradeRouter = router({
  get: protectedProcedure
    .input(z.object({ submissionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const grade = await prisma.grade.findUnique({
        where: { submissionId: input.submissionId },
        include: { breakdowns: { include: { rubricItem: true, question: true } } }
      });

      if (!grade) throw new TRPCError({ code: 'NOT_FOUND', message: 'Điểm số chưa có sẵn' });

      // Bảo mật cách ly dữ liệu: Học sinh chỉ xem bài của mình
      if ((ctx.session.user as any).role === 'STUDENT') {
        const sub = await prisma.submission.findUnique({ where: { id: input.submissionId } });
        if (!sub || sub.studentId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return grade;
    }),

  override: teacherProcedure
    .input(z.object({
      gradeId: z.string().uuid(),
      overrides: z.array(z.object({
        breakdownId: z.string().uuid(),
        newScore: z.number().min(0),
        teacherComment: z.string()
      })),
      reason: z.string().min(5, 'Giáo viên phải ghi rõ lý do sửa điểm để phục vụ lưu vết (Audit log).')
    }))
    .mutation(async ({ ctx, input }) => {
      const grade = await prisma.grade.findUnique({
        where: { id: input.gradeId },
        include: { breakdowns: true }
      });
      if (!grade) throw new TRPCError({ code: 'NOT_FOUND' });

      let scoreDelta = new Prisma.Decimal(0);

      // Cập nhật từng dòng điểm thành phần
      for (const override of input.overrides) {
        const bd = grade.breakdowns.find(b => b.id === override.breakdownId);
        if (bd) {
          scoreDelta = scoreDelta.add(new Prisma.Decimal(override.newScore).sub(bd.scoreAwarded));
          await prisma.gradeBreakdown.update({
            where: { id: override.breakdownId },
            data: { 
              scoreAwarded: new Prisma.Decimal(override.newScore), 
              teacherComment: override.teacherComment 
            }
          });
        }
      }

      const newTotalScore = (grade.totalScore || grade.aiTotalScore || new Prisma.Decimal(0)).add(scoreDelta);

      // BẮT BUỘC: Ghi lại Audit Trail (Nhật ký thay đổi) theo kiến trúc
      await prisma.gradeRevision.create({
        data: {
          gradeId: grade.id,
          changedById: ctx.session.user.id!,
          oldScore: grade.totalScore,
          newScore: newTotalScore,
          reason: input.reason
        }
      });

      return await prisma.grade.update({
        where: { id: input.gradeId },
        data: {
          totalScore: newTotalScore,
          status: 'OVERRIDDEN', // Gắn cờ có sự can thiệp của người
          reviewedById: ctx.session.user.id,
          reviewedAt: new Date()
        }
      });
    }),

  publish: teacherProcedure
    .input(z.object({ gradeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const grade = await prisma.grade.findUnique({ 
        where: { id: input.gradeId },
        include: { submission: { include: { assignment: true } } }
      });
      if (!grade) throw new TRPCError({ code: 'NOT_FOUND' });

      const published = await prisma.grade.update({
        where: { id: input.gradeId },
        data: {
          status: 'APPROVED',
          publishedAt: new Date(),
          reviewedById: ctx.session.user.id,
          reviewedAt: new Date()
        }
      });

      try {
        await prisma.notification.create({
          data: {
            userId: grade.submission.studentId,
            type: 'GRADE_PUBLISHED',
            title: `🏆 Đã có điểm bài thi: ${grade.submission.assignment.title}`,
            body: `Giáo viên đã công bố kết quả chấm thi. Tổng điểm của bạn: ${Number(grade.totalScore || grade.aiTotalScore || 0).toFixed(1)} điểm.`,
            relatedEntityType: 'GRADE',
            relatedEntityId: grade.id
          }
        });
      } catch (err) {
        console.error('Failed to notify student about published grade', err);
      }

      return published;
    }),

  createAppeal: protectedProcedure
    .input(z.object({
      gradeId: z.string().uuid(),
      questionId: z.string().uuid().optional(),
      reason: z.string().min(20, 'Lý do phúc khảo phải có tối thiểu 20 ký tự để Giáo viên xem xét.')
    }))
    .mutation(async ({ ctx, input }) => {
      const grade = await prisma.grade.findUnique({
        where: { id: input.gradeId },
        include: { 
          submission: { 
            include: { assignment: { include: { class: true } }, student: true } 
          } 
        }
      });
      if (!grade) throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy điểm số.' });

      if (grade.submission.studentId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Bạn không có quyền gửi đơn phúc khảo cho bài thi này.' });
      }

      const existing = await prisma.gradeAppeal.findFirst({
        where: { gradeId: input.gradeId, questionId: input.questionId || null }
      });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Bạn đã gửi đơn phúc khảo cho mục này rồi.' });

      const appeal = await prisma.gradeAppeal.create({
        data: {
          gradeId: input.gradeId,
          studentId: ctx.session.user.id!,
          questionId: input.questionId,
          reason: input.reason,
          status: 'PENDING'
        }
      });

      try {
        await prisma.notification.create({
          data: {
            userId: grade.submission.assignment.class.teacherId,
            type: 'APPEAL_RECEIVED',
            title: `🔔 Đơn phúc khảo mới từ ${grade.submission.student.fullName}`,
            body: `Học sinh ${grade.submission.student.fullName} đã gửi đơn phúc khảo cho bài thi ${grade.submission.assignment.title}.`,
            relatedEntityType: 'GRADE',
            relatedEntityId: grade.id
          }
        });
      } catch (err) {
        console.error('Failed to notify teacher about appeal', err);
      }

      return appeal;
    }),

  getAppeals: protectedProcedure
    .input(z.object({ gradeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await prisma.gradeAppeal.findMany({
        where: { gradeId: input.gradeId },
        include: {
          student: { select: { fullName: true, email: true } },
          question: { select: { content: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }),

  resolveAppeal: teacherProcedure
    .input(z.object({
      appealId: z.string().uuid(),
      status: z.enum(['RESOLVED_APPROVED', 'RESOLVED_REJECTED']),
      teacherResponse: z.string().min(5, 'Vui lòng nhập phản hồi cho học sinh.')
    }))
    .mutation(async ({ ctx, input }) => {
      const appeal = await prisma.gradeAppeal.update({
        where: { id: input.appealId },
        data: {
          status: input.status,
          teacherResponse: input.teacherResponse,
          resolvedAt: new Date()
        },
        include: { grade: { include: { submission: { include: { assignment: true } } } } }
      });

      try {
        await prisma.notification.create({
          data: {
            userId: appeal.studentId,
            type: 'APPEAL_RESOLVED',
            title: `🔔 Kết quả phúc khảo bài thi ${appeal.grade.submission.assignment.title}`,
            body: `Giáo viên đã ${input.status === 'RESOLVED_APPROVED' ? 'chấp nhận' : 'từ chối'} đơn phúc khảo của bạn.`,
            relatedEntityType: 'GRADE',
            relatedEntityId: appeal.gradeId
          }
        });
      } catch (err) {
        console.error('Failed to notify student about appeal resolution', err);
      }

      return appeal;
    })
});
