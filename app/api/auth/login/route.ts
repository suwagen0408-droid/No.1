import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: {
        manufacturer: true,
        facility: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'アカウントがロックされています。しばらく待ってから再度お試しください。' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(
      validatedData.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= 5;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
            : null,
        },
      });

      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === 'pending') {
      return NextResponse.json(
        { error: 'アカウントは審査中です。承認をお待ちください。' },
        { status: 403 }
      );
    }

    if (user.status === 'suspended') {
      return NextResponse.json(
        { error: 'アカウントが停止されています。サポートにお問い合わせください。' },
        { status: 403 }
      );
    }

    if (user.status === 'rejected') {
      return NextResponse.json(
        { error: 'アカウント申請が却下されました。' },
        { status: 403 }
      );
    }

    // Reset failed login attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Return user info (in production, create JWT token here)
    return NextResponse.json({
      message: 'ログインに成功しました',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: user.manufacturer || user.facility,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力データが正しくありません', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'ログイン中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
