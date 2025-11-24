import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createFeedbackSchema = z.object({
  productId: z.string(),
  feedbackType: z.enum(['like', 'dislike', 'question', 'suggestion']),
  sessionId: z.string().optional(),
});

// POST /api/facility/feedback - Submit facility feedback
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    
    // Validate input
    const validation = createFeedbackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { productId, feedbackType, sessionId } = validation.data;

    // If userId provided, get facility
    let facilityId = null;
    if (userId) {
      const facility = await prisma.facility.findUnique({
        where: { userId },
      });
      facilityId = facility?.id || null;
    }

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

    // Create feedback
    const feedback = await prisma.productFeedback.create({
      data: {
        productId,
        facilityId,
        feedbackType,
        sessionId,
      },
    });

    return NextResponse.json(
      {
        message: 'フィードバックを送信しました',
        feedback: {
          id: feedback.id,
          feedbackType: feedback.feedbackType,
        },
      },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('フィードバック送信エラー:', error);
    return NextResponse.json(
      { error: 'フィードバックの送信に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
