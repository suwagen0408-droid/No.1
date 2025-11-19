import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, forbiddenResponse, serverErrorResponse, successResponse } from '@/lib/api-helpers';

/**
 * GET /api/manufacturer/reorder
 * Get manufacturer's reorder requests
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user || user.role !== 'manufacturer' || !user.manufacturer) {
      return forbiddenResponse('メーカーアカウントでのアクセスが必要です');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const reorderRequests = await prisma.reorderRequest.findMany({
      where: {
        manufacturerId: user.manufacturer.id,
        ...(status && { status: status as any }),
      },
      include: {
        facility: {
          select: {
            id: true,
            facilityName: true,
            facilityType: true,
            phone: true,
            address: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            mainImageUrl: true,
            category: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        facilityProductPlacement: {
          select: {
            id: true,
            locationLabel: true,
            currentUnits: true,
            reorderThreshold: true,
          },
        },
      },
      orderBy: [
        { urgency: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Group by status for dashboard
    const stats = {
      pending: reorderRequests.filter(r => r.status === 'pending').length,
      approved: reorderRequests.filter(r => r.status === 'approved').length,
      shipped: reorderRequests.filter(r => r.status === 'shipped').length,
      total: reorderRequests.length,
    };

    return successResponse({ reorderRequests, stats });
  } catch (error) {
    console.error('Error fetching reorder requests:', error);
    return serverErrorResponse('追加発注リストの取得に失敗しました');
  }
}
