import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DEBUG API - データベースの全キャンペーンを確認
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    // 全キャンペーンを取得（削除済みも含む）
    const allCampaigns = await prisma.campaign.findMany({
      where: {
        manufacturerId: manufacturer.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        deletedAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 削除済みでないキャンペーン
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        deletedAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      total: allCampaigns.length,
      active: activeCampaigns.length,
      deleted: allCampaigns.length - activeCampaigns.length,
      allCampaigns,
      activeCampaigns,
    });
  } catch (error) {
    console.error('Error fetching debug campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
