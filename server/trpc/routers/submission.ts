import { z } from 'zod';
import { router, protectedProcedure, teacherProcedure } from '../trpc';
import { prisma } from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { gradingQueue } from '../../worker/queue';

export const submissionRouter = router({
  submit: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      answers: z.array(z.object({
        questionId: z.string().uuid(),
        answerText: z.string().optional(),
        answerFileUrl: z.string().optional()
      })),
      antiCheatLog: z.array(z.object({
        event: z.string(),
        timestamp: z.string(),
        count: z.number().optional()
      })).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await prisma.assignment.findUnique({
        where: { id: input.assignmentId }
      });
      if (!assignment || assignment.status !== 'PUBLISHED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bài tập này hiện chưa được mở.' });

      let submission = await prisma.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: ctx.session.user.id! } }
      });

      if (submission && submission.status !== 'IN_PROGRESS') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Bạn đã nộp bài này rồi.' });
      }

      const data = {
        status: 'GRADING' as any,
        submittedAt: new Date(),
        antiCheatLog: input.antiCheatLog ? JSON.parse(JSON.stringify(input.antiCheatLog)) : [],
      };

      if (submission) {
        submission = await prisma.submission.update({
          where: { id: submission.id },
          data: {
            ...data,
            answers: {
              create: input.answers.map(ans => ({
                questionId: ans.questionId,
                answerText: ans.answerText,
                answerFileUrl: ans.answerFileUrl
              }))
            }
          }
        });
      } else {
        submission = await prisma.submission.create({
          data: {
            assignmentId: input.assignmentId,
            studentId: ctx.session.user.id!,
            ...data,
            answers: {
              create: input.answers.map(ans => ({
                questionId: ans.questionId,
                answerText: ans.answerText,
                answerFileUrl: ans.answerFileUrl
              }))
            }
          }
        });
      }

      const assignmentObj = await prisma.assignment.findUnique({
        where: { id: input.assignmentId },
        include: { class: true }
      });

      if (assignmentObj) {
        await prisma.notification.create({
          data: {
            userId: assignmentObj.class.teacherId,
            type: 'SYSTEM',
            title: `Học sinh nộp bài mới`,
            body: `Một học sinh vừa nộp bài thi: ${assignmentObj.title}`,
            actionUrl: `/teacher/submissions/${submission.id}`
          }
        });
      }

      await gradingQueue.add('grade-submission', { submissionId: submission.id });
      return { submissionId: submission.id, message: 'Nộp bài thành công. AI đang chấm điểm bất đồng bộ.' };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const submission = await prisma.submission.findUnique({
        where: { id: input.id },
        include: {
          student: { select: { fullName: true, email: true } },
          assignment: { select: { title: true, class: { select: { name: true } } } },
          answers: { include: { question: true }, orderBy: { question: { orderIndex: 'asc' } } },
          grade: { include: { breakdowns: { include: { rubricItem: true } } } }
        }
      });
      if (!submission) throw new TRPCError({ code: 'NOT_FOUND' });
      
      const role = (ctx.session.user as any).role;
      if (role === 'STUDENT' && submission.studentId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return submission;
    }),

  getAllByAssignment: protectedProcedure
    .input(z.object({ assignmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx.session.user as any).orgId;
      const assignment = await prisma.assignment.findFirst({
        where: { id: input.assignmentId, class: { orgId, teacherId: ctx.session.user.id } }
      });
      if (!assignment) throw new TRPCError({ code: 'FORBIDDEN' });

      return await prisma.submission.findMany({
        where: { assignmentId: input.assignmentId },
        include: {
          student: { select: { fullName: true, email: true } },
          grade: { select: { totalScore: true, status: true } }
        },
        orderBy: { submittedAt: 'desc' }
      });
    }),

  getAntiCheatReport: protectedProcedure
    .input(z.object({ assignmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const submissions = await prisma.submission.findMany({
        where: { assignmentId: input.assignmentId },
        include: {
          student: { select: { id: true, fullName: true, email: true } }
        },
        orderBy: { submittedAt: 'desc' }
      });

      return submissions.map(sub => {
        const logs = (sub.antiCheatLog as any[]) || [];
        const count = logs.length;
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (count >= 5) riskLevel = 'HIGH';
        else if (count >= 2) riskLevel = 'MEDIUM';

        return {
          id: sub.id,
          student: sub.student,
          submittedAt: sub.submittedAt,
          antiCheatLog: logs,
          violationCount: count,
          riskLevel
        };
      });
    }),

  getMyGrades: protectedProcedure
    .query(async ({ ctx }) => {
      const submissions = await prisma.submission.findMany({
        where: { studentId: ctx.session.user.id },
        include: {
          assignment: {
            include: {
              class: { select: { name: true, subject: true } }
            }
          },
          grade: {
            select: { totalScore: true, status: true, publishedAt: true }
          }
        },
        orderBy: { submittedAt: 'desc' }
      });
      return submissions;
    }),

  startExam: protectedProcedure
    .input(z.object({ assignmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: ctx.session.user.id } }
      });
      if (existing) return existing;
      
      return await prisma.submission.create({
        data: {
          assignmentId: input.assignmentId,
          studentId: ctx.session.user.id,
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });
    }),

  logViolation: protectedProcedure
    .input(z.object({
      assignmentId: z.string().uuid(),
      event: z.string(),
      reason: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const sub = await prisma.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: ctx.session.user.id } }
      });
      if (!sub) return null;

      const currentLogs = (sub.antiCheatLog as any[]) || [];
      const newLog = { event: input.event, timestamp: new Date().toISOString(), reason: input.reason, count: currentLogs.length + 1 };
      
      return await prisma.submission.update({
        where: { id: sub.id },
        data: { antiCheatLog: [...currentLogs, newLog] }
      });
    }),

  getActiveExams: teacherProcedure
    .query(async ({ ctx }) => {
      // Find all in-progress submissions for classes owned by this teacher
      return await prisma.submission.findMany({
        where: {
          assignment: { class: { teacherId: ctx.session.user.id } },
          status: 'IN_PROGRESS'
        },
        include: {
          student: { select: { fullName: true, email: true } },
          assignment: { select: { title: true, class: { select: { name: true } } } }
        },
        orderBy: { startedAt: 'desc' }
      });
    }),

  forceSubmit: teacherProcedure
    .input(z.object({ submissionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await prisma.submission.findUnique({
        where: { id: input.submissionId },
        include: { assignment: { include: { class: true } } }
      });
      if (!sub || sub.assignment.class.teacherId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN' });

      const updated = await prisma.submission.update({
        where: { id: input.submissionId },
        data: { status: 'GRADING', submittedAt: new Date(), autoSubmitted: true }
      });
      
      await gradingQueue.add('grade-submission', { submissionId: updated.id });
      return { success: true };
    })
});
