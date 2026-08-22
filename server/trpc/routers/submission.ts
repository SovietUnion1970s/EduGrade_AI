import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
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

      const existingSub = await prisma.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: ctx.session.user.id! } }
      });
      if (existingSub) throw new TRPCError({ code: 'CONFLICT', message: 'Bạn đã nộp bài này rồi.' });

      const submission = await prisma.submission.create({
        data: {
          assignmentId: input.assignmentId,
          studentId: ctx.session.user.id!,
          status: 'GRADING',
          submittedAt: new Date(),
          antiCheatLog: input.antiCheatLog ? JSON.parse(JSON.stringify(input.antiCheatLog)) : [],
          answers: {
            create: input.answers.map(ans => ({
              questionId: ans.questionId,
              answerText: ans.answerText,
              answerFileUrl: ans.answerFileUrl
            }))
          }
        }
      });

      await gradingQueue.add('grade-submission', { submissionId: submission.id });
      return { submissionId: submission.id, message: 'Nộp bài thành công. AI đang chấm điểm bất đồng bộ.' };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const submission = await prisma.submission.findUnique({
        where: { id: input.id },
        include: {
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
    })
});
