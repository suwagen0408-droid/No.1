import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/manufacturer/inventory - Get manufacturer's product inventory across all facilities
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

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');
    const stockLevel = searchParams.get('stockLevel'); // 'low', 'empty', 'all'

    // Build where clause
    const where: any = {
      facilityCampaign: {
        campaign: {
          manufacturerId: manufacturer.id
        },
        status: {
          in: ['approved', 'active']
        }
      }
    };

    // Filter by campaign if specified
    if (campaignId) {
      where.facilityCampaign.campaignId = campaignId;
    }

    // Filter by stock level
    if (stockLevel === 'low') {
      // This will require raw SQL or a workaround
      // For now, we'll fetch all and filter in memory
    } else if (stockLevel === 'empty') {
      where.currentUnits = 0;
    }

    // Get placements
    const placements = await prisma.facilityProductPlacement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            mainImageUrl: true,
            category: true,
          }
        },
        facilityCampaign: {
          include: {
            facility: {
              select: {
                id: true,
                facilityName: true,
                facilityType: true,
              }
            },
            campaign: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              }
            }
          }
        },
        stockLogs: {
          take: 3,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            changeType: true,
            quantity: true,
            beforeUnits: true,
            afterUnits: true,
            createdAt: true,
          }
        }
      },
      orderBy: [
        {
          currentUnits: 'asc' // Show low stock first
        },
        {
          updatedAt: 'desc'
        }
      ]
    });

    // Filter by stock level if 'low' (after fetching)
    let filteredPlacements = placements;
    if (stockLevel === 'low') {
      filteredPlacements = placements.filter(p => p.currentUnits <= p.reorderThreshold);
    }

    // Calculate statistics
    const stats = {
      totalPlacements: filteredPlacements.length,
      lowStock: filteredPlacements.filter(p => p.currentUnits <= p.reorderThreshold && p.currentUnits > 0).length,
      outOfStock: filteredPlacements.filter(p => p.currentUnits === 0).length,
      totalUnits: filteredPlacements.reduce((sum, p) => sum + p.currentUnits, 0),
      facilitiesCount: new Set(filteredPlacements.map(p => p.facilityCampaign.facilityId)).size,
    };

    // Group by campaign
    const byCampaign: Record<string, any> = {};
    filteredPlacements.forEach(placement => {
      const campaignId = placement.facilityCampaign.campaignId;
      if (!byCampaign[campaignId]) {
        byCampaign[campaignId] = {
          campaign: placement.facilityCampaign.campaign,
          placements: [],
          stats: {
            totalUnits: 0,
            lowStock: 0,
            outOfStock: 0,
          }
        };
      }
      byCampaign[campaignId].placements.push(placement);
      byCampaign[campaignId].stats.totalUnits += placement.currentUnits;
      if (placement.currentUnits <= placement.reorderThreshold && placement.currentUnits > 0) {
        byCampaign[campaignId].stats.lowStock++;
      }
      if (placement.currentUnits === 0) {
        byCampaign[campaignId].stats.outOfStock++;
      }
    });

    return NextResponse.json(
      {
        placements: filteredPlacements,
        stats,
        byCampaign: Object.values(byCampaign),
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Manufacturer inventory retrieval error:', error);
    return NextResponse.json(
      { error: '在庫情報の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
