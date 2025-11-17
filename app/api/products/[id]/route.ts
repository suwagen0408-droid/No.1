import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/products/[id] - Get public product details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: {
        id,
        deletedAt: null,
        status: 'approved', // Only show approved products
      },
      include: {
        manufacturer: {
          select: {
            companyName: true,
            websiteUrl: true,
            logoUrl: true,
          },
        },
        productImages: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get review statistics
    const reviewStats = await prisma.productReview.aggregate({
      where: {
        productId: id,
        status: 'approved',
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    return NextResponse.json(
      {
        product,
        reviewStats: {
          averageRating: reviewStats._avg.rating ? Math.round(reviewStats._avg.rating * 10) / 10 : 0,
          totalReviews: reviewStats._count.id,
        },
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('商品取得エラー:', error);
    return NextResponse.json(
      { error: '商品情報の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
