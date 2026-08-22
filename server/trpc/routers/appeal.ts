import { z } from 'zod';
import { router, protectedProcedure, teacherProcedure } from '../trpc';
import { prisma } from '@/lib/db';
import { TRPCError } from '@trpc/server';

export const appealRouter = router({
  create: protectedProcedure
    .input(z.object({
      gradeId: z.string().uuid(),
      questionId: z.string().uuid().optional(),
      reason: z.string().min(20, 'Lý do phúc khảo quá ngắn. Vui lòng giải thích rõ ràng chi tiết bạn cần khiếu nại (tối thiểu 20 ký tự).')
    }))
    .mutation(async ({ ctx, input }) => {
      if ((ctx.session.user as any).role !== 'STUDENT') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Chỉ học sinh mới có quyền tạo đơn phúc khảo.' });
      }

      const grade = await prisma.grade.findUnique({
        where: { id: input.gradeId },
        include: { submission: true }
      });

      if (!grade || grade.submission.studentId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Ngăn chặn nộp phúc khảo nhiều lần cho cùng một cấu phần
      const existing = await prisma.gradeAppeal.findFirst({
        where: { gradeId: input.gradeId, questionId: input.questionId || null }
      });
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Bạn đã nộp đơn phúc khảo cho phần này rồi. Vui lòng chờ thầy cô xử lý.' });
      }

      return await prisma.gradeAppeal.create({
        data: {
          gradeId: input.gradeId,
          studentId: ctx.session.user.id!,
          questionId: input.questionId,
          reason: input.reason
        }
      });
    }),

  resolve: teacherProcedure
    .input(z.object({
      appealId: z.string().uuid(),
      status: z.enum(['RESOLVED_APPROVED', 'RESOLVED_REJECTED']),
      teacherResponse: z.string().min(5, 'Giáo viên cần viết câu trả lời cho đơn phúc khảo của học sinh.')
    }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.gradeAppeal.update({
        where: { id: input.appealId },
        data: {
          status: input.status,
          teacherResponse: input.teacherResponse,
          resolvedAt: new Date()
        }
      });
    })
});
