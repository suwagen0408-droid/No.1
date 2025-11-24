import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/reviews - Get pending reviews for moderation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const reviews = await prisma.productReview.findMany({
      where: {
        status,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            manufacturer: {
              select: {
                companyName: true,
              },
            },
          },
        },
        facility: {
          select: {
            facilityName: true,
          },
        },
        approver: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      { reviews },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('レビュー取得エラー:', error);
    return NextResponse.json(
      { error: 'レビューの取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

// POST /api/admin/reviews - Approve or reject a review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewId, action, adminId } = body;

    if (!reviewId || !action || !adminId) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { error: 'レビューが見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (review.status !== 'pending') {
      return NextResponse.json(
        { error: 'このレビューは既に処理されています' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const now = new Date();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update review status
    await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        status: newStatus,
        approvedAt: action === 'approve' ? now : null,
        approvedBy: adminId,
        updatedAt: now,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: action === 'approve' ? 'APPROVE_REVIEW' : 'REJECT_REVIEW',
        resourceType: 'review',
        resourceId: reviewId,
        newValues: JSON.stringify({ status: newStatus }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `レビューを${action === 'approve' ? '承認' : '却下'}しました`,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('レビュー処理エラー:', error);
    return NextResponse.json(
      { error: 'レビューの処理に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
