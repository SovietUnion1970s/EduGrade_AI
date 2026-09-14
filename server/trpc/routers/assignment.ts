import { z } from 'zod';
import { router, teacherProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { GradingStyle, QuestionType, AssignmentStatus } from '@prisma/client';

export const assignmentRouter = router({
  create: teacherProcedure
    .input(z.object({
      classId: z.string().uuid('ID lớp không hợp lệ'),
      title: z.string().min(1, 'Tiêu đề không được để trống'),
      description: z.string().optional(),
      aiGradingInstruction: z.string().optional(),
      gradingStyle: z.nativeEnum(GradingStyle).default(GradingStyle.THPT_QUOC_GIA),
      timeLimitMinutes: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const classObj = await prisma.class.findFirst({
        where: { id: input.classId, teacherId: ctx.session.user.id }
      });
      if (!classObj) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lớp không hợp lệ hoặc bạn không có quyền.' });

      return await prisma.assignment.create({
        data: {
          classId: input.classId,
          title: input.title,
          description: input.description,
          aiGradingInstruction: input.aiGradingInstruction,
          gradingStyle: input.gradingStyle,
          timeLimitMinutes: input.timeLimitMinutes,
          status: 'DRAFT'
        }
      });
    }),

  addQuestion: teacherProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      type: z.nativeEnum(QuestionType),
      content: z.string().min(1, 'Nội dung câu hỏi không được để trống'),
      maxScore: z.number().positive('Điểm số phải lớn hơn 0'),
      orderIndex: z.number().min(0),
      sampleAnswer: z.string().optional(),
      rubricItems: z.array(z.object({
        description: z.string().min(1),
        keywords: z.array(z.string()),
        score: z.number().positive(),
        isRequired: z.boolean().default(true),
        orderIndex: z.number().min(0)
      })).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await prisma.assignment.findFirst({
        where: { id: input.assignmentId, class: { teacherId: ctx.session.user.id } }
      });
      if (!assignment || assignment.status !== 'DRAFT') throw new TRPCError({ code: 'FORBIDDEN', message: 'Không thể thêm câu hỏi vào đề thi này.' });

      return await prisma.question.create({
        data: {
          assignmentId: input.assignmentId,
          type: input.type,
          content: input.content,
          maxScore: input.maxScore,
          orderIndex: input.orderIndex,
          sampleAnswer: input.sampleAnswer,
          rubricItems: input.rubricItems ? {
            create: input.rubricItems.map(r => ({
              description: r.description,
              keywords: r.keywords,
              score: r.score,
              isRequired: r.isRequired,
              orderIndex: r.orderIndex
            }))
          } : undefined
        }
      });
    }),

  getAllByClass: protectedProcedure
    .input(z.object({ classId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;

      return await prisma.assignment.findMany({
        where: { 
          classId: input.classId,
          ...(role === 'STUDENT' ? { status: { in: ['PUBLISHED', 'CLOSED'] } } : {})
        },
        include: {
          questions: { select: { id: true } },
          submissions: role === 'STUDENT' 
            ? { where: { studentId: ctx.session.user.id }, select: { id: true, status: true } } 
            : { select: { id: true, status: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const assignment = await prisma.assignment.findFirst({
        where: { id: input.id },
        include: {
          questions: { include: { rubricItems: true }, orderBy: { orderIndex: 'asc' } },
          class: { select: { name: true, teacherId: true } },
          submissions: { where: { studentId: ctx.session.user.id } }
        }
      });
      if (!assignment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy đề thi.' });
      return assignment;
    }),

  publish: teacherProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await prisma.assignment.findFirst({
        where: { id: input.id, class: { teacherId: ctx.session.user.id } }
      });
      if (!assignment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy đề thi hoặc không có quyền.' });

      const published = await prisma.assignment.update({
        where: { id: input.id },
        data: { status: 'PUBLISHED', availableFrom: new Date() }
      });

      // Bắn thông báo cho học sinh trong lớp (Tính năng 5: Real-time notification cho học sinh)
      try {
        const memberships = await prisma.classMembership.findMany({
          where: { classId: assignment.classId, status: 'ACTIVE' },
          select: { studentId: true }
        });

        if (memberships.length > 0) {
          await prisma.notification.createMany({
            data: memberships.map(m => ({
              userId: m.studentId,
              type: 'ASSIGNMENT_PUBLISHED',
              title: `📝 Bài thi mới: ${assignment.title}`,
              body: `Giáo viên vừa giao bài thi mới cho lớp. Hãy vào làm bài ngay!`,
              relatedEntityType: 'ASSIGNMENT',
              relatedEntityId: assignment.id
            }))
          });
        }
      } catch (err) {
        console.error('Failed to notify students about published assignment', err);
      }

      return published;
    }),

  updatePrompt: teacherProcedure
    .input(z.object({
      id: z.string().uuid(),
      aiGradingInstruction: z.string().optional(),
      gradingStyle: z.nativeEnum(GradingStyle).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await prisma.assignment.findFirst({
        where: { id: input.id, class: { teacherId: ctx.session.user.id } }
      });
      if (!assignment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy đề thi hoặc không có quyền.' });

      return await prisma.assignment.update({
        where: { id: input.id },
        data: {
          ...(input.aiGradingInstruction !== undefined ? { aiGradingInstruction: input.aiGradingInstruction } : {}),
          ...(input.gradingStyle !== undefined ? { gradingStyle: input.gradingStyle } : {})
        }
      });
    }),

  deleteQuestion: teacherProcedure
    .input(z.object({ questionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const question = await prisma.question.findUnique({
        where: { id: input.questionId },
        include: { assignment: { include: { class: true } } }
      });
      if (!question || question.assignment.class.teacherId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy câu hỏi hoặc không có quyền.' });
      }
      if (question.assignment.status !== 'DRAFT') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không thể xóa câu hỏi khi đề thi đã được công bố.' });
      }

      await prisma.question.delete({ where: { id: input.questionId } });
      return { success: true };
    }),

  clearAllQuestions: teacherProcedure
    .input(z.object({ assignmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await prisma.assignment.findFirst({
        where: { id: input.assignmentId, class: { teacherId: ctx.session.user.id } }
      });
      if (!assignment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy đề thi hoặc không có quyền.' });
      if (assignment.status !== 'DRAFT') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không thể xóa câu hỏi khi đề thi đã được công bố.' });
      }

      await prisma.question.deleteMany({ where: { assignmentId: input.assignmentId } });
      return { success: true };
    }),

  updateQuestion: teacherProcedure
    .input(z.object({
      questionId: z.string().uuid(),
      content: z.string().min(1, 'Nội dung câu hỏi không được để trống'),
      maxScore: z.number().positive('Điểm số phải lớn hơn 0'),
      type: z.nativeEnum(QuestionType).optional(),
      sampleAnswer: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const question = await prisma.question.findUnique({
        where: { id: input.questionId },
        include: { assignment: { include: { class: true } } }
      });
      if (!question || question.assignment.class.teacherId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy câu hỏi hoặc không có quyền.' });
      }
      if (question.assignment.status !== 'DRAFT') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không thể chỉnh sửa câu hỏi khi đề thi đã được công bố.' });
      }

      return await prisma.question.update({
        where: { id: input.questionId },
        data: {
          content: input.content,
          maxScore: input.maxScore,
          ...(input.type ? { type: input.type } : {}),
          ...(input.sampleAnswer !== undefined ? { sampleAnswer: input.sampleAnswer } : {})
        }
      });
    })
});
