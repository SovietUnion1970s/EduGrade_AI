import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const registerSchema = z.object({
  email: z.string().email('Định dạng email không hợp lệ.'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự.'),
  fullName: z.string().min(2, 'Tên người dùng phải có ít nhất 2 ký tự.'),
  role: z.enum(['TEACHER', 'STUDENT'], {
    message: 'Vai trò không hợp lệ. Chỉ chấp nhận TEACHER hoặc STUDENT.'
  }),
  dateOfBirth: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email này đã được sử dụng. Vui lòng chọn một email khác.',
        }
      }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role as UserRole,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        orgId: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      data: {
        user,
        message: 'Đăng ký tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.'
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu đầu vào không hợp lệ. Vui lòng kiểm tra lại.',
          details: error.issues
        }
      }, { status: 400 });
    }

    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.'
      }
    }, { status: 500 });
  }
}
