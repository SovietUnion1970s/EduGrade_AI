import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './context';

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware cô lập và bắt buộc đăng nhập
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'Bạn phải đăng nhập để thực hiện thao tác này.'
    });
  }
  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: ctx.session.user as NonNullable<typeof ctx.session.user> & { id: string },
      },
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Middleware kiểm tra quyền giáo viên / admin
const isTeacher = t.middleware(({ ctx, next }) => {
  const role = (ctx.session?.user as any)?.role;
  if (!ctx.session?.user?.id || (role !== 'TEACHER' && role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN')) {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Thao tác bị từ chối. Chỉ giáo viên hoặc quản trị viên mới có quyền truy cập.'
    });
  }
  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: ctx.session.user as NonNullable<typeof ctx.session.user> & { id: string },
      },
    },
  });
});

export const teacherProcedure = t.procedure.use(isAuthed).use(isTeacher);
