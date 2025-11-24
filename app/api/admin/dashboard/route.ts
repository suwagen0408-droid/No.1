import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CampaignStatus } from '@prisma/client';

// GET /api/admin/dashboard - Get admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get statistics
    const [
      totalManufacturers,
      totalFacilities,
      activeCampaigns,
      pendingApprovals,
      totalProducts,
      totalScans,
    ] = await Promise.all([
      // Total manufacturers (not deleted)
      prisma.manufacturer.count({
        where: { deletedAt: null },
      }),
      
      // Total facilities (not deleted)
      prisma.facility.count({
        where: { deletedAt: null },
      }),
      
      // Active campaigns
      prisma.campaign.count({
        where: {
          status: CampaignStatus.active,
          deletedAt: null,
        },
      }),
      
      // Pending approvals (users, products, campaigns)
      Promise.all([
        prisma.user.count({
          where: { status: 'pending' },
        }),
        prisma.product.count({
          where: { 
            status: 'pending',
            deletedAt: null,
          },
        }),
        prisma.campaign.count({
          where: { 
            status: CampaignStatus.pending,
            deletedAt: null,
          },
        }),
      ]).then(([users, products, campaigns]) => users + products + campaigns),
      
      // Total products
      prisma.product.count({
        where: { deletedAt: null },
      }),
      
      // Total QR scans
      prisma.qrScanEvent.count(),
    ]);

    return NextResponse.json({
      stats: {
        totalManufacturers,
        totalFacilities,
        activeCampaigns,
        pendingApprovals,
        totalProducts,
        totalScans,
      },
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
