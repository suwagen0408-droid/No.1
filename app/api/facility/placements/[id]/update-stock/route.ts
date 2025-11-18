import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateStockSchema = z.object({
  changeType: z.enum(['usage', 'restock', 'adjustment', 'damage']),
  quantity: z.number().int(),
  note: z.string().optional(),
});

// POST /api/facility/placements/[id]/update-stock - Update product stock
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validation = updateStockSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { changeType, quantity, note } = validation.data;

    // Get placement
    const placement = await prisma.facilityProductPlacement.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          }
        },
        facilityCampaign: {
          include: {
            facility: {
              include: {
                user: true
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
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!placement) {
      return NextResponse.json(
        { error: '商品配置が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify user is from this facility
    if (placement.facilityCampaign.facility.userId !== userId) {
      return NextResponse.json(
        { error: 'この商品配置にアクセスする権限がありません' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const beforeUnits = placement.currentUnits;
    let afterUnits: number;

    // Calculate new stock level
    switch (changeType) {
      case 'usage':
        // Decrease stock (negative quantity)
        afterUnits = Math.max(0, beforeUnits - Math.abs(quantity));
        break;
      case 'restock':
        // Increase stock (positive quantity)
        afterUnits = beforeUnits + Math.abs(quantity);
        break;
      case 'adjustment':
        // Direct adjustment (can be positive or negative)
        afterUnits = Math.max(0, beforeUnits + quantity);
        break;
      case 'damage':
        // Decrease stock due to damage (negative quantity)
        afterUnits = Math.max(0, beforeUnits - Math.abs(quantity));
        break;
      default:
        afterUnits = beforeUnits;
    }

    // Update placement
    const updatedPlacement = await prisma.facilityProductPlacement.update({
      where: { id },
      data: {
        currentUnits: afterUnits,
      }
    });

    // Create stock log
    const stockLog = await prisma.stockLog.create({
      data: {
        facilityProductPlacementId: placement.id,
        changeType,
        quantity: changeType === 'usage' || changeType === 'damage' ? -Math.abs(quantity) : Math.abs(quantity),
        beforeUnits,
        afterUnits,
        note: note || null,
        loggedBy: userId,
      }
    });

    // Check if stock is low and send alert
    if (afterUnits <= placement.reorderThreshold && afterUnits < beforeUnits) {
      // Notify facility user
      await prisma.notification.create({
        data: {
          userId: placement.facilityCampaign.facility.userId,
          type: 'low_stock_alert',
          title: '在庫が少なくなっています',
          message: `「${placement.product.name}」（${placement.locationLabel}）の在庫が ${afterUnits}個 になりました。補充が必要です。`,
          relatedResourceType: 'FacilityProductPlacement',
          relatedResourceId: placement.id,
        }
      });

      // Notify manufacturer
      await prisma.notification.create({
        data: {
          userId: placement.facilityCampaign.campaign.manufacturer.user.id,
          type: 'facility_low_stock',
          title: '施設の在庫が少なくなっています',
          message: `${placement.facilityCampaign.facility.facilityName} の「${placement.product.name}」（キャンペーン: ${placement.facilityCampaign.campaign.name}）の在庫が ${afterUnits}個 になりました。`,
          relatedResourceType: 'FacilityProductPlacement',
          relatedResourceId: placement.id,
        }
      });
    }

    // If stock is at zero, notify urgently
    if (afterUnits === 0 && beforeUnits > 0) {
      await prisma.notification.create({
        data: {
          userId: placement.facilityCampaign.facility.userId,
          type: 'stock_empty',
          title: '在庫が切れました',
          message: `「${placement.product.name}」（${placement.locationLabel}）の在庫が切れました。早急な補充が必要です。`,
          relatedResourceType: 'FacilityProductPlacement',
          relatedResourceId: placement.id,
        }
      });

      await prisma.notification.create({
        data: {
          userId: placement.facilityCampaign.campaign.manufacturer.user.id,
          type: 'facility_stock_empty',
          title: '施設の在庫が切れました',
          message: `${placement.facilityCampaign.facility.facilityName} の「${placement.product.name}」の在庫が切れました。`,
          relatedResourceType: 'FacilityProductPlacement',
          relatedResourceId: placement.id,
        }
      });
    }

    console.log(`📦 Stock updated for placement ${id}: ${beforeUnits} → ${afterUnits} (${changeType})`);

    return NextResponse.json(
      {
        message: '在庫を更新しました',
        placement: {
          id: updatedPlacement.id,
          currentUnits: updatedPlacement.currentUnits,
          reorderThreshold: updatedPlacement.reorderThreshold,
        },
        stockLog: {
          id: stockLog.id,
          changeType: stockLog.changeType,
          quantity: stockLog.quantity,
          beforeUnits: stockLog.beforeUnits,
          afterUnits: stockLog.afterUnits,
        }
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error) {
    console.error('Stock update error:', error);
    return NextResponse.json(
      { error: '在庫の更新に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
