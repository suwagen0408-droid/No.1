import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const applicationSchema = z.object({
  campaignId: z.string().uuid(),
  requestedUnits: z.number().int().min(1),
  requestedMessage: z.string().optional(),
  plannedPlacementLocations: z.string().optional(),
  estimatedMonthlyUsage: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = applicationSchema.parse(body);

    // Check if campaign exists and is active
    const campaign = await prisma.campaign.findUnique({
      where: { id: validatedData.campaignId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!['approved', 'active'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      );
    }

    // Check if already applied
    const existingApplication = await prisma.facilityCampaign.findUnique({
      where: {
        facilityId_campaignId: {
          facilityId: facility.id,
          campaignId: validatedData.campaignId,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'Already applied to this campaign' },
        { status: 400 }
      );
    }

    // Check max units per facility
    if (
      campaign.maxUnitsPerFacility &&
      validatedData.requestedUnits > campaign.maxUnitsPerFacility
    ) {
      return NextResponse.json(
        {
          error: `Requested units exceed maximum allowed (${campaign.maxUnitsPerFacility})`,
        },
        { status: 400 }
      );
    }

    // Create application
    const application = await prisma.facilityCampaign.create({
      data: {
        facilityId: facility.id,
        campaignId: validatedData.campaignId,
        requestedUnits: validatedData.requestedUnits,
        requestedMessage: validatedData.requestedMessage,
        plannedPlacementLocations: validatedData.plannedPlacementLocations,
        estimatedMonthlyUsage: validatedData.estimatedMonthlyUsage,
        status: 'pending', // Needs manufacturer approval
      },
      include: {
        campaign: {
          include: {
            manufacturer: {
              select: {
                userId: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    // Create notification for manufacturer
    await prisma.notification.create({
      data: {
        userId: application.campaign.manufacturer.userId,
        type: 'campaign_application',
        title: 'キャンペーン応募',
        message: `${facility.facilityName}が「${application.campaign.name}」キャンペーンに応募しました。`,
        relatedResourceType: 'facility_campaign',
        relatedResourceId: application.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'APPLY_CAMPAIGN',
        resourceType: 'facility_campaign',
        resourceId: application.id,
        newValues: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json(
      {
        application: {
          id: application.id,
          status: application.status,
          requestedUnits: application.requestedUnits,
        },
        message: 'Application submitted successfully. Waiting for manufacturer approval.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error applying to campaign:', error);
    return NextResponse.json(
      { error: 'Failed to apply to campaign' },
      { status: 500 }
    );
  }
}
