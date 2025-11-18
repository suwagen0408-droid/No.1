import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';

const forgotPasswordSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { email } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json(
        { message: 'パスワードリセットメールを送信しました。メールをご確認ください。' },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return NextResponse.json(
        { message: 'パスワードリセットメールを送信しました。メールをご確認ください。' },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any existing unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // Create new password reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Generate reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== PASSWORD RESET LINK (DEV MODE) ===');
      console.log(`Email: ${email}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log(`Token expires at: ${expiresAt.toISOString()}`);
      console.log('======================================\n');
    }

    // Send password reset email (async, don't wait)
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        type: 'password_reset',
        subject: 'パスワードリセットのご依頼',
        templateData: {
          resetLink: resetUrl,
        },
      }),
    }).catch((error) => {
      console.error('Failed to send password reset email:', error);
    });

    return NextResponse.json(
      { 
        message: 'パスワードリセットメールを送信しました。メールをご確認ください。',
        // In development, include the reset URL for testing
        ...(process.env.NODE_ENV === 'development' && { resetUrl }),
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('パスワードリセット要求エラー:', error);
    return NextResponse.json(
      { error: 'パスワードリセット要求の処理に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
