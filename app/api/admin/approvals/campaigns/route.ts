import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CampaignStatus } from '@prisma/client';
import { notifyCampaignApproved, notifyCampaignRejected } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    // Get pending campaigns
    const pendingCampaigns = await prisma.campaign.findMany({
      where: {
        status: CampaignStatus.pending,
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
        OR: [
          { status: CampaignStatus.approved },
          { status: CampaignStatus.active },
          { status: CampaignStatus.completed },
        ],
        deletedAt: null,
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

    if (campaign.status !== CampaignStatus.pending) {
      return NextResponse.json(
        { error: 'Campaign is not pending approval' },
        { status: 400 }
      );
    }

    const now = new Date();
    
    // Determine new status - if campaign is starting now or already started, set to active
    let newStatus: CampaignStatus;
    if (action === 'approve') {
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);
      
      if (now >= startDate && now <= endDate) {
        newStatus = CampaignStatus.active;
      } else if (now > endDate) {
        newStatus = CampaignStatus.completed;
      } else {
        newStatus = CampaignStatus.approved;
      }
    } else {
      // When rejecting, set back to draft so it can be resubmitted
      newStatus = CampaignStatus.draft;
    }

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
    if (action === 'approve') {
      await notifyCampaignApproved(campaign.manufacturer.userId, campaignId, campaign.name);
    } else {
      await notifyCampaignRejected(campaign.manufacturer.userId, campaignId, campaign.name, rejectionReason);
    }

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
  } catch (error: any) {
    console.error('Error processing campaign approval:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process campaign approval',
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}
