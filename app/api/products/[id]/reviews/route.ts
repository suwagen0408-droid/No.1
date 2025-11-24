import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(1000).optional(),
  nickname: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
});

// GET /api/products/[id]/reviews - Get approved reviews for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reviews = await prisma.productReview.findMany({
      where: {
        productId: id,
        status: 'approved',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        nickname: true,
        createdAt: true,
        facility: {
          select: {
            facilityName: true,
          },
        },
      },
    });

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return NextResponse.json(
      {
        reviews,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
      },
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

// POST /api/products/[id]/reviews - Submit a new review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await request.json();

    // Validate input
    const validation = createReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { rating, comment, nickname, email } = validation.data;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.deletedAt) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Create review (pending approval)
    const review = await prisma.productReview.create({
      data: {
        productId,
        rating,
        comment,
        nickname,
        email,
        status: 'pending',
      },
    });

    return NextResponse.json(
      {
        message: 'レビューを投稿しました。承認後に公開されます。',
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
        },
      },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('レビュー投稿エラー:', error);
    return NextResponse.json(
      { error: 'レビューの投稿に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
