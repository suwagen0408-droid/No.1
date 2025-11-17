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

    // Activate campaign
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.active,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        loggerId: userId,
        action: 'campaign_activated',
        entityType: 'Campaign',
        entityId: id,
        changes: JSON.stringify({
          from: { status: campaign.status },
          to: { status: CampaignStatus.active },
        }),
      },
    });

    return NextResponse.json(
      { 
        message: 'キャンペーンを開始しました',
        campaign: updatedCampaign,
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
