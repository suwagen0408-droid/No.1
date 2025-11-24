import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/facility/manufacturer-collaborations - Get manufacturers facility has worked with
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

    // Get all manufacturers that have collaborated with this facility
    const collaborations = await prisma.facilityCampaign.findMany({
      where: {
        facilityId: facility.id,
        status: {
          in: ['approved', 'active', 'completed'],
        },
      },
      select: {
        campaign: {
          select: {
            manufacturerId: true,
            manufacturer: {
              select: {
                id: true,
                companyName: true,
                userId: true,
                logoUrl: true,
              },
            },
          },
        },
      },
      distinct: ['campaignId'],
    });

    // Group by manufacturer and count campaigns
    const manufacturersMap = new Map();
    
    for (const collab of collaborations) {
      const manufacturerId = collab.campaign.manufacturerId;
      if (!manufacturersMap.has(manufacturerId)) {
        manufacturersMap.set(manufacturerId, {
          ...collab.campaign.manufacturer,
          campaigns: 1,
        });
      } else {
        const existing = manufacturersMap.get(manufacturerId);
        existing.campaigns += 1;
      }
    }

    const manufacturers = Array.from(manufacturersMap.values());

    return NextResponse.json(
      { manufacturers },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Manufacturer collaborations retrieval error:', error);
    return NextResponse.json(
      { error: 'メーカー情報の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
