import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createReviewSchema = z.object({
  facilityId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  campaignId: z.string().optional(),
});

// GET /api/manufacturer/facility-reviews - Get manufacturer's reviews
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get manufacturer
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'メーカー情報が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get reviews - stored in audit logs with special action
    const reviews = await prisma.auditLog.findMany({
      where: {
        userId,
        action: 'facility_review',
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
    console.error('Review retrieval error:', error);
    return NextResponse.json(
      { error: 'レビューの取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

// POST /api/manufacturer/facility-reviews - Create facility review
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
    const validation = createReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { facilityId, rating, comment, campaignId } = validation.data;

    // Get manufacturer
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'メーカー情報が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get facility
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: { user: true },
    });

    if (!facility) {
      return NextResponse.json(
        { error: '施設が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Check if manufacturer has worked with this facility
    const collaboration = await prisma.facilityCampaign.findFirst({
      where: {
        facilityId,
        campaign: {
          manufacturerId: manufacturer.id,
        },
        status: {
          in: ['approved', 'active', 'completed'],
        },
      },
    });

    if (!collaboration) {
      return NextResponse.json(
        { error: 'この施設と取引がないためレビューできません' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Create review as audit log
    const review = await prisma.auditLog.create({
      data: {
        userId,
        userEmail: manufacturer.user.email,
        userRole: 'manufacturer',
        action: 'facility_review',
        resourceType: 'Facility',
        resourceId: facilityId,
        newValues: JSON.stringify({
          rating,
          comment: comment || null,
          campaignId: campaignId || null,
          facilityName: facility.facilityName,
          manufacturerName: manufacturer.companyName,
        }),
      },
    });

    // Notify facility
    await prisma.notification.create({
      data: {
        userId: facility.userId,
        type: 'facility_review_received',
        title: 'レビューを受け取りました',
        message: `${manufacturer.companyName} からレビューを受け取りました。評価: ${'⭐'.repeat(rating)}`,
        relatedResourceType: 'AuditLog',
        relatedResourceId: review.id,
      },
    });

    console.log(`⭐ Facility review created: ${manufacturer.companyName} → ${facility.facilityName} (${rating}/5)`);

    return NextResponse.json(
      {
        message: 'レビューを投稿しました',
        review: {
          id: review.id,
          rating,
          comment,
          facilityName: facility.facilityName,
        },
      },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Review creation error:', error);
    return NextResponse.json(
      { error: 'レビューの投稿に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
