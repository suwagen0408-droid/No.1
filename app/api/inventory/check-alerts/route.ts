import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/inventory/check-alerts - Check for low stock and send alerts
// This should be called by a cron job or scheduled task
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication for cron job
    const cronSecret = request.headers.get('x-cron-secret');
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Find all placements with low stock (current <= threshold)
    const lowStockPlacements = await prisma.facilityProductPlacement.findMany({
      where: {
        currentUnits: {
          lte: prisma.raw('reorder_threshold')
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            manufacturerId: true,
          }
        },
        facilityCampaign: {
          include: {
            facility: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                  }
                }
              }
            },
            campaign: {
              select: {
                name: true,
                manufacturerId: true,
              },
              include: {
                manufacturer: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const alertsSent = {
      facilities: 0,
      manufacturers: 0,
    };

    // Send alerts to facilities and manufacturers
    for (const placement of lowStockPlacements) {
      const facility = placement.facilityCampaign.facility;
      const manufacturer = placement.facilityCampaign.campaign.manufacturer;
      const product = placement.product;
      const campaign = placement.facilityCampaign.campaign;

      // Check if we already sent an alert in the last 24 hours
      const recentAlert = await prisma.notification.findFirst({
        where: {
          userId: facility.user.id,
          type: 'low_stock_alert',
          relatedResourceType: 'FacilityProductPlacement',
          relatedResourceId: placement.id,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          }
        }
      });

      if (!recentAlert) {
        // Notify facility
        await prisma.notification.create({
          data: {
            userId: facility.user.id,
            type: 'low_stock_alert',
            title: '在庫が少なくなっています',
            message: `「${product.name}」（${placement.locationLabel}）の在庫が ${placement.currentUnits}個 になりました。補充が必要です。`,
            relatedResourceType: 'FacilityProductPlacement',
            relatedResourceId: placement.id,
          }
        });
        alertsSent.facilities++;

        // Notify manufacturer
        await prisma.notification.create({
          data: {
            userId: manufacturer.user.id,
            type: 'facility_low_stock',
            title: '施設の在庫が少なくなっています',
            message: `${facility.facilityName} の「${product.name}」（キャンペーン: ${campaign.name}）の在庫が ${placement.currentUnits}個 になりました。`,
            relatedResourceType: 'FacilityProductPlacement',
            relatedResourceId: placement.id,
          }
        });
        alertsSent.manufacturers++;
      }
    }

    console.log(`✅ Inventory alerts check completed: ${lowStockPlacements.length} low stock items found, ${alertsSent.facilities} facilities notified, ${alertsSent.manufacturers} manufacturers notified`);

    return NextResponse.json(
      {
        message: '在庫アラートチェック完了',
        lowStockCount: lowStockPlacements.length,
        alertsSent,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error) {
    console.error('Inventory alert check error:', error);
    return NextResponse.json(
      { error: '在庫アラートチェックに失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

// POST /api/inventory/check-alerts - Manually trigger alert check (for admin)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Call the GET handler logic
    const result = await GET(request);
    return result;

  } catch (error) {
    console.error('Manual alert trigger error:', error);
    return NextResponse.json(
      { error: 'アラートトリガーに失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
