import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: z.string().min(6, '新しいパスワードは6文字以上にしてください'),
});

// POST /api/auth/change-password - Change user password
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: '新しいパスワードは現在のパスワードと異なるものを設定してください' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: user.email,
        userRole: user.role,
        action: 'password_changed',
        resourceType: 'User',
        resourceId: userId,
        newValues: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Send notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'password_changed',
        title: 'パスワードが変更されました',
        message: 'パスワードが正常に変更されました。',
      },
    });

    // Send email notification (async, don't wait)
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: 'password_changed',
        subject: 'パスワード変更完了のお知らせ',
        templateData: {},
      }),
    }).catch((error) => {
      console.error('Failed to send password change email:', error);
    });

    console.log(`🔐 Password changed for user: ${user.email}`);

    return NextResponse.json(
      { message: 'パスワードを変更しました' },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'パスワードの変更に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
