import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/facility/inventory - Get facility's inventory/stock levels
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

    // Get all active placements with stock info
    const placements = await prisma.facilityProductPlacement.findMany({
      where: {
        facilityCampaign: {
          facilityId: facility.id,
          status: {
            in: ['approved', 'active']
          }
        }
      },
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
          select: {
            id: true,
            status: true,
            campaign: {
              select: {
                id: true,
                name: true,
                endDate: true,
                manufacturer: {
                  select: {
                    companyName: true,
                  }
                }
              }
            }
          }
        },
        stockLogs: {
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        currentUnits: 'asc' // Show low stock first
      }
    });

    // Calculate statistics
    const stats = {
      totalPlacements: placements.length,
      lowStock: placements.filter(p => p.currentUnits <= p.reorderThreshold).length,
      outOfStock: placements.filter(p => p.currentUnits === 0).length,
      totalUnits: placements.reduce((sum, p) => sum + p.currentUnits, 0),
    };

    return NextResponse.json(
      {
        placements,
        stats,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Inventory retrieval error:', error);
    return NextResponse.json(
      { error: '在庫情報の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
