import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/manufacturer/feedback - Get feedback for manufacturer's products
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

    // Get feedback for manufacturer's products
    const feedback = await prisma.productFeedback.findMany({
      where: {
        product: {
          manufacturerId: manufacturer.id,
          deletedAt: null,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            mainImageUrl: true,
          },
        },
        facility: {
          select: {
            facilityName: true,
            facilityType: true,
          },
        },
        qrScanEvent: {
          select: {
            scannedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to recent 100 feedback items
    });

    // Aggregate feedback statistics by product
    const productStats = await prisma.productFeedback.groupBy({
      by: ['productId', 'feedbackType'],
      where: {
        product: {
          manufacturerId: manufacturer.id,
          deletedAt: null,
        },
      },
      _count: {
        id: true,
      },
    });

    // Transform stats into easier-to-use format
    const statsByProduct: { [key: string]: { [key: string]: number } } = {};
    productStats.forEach(stat => {
      if (!statsByProduct[stat.productId]) {
        statsByProduct[stat.productId] = {};
      }
      statsByProduct[stat.productId][stat.feedbackType] = stat._count.id;
    });

    return NextResponse.json(
      {
        feedback,
        statistics: statsByProduct,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('フィードバック取得エラー:', error);
    return NextResponse.json(
      { error: 'フィードバックの取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
