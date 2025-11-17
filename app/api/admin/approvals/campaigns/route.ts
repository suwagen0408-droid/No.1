import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get pending campaigns
    const pendingCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'pending',
      },
      include: {
        manufacturer: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        campaignProducts: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get recently processed campaigns (last 20)
    const processedCampaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['approved', 'active', 'rejected', 'completed'] },
      },
      include: {
        manufacturer: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        approver: {
          select: {
            email: true,
          },
        },
        campaignProducts: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({
      pending: pendingCampaigns,
      processed: processedCampaigns,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, action, rejectionReason, adminId } = body;

    if (!campaignId || !action || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        manufacturer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'pending') {
      return NextResponse.json(
        { error: 'Campaign is not pending approval' },
        { status: 400 }
      );
    }

    const now = new Date();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update campaign
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: newStatus,
        approvedAt: action === 'approve' ? now : null,
        approvedBy: adminId,
        rejectionReason: action === 'reject' ? rejectionReason : null,
        updatedAt: now,
      },
    });

    // Create notification for manufacturer
    await prisma.notification.create({
      data: {
        userId: campaign.manufacturer.userId,
        type: action === 'approve' ? 'campaign_approved' : 'campaign_rejected',
        title: action === 'approve' ? 'キャンペーン承認' : 'キャンペーン却下',
        message:
          action === 'approve'
            ? `キャンペーン「${campaign.name}」が承認されました。`
            : `キャンペーン「${campaign.name}」が却下されました。理由: ${rejectionReason || '未指定'}`,
        relatedResourceType: 'campaign',
        relatedResourceId: campaignId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: action === 'approve' ? 'APPROVE_CAMPAIGN' : 'REJECT_CAMPAIGN',
        resourceType: 'campaign',
        resourceId: campaignId,
        newValues: JSON.stringify({
          status: newStatus,
          rejectionReason: rejectionReason,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Campaign ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error('Error processing campaign approval:', error);
    return NextResponse.json(
      { error: 'Failed to process campaign approval' },
      { status: 500 }
    );
  }
}
