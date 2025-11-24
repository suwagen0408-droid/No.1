import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/facilities/[id]/rating - Get facility rating and reviews
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get facility
    const facility = await prisma.facility.findUnique({
      where: { id },
      select: {
        id: true,
        facilityName: true,
        facilityType: true,
      },
    });

    if (!facility) {
      return NextResponse.json(
        { error: '施設が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get reviews from audit logs
    const reviews = await prisma.auditLog.findMany({
      where: {
        resourceType: 'Facility',
        resourceId: id,
        action: 'facility_review',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate average rating
    let totalRating = 0;
    let reviewCount = 0;
    const reviewDetails = [];

    for (const review of reviews) {
      try {
        const data = JSON.parse(review.newValues || '{}');
        if (data.rating) {
          totalRating += data.rating;
          reviewCount++;
          reviewDetails.push({
            id: review.id,
            rating: data.rating,
            comment: data.comment,
            manufacturerName: data.manufacturerName,
            createdAt: review.createdAt,
          });
        }
      } catch (e) {
        console.error('Failed to parse review data:', e);
      }
    }

    const averageRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : 0;

    // Get rating distribution
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    reviewDetails.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating as keyof typeof distribution]++;
      }
    });

    return NextResponse.json(
      {
        facility: {
          id: facility.id,
          name: facility.facilityName,
          type: facility.facilityType,
        },
        rating: {
          average: parseFloat(averageRating as string),
          count: reviewCount,
          distribution,
        },
        reviews: reviewDetails,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Rating retrieval error:', error);
    return NextResponse.json(
      { error: '評価の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
