import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/manufacturer/facility-collaborations - Get facilities manufacturer has worked with
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

    // Get all facilities that have collaborated with this manufacturer
    const collaborations = await prisma.facilityCampaign.findMany({
      where: {
        campaign: {
          manufacturerId: manufacturer.id,
        },
        status: {
          in: ['approved', 'active', 'completed'],
        },
      },
      select: {
        facilityId: true,
        facility: {
          select: {
            id: true,
            facilityName: true,
            facilityType: true,
          },
        },
      },
      distinct: ['facilityId'],
    });

    // Group by facility and count campaigns
    const facilitiesMap = new Map();
    
    for (const collab of collaborations) {
      const facilityId = collab.facilityId;
      if (!facilitiesMap.has(facilityId)) {
        facilitiesMap.set(facilityId, {
          ...collab.facility,
          campaigns: 1,
        });
      } else {
        const existing = facilitiesMap.get(facilityId);
        existing.campaigns += 1;
      }
    }

    const facilities = Array.from(facilitiesMap.values());

    return NextResponse.json(
      { facilities },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Facility collaborations retrieval error:', error);
    return NextResponse.json(
      { error: '施設情報の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
