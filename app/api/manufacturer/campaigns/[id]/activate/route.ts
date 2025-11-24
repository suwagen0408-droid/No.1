import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CampaignStatus } from '@prisma/client';

// POST /api/manufacturer/campaigns/[id]/activate - Start campaign manually
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    // Get request body for reason
    const body = await request.json().catch(() => ({}));
    const { reason } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    // Verify user is manufacturer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        manufacturer: true,
      },
    });

    if (!user || user.role !== 'manufacturer' || !user.manufacturer) {
      return NextResponse.json(
        { error: 'メーカーアカウントが必要です' },
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'キャンペーンが見つかりません' },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    // Verify campaign belongs to this manufacturer
    if (campaign.manufacturerId !== user.manufacturer.id) {
      return NextResponse.json(
        { error: 'このキャンペーンを操作する権限がありません' },
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    // Check if campaign is in approved status
    if (campaign.status !== CampaignStatus.approved) {
      return NextResponse.json(
        { error: `キャンペーンを開始できません。現在のステータス: ${campaign.status}` },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    // Check if this is early start
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const isEarlyStart = now < startDate;
    const daysEarly = isEarlyStart ? Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Activate campaign
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.active,
      },
    });

    // Get participating facilities for notifications
    const facilityCampaigns = await prisma.facilityCampaign.findMany({
      where: { 
        campaignId: id,
        status: { in: ['approved', 'active'] }
      },
      include: { 
        facility: { 
          include: { user: true } 
        } 
      }
    });

    // Notify all participating facilities
    const notificationPromises = facilityCampaigns.map(async (fc) => {
      const notificationMessage = isEarlyStart
        ? `「${campaign.name}」が予定より${daysEarly}日早く開始されました。商品の配置準備をお願いします。`
        : `「${campaign.name}」が開始されました。商品の配置準備をお願いします。`;

      return prisma.notification.create({
        data: {
          userId: fc.facility.userId,
          type: 'campaign_started',
          title: isEarlyStart ? 'キャンペーンが早期開始されました' : 'キャンペーンが開始されました',
          message: notificationMessage,
          relatedResourceType: 'Campaign',
          relatedResourceId: id,
        }
      });
    });

    await Promise.all(notificationPromises);

    // Create audit log with detailed information
    await prisma.auditLog.create({
      data: {
        loggerId: userId,
        action: isEarlyStart ? 'campaign_early_started' : 'campaign_activated',
        entityType: 'Campaign',
        entityId: id,
        changes: JSON.stringify({
          from: { status: campaign.status },
          to: { status: CampaignStatus.active },
          isEarlyStart,
          daysEarly: isEarlyStart ? daysEarly : 0,
          scheduledStartDate: campaign.startDate,
          actualStartDate: now,
          reason: reason || '理由未記入',
          facilitiesNotified: facilityCampaigns.length,
        }),
      },
    });

    console.log(`✅ Campaign ${campaign.name} activated${isEarlyStart ? ' (Early Start)' : ''}`);
    console.log(`📢 Notified ${facilityCampaigns.length} facilities`);

    return NextResponse.json(
      { 
        message: isEarlyStart 
          ? `キャンペーンを${daysEarly}日早く開始しました。${facilityCampaigns.length}施設に通知を送信しました。`
          : `キャンペーンを開始しました。${facilityCampaigns.length}施設に通知を送信しました。`,
        campaign: updatedCampaign,
        facilitiesNotified: facilityCampaigns.length,
        isEarlyStart,
        daysEarly,
      },
      {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );

  } catch (error) {
    console.error('キャンペーン開始エラー:', error);
    return NextResponse.json(
      { error: 'キャンペーンの開始に失敗しました' },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}
