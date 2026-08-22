import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/db';

export const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().optional(),
      unreadOnly: z.boolean().default(false)
    }))
    .query(async ({ ctx, input }) => {
      const items = await prisma.notification.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.unreadOnly ? { isRead: false } : {})
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' }
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      const unreadCount = await prisma.notification.count({
        where: { userId: ctx.session.user.id, isRead: false }
      });

      return { items, nextCursor, unreadCount };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { isRead: true }
      });
    }),

  markAllRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await prisma.notification.updateMany({
        where: { userId: ctx.session.user.id, isRead: false },
        data: { isRead: true }
      });
    })
});
