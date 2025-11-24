import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createReviewSchema = z.object({
  manufacturerId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  campaignId: z.string().optional(),
});

// GET /api/facility/manufacturer-reviews - Get facility's reviews of manufacturers
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get facility
    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json(
        { error: '施設情報が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get reviews - stored in audit logs with special action
    const reviews = await prisma.auditLog.findMany({
      where: {
        userId,
        action: 'manufacturer_review',
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

// POST /api/facility/manufacturer-reviews - Create manufacturer review
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

    const { manufacturerId, rating, comment, campaignId } = validation.data;

    // Get facility
    const facility = await prisma.facility.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!facility) {
      return NextResponse.json(
        { error: '施設情報が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get manufacturer
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id: manufacturerId },
      include: { user: true },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'メーカーが見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Check if facility has worked with this manufacturer
    const collaboration = await prisma.facilityCampaign.findFirst({
      where: {
        facilityId: facility.id,
        campaign: {
          manufacturerId,
        },
        status: {
          in: ['approved', 'active', 'completed'],
        },
      },
    });

    if (!collaboration) {
      return NextResponse.json(
        { error: 'このメーカーと取引がないためレビューできません' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Create review as audit log
    const review = await prisma.auditLog.create({
      data: {
        userId,
        userEmail: facility.user.email,
        userRole: 'facility',
        action: 'manufacturer_review',
        resourceType: 'Manufacturer',
        resourceId: manufacturerId,
        newValues: JSON.stringify({
          rating,
          comment: comment || null,
          campaignId: campaignId || null,
          manufacturerName: manufacturer.companyName,
          facilityName: facility.facilityName,
        }),
      },
    });

    // Notify manufacturer
    await prisma.notification.create({
      data: {
        userId: manufacturer.userId,
        type: 'manufacturer_review_received',
        title: 'レビューを受け取りました',
        message: `${facility.facilityName} からレビューを受け取りました。評価: ${'⭐'.repeat(rating)}`,
        relatedResourceType: 'AuditLog',
        relatedResourceId: review.id,
      },
    });

    console.log(`⭐ Manufacturer review created: ${facility.facilityName} → ${manufacturer.companyName} (${rating}/5)`);

    return NextResponse.json(
      {
        message: 'レビューを投稿しました',
        review: {
          id: review.id,
          rating,
          comment,
          manufacturerName: manufacturer.companyName,
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
