import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const sendMessageSchema = z.object({
  recipientId: z.string(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1),
  relatedResourceType: z.string().optional(),
  relatedResourceId: z.string().optional(),
});

// GET /api/messages - Get user's messages
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'received'; // 'sent' or 'received'

    // Messages are stored as audit logs with action 'message'
    const where: any = {
      action: 'message',
    };

    if (type === 'sent') {
      where.userId = userId;
    } else {
      where.resourceId = userId;
      where.resourceType = 'User';
    }

    const messages = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return NextResponse.json(
      { messages },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Message retrieval error:', error);
    return NextResponse.json(
      { error: 'メッセージの取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

// POST /api/messages - Send message
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
    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { recipientId, subject, message, relatedResourceType, relatedResourceId } = validation.data;

    // Get sender
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        manufacturer: {
          select: { companyName: true },
        },
        facility: {
          select: { facilityName: true },
        },
      },
    });

    if (!sender) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get recipient
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: '宛先ユーザーが見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const senderName = sender.manufacturer?.companyName || sender.facility?.facilityName || sender.email;

    // Create message as audit log
    const messageLog = await prisma.auditLog.create({
      data: {
        userId,
        userEmail: sender.email,
        userRole: sender.role,
        action: 'message',
        resourceType: 'User',
        resourceId: recipientId,
        newValues: JSON.stringify({
          subject,
          message,
          senderName,
          relatedResourceType,
          relatedResourceId,
        }),
      },
    });

    // Create notification for recipient
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'message_received',
        title: `メッセージ: ${subject}`,
        message: `${senderName} からメッセージが届きました。`,
        relatedResourceType: 'AuditLog',
        relatedResourceId: messageLog.id,
      },
    });

    console.log(`📧 Message sent: ${senderName} → ${recipient.email}`);

    return NextResponse.json(
      {
        message: 'メッセージを送信しました',
        messageId: messageLog.id,
      },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Message send error:', error);
    return NextResponse.json(
      { error: 'メッセージの送信に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
