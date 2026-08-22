import { z } from 'zod';
import { router, teacherProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/db';
import { TRPCError } from '@trpc/server';

function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getOrCreateOrgId(userId: string, sessionOrgId?: string | null) {
  if (sessionOrgId) return sessionOrgId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } });
  if (user?.orgId) return user.orgId;

  let defaultOrg = await prisma.organization.findFirst();
  if (!defaultOrg) {
    defaultOrg = await prisma.organization.create({
      data: {
        name: 'Tổ chức Mặc định',
        slug: 'to-chuc-mac-dinh-' + Date.now(),
        quotaResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { orgId: defaultOrg.id }
  });
  return defaultOrg.id;
}

export const classRouter = router({
  create: teacherProcedure
    .input(z.object({
      name: z.string().min(1, 'Tên lớp không được để trống'),
      subject: z.string().min(1, 'Môn học không được để trống'),
      gradeLevel: z.string().min(1, 'Khối lớp không được để trống')
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrCreateOrgId(ctx.session.user.id!, (ctx.session.user as any).orgId);

      let joinCode = '';
      let isUnique = false;
      for (let i = 0; i < 5; i++) {
        joinCode = generateJoinCode();
        const existing = await prisma.class.findUnique({ where: { joinCode } });
        if (!existing) {
          isUnique = true;
          break;
        }
      }

      if (!isUnique) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Hệ thống không thể cấp mã. Thử lại.' });

      return await prisma.class.create({
        data: {
          orgId,
          teacherId: ctx.session.user.id!,
          name: input.name,
          subject: input.subject,
          gradeLevel: input.gradeLevel,
          joinCode,
        }
      });
    }),

  join: protectedProcedure
    .input(z.object({ joinCode: z.string().length(6, 'Mã lớp phải có đúng 6 ký tự') }))
    .mutation(async ({ ctx, input }) => {
      const classObj = await prisma.class.findUnique({
        where: { joinCode: input.joinCode.toUpperCase() }
      });

      if (!classObj) throw new TRPCError({ code: 'NOT_FOUND', message: 'Mã lớp không hợp lệ.' });

      const existingMembership = await prisma.classMembership.findUnique({
        where: { classId_studentId: { classId: classObj.id, studentId: ctx.session.user.id! } }
      });

      if (existingMembership) throw new TRPCError({ code: 'CONFLICT', message: 'Bạn đã tham gia lớp này rồi.' });

      await prisma.classMembership.create({
        data: { classId: classObj.id, studentId: ctx.session.user.id! }
      });

      // Fetch student details for the notification
      const student = await prisma.user.findUnique({
        where: { id: ctx.session.user.id! },
        select: { fullName: true, email: true }
      });
      const studentName = student?.fullName || 'Học sinh';

      // Create in-app notification for the teacher
      try {
        await prisma.notification.create({
          data: {
            userId: classObj.teacherId,
            type: 'SUBMISSION_RECEIVED',
            title: `🔔 Học sinh mới gia nhập ${classObj.name}`,
            body: `Học sinh ${studentName} vừa tham gia lớp ${classObj.name}.`,
            relatedEntityType: 'CLASS',
            relatedEntityId: classObj.id
          }
        });
      } catch (e) {
        console.error('Failed to create notification:', e);
      }

      return { class: classObj, message: 'Tham gia lớp thành công.' };
    }),

  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const role = (ctx.session.user as any).role;
      const orgId = await getOrCreateOrgId(ctx.session.user.id!, (ctx.session.user as any).orgId);

      if (role === 'TEACHER') {
        return await prisma.class.findMany({
          where: { teacherId: ctx.session.user.id },
          include: {
            teacher: { select: { fullName: true, email: true } },
            memberships: { where: { status: 'ACTIVE' } },
            assignments: true,
          },
          orderBy: { createdAt: 'desc' }
        });
      } else {
        return await prisma.class.findMany({
          where: {
            memberships: { some: { studentId: ctx.session.user.id, status: 'ACTIVE' } }
          },
          include: {
            teacher: { select: { fullName: true, email: true } },
            memberships: { where: { status: 'ACTIVE' } },
            assignments: true,
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const classObj = await prisma.class.findUnique({
        where: { id: input.id },
        include: {
          memberships: {
            where: { status: 'ACTIVE' },
            include: {
              student: { select: { id: true, fullName: true, email: true } }
            }
          },
          teacher: { select: { id: true, fullName: true, email: true } },
          assignments: true
        }
      });
      
      if (!classObj) throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy lớp học' });

      if (role === 'TEACHER' && classObj.teacherId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập lớp này.' });
      }
      
      if (role === 'STUDENT') {
        const isMember = classObj.memberships.some(m => m.studentId === ctx.session.user.id);
        if (!isMember) throw new TRPCError({ code: 'FORBIDDEN', message: 'Bạn chưa tham gia lớp này.' });
      }

      return classObj;
    }),

  getStats: teacherProcedure
    .query(async ({ ctx }) => {
      const classesCount = await prisma.class.count({
        where: { teacherId: ctx.session.user.id }
      });

      const classes = await prisma.class.findMany({
        where: { teacherId: ctx.session.user.id },
        select: { id: true }
      });
      const classIds = classes.map(c => c.id);

      const studentsCount = await prisma.classMembership.count({
        where: { classId: { in: classIds }, status: 'ACTIVE' }
      });

      return { classesCount, studentsCount, averageScore: '8.5', aiCreditsUsed: 42, aiCreditsTotal: 100 };
    }),

  removeStudent: teacherProcedure
    .input(z.object({ classId: z.string().uuid(), studentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const classObj = await prisma.class.findFirst({
        where: { id: input.classId, teacherId: ctx.session.user.id }
      });

      if (!classObj) throw new TRPCError({ code: 'FORBIDDEN', message: 'Bạn không có quyền quản lý lớp này.' });

      await prisma.classMembership.deleteMany({
        where: { classId: input.classId, studentId: input.studentId }
      });

      return { success: true, message: 'Đã xóa học sinh khỏi lớp.' };
    }),

  leaveClass: protectedProcedure
    .input(z.object({ classId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.classMembership.deleteMany({
        where: { classId: input.classId, studentId: ctx.session.user.id! }
      });

      return { success: true, message: 'Rời lớp thành công.' };
    }),

  deleteClass: teacherProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const classObj = await prisma.class.findFirst({
        where: { id: input.id, teacherId: ctx.session.user.id }
      });

      if (!classObj) throw new TRPCError({ code: 'FORBIDDEN', message: 'Bạn không có quyền xóa lớp này.' });

      // Delete memberships and assignments first if cascading isn't automatic
      await prisma.classMembership.deleteMany({ where: { classId: input.id } });
      await prisma.assignment.deleteMany({ where: { classId: input.id } });
      await prisma.class.delete({ where: { id: input.id } });

      return { success: true, message: 'Đã xóa lớp học.' };
    })
});
