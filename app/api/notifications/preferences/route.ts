import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const preferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailOnCampaignApproval: z.boolean().optional(),
  emailOnApplicationStatus: z.boolean().optional(),
  emailOnMessage: z.boolean().optional(),
  emailOnReview: z.boolean().optional(),
  emailOnPayment: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  pushOnCampaignApproval: z.boolean().optional(),
  pushOnApplicationStatus: z.boolean().optional(),
  pushOnMessage: z.boolean().optional(),
  pushOnReview: z.boolean().optional(),
  pushOnPayment: z.boolean().optional(),
  dailyDigestEnabled: z.boolean().optional(),
  dailyDigestTime: z.string().optional(),
  weeklyDigestEnabled: z.boolean().optional(),
  weeklyDigestDay: z.number().min(0).max(6).optional(),
});

// GET /api/notifications/preferences - Get user's notification preferences
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get or create preferences
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return NextResponse.json(
      { preferences },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

// PUT /api/notifications/preferences - Update notification preferences
export async function PUT(request: NextRequest) {
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
    const validation = preferencesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Upsert preferences
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: validation.data,
      create: {
        userId,
        ...validation.data,
      },
    });

    console.log(`✅ Notification preferences updated for user ${userId}`);

    return NextResponse.json(
      {
        message: '設定を更新しました',
        preferences,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: '設定の更新に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
