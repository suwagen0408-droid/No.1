import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/facility/campaigns - Browse available campaigns
export async function GET(request: NextRequest) {
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

    // Get all approved/active campaigns
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['approved', 'active'] },
        deletedAt: null,
        // Filter by date - only show current and future campaigns
        endDate: {
          gte: new Date(),
        },
      },
      include: {
        manufacturer: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
          },
        },
        campaignProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                mainImageUrl: true,
                category: true,
                shortDescription: true,
              },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
        facilityCampaigns: {
          where: {
            facilityId: facility.id,
          },
          select: {
            id: true,
            status: true,
            requestedUnits: true,
            approvedUnits: true,
          },
        },
        _count: {
          select: {
            facilityCampaigns: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Parse target facility types and tags
    const campaignsWithParsedData = campaigns.map((campaign) => {
      let targetFacilityTypes: string[] = [];
      let targetFacilityTags: string[] = [];

      try {
        targetFacilityTypes = JSON.parse(campaign.targetFacilityTypes);
      } catch (e) {
        targetFacilityTypes = [];
      }

      try {
        targetFacilityTags = JSON.parse(campaign.targetFacilityTags);
      } catch (e) {
        targetFacilityTags = [];
      }

      // Check if facility matches target criteria
      const matchesFacilityType =
        targetFacilityTypes.length === 0 ||
        targetFacilityTypes.includes(facility.facilityType);

      const facilityTags = JSON.parse(facility.tags || '[]');
      const matchesTags =
        targetFacilityTags.length === 0 ||
        targetFacilityTags.some((tag: string) => facilityTags.includes(tag));

      const matchesGuestRequirement =
        !campaign.minMonthlyGuests ||
        (facility.avgMonthlyGuests &&
          facility.avgMonthlyGuests >= campaign.minMonthlyGuests);

      const isEligible = matchesFacilityType && matchesTags && matchesGuestRequirement;

      // Get application status
      const myApplication = campaign.facilityCampaigns[0];

      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        totalUnits: campaign.totalUnits,
        maxUnitsPerFacility: campaign.maxUnitsPerFacility,
        costModel: campaign.costModel,
        shippingCostCoveredBy: campaign.shippingCostCoveredBy,
        status: campaign.status,
        manufacturer: campaign.manufacturer,
        products: campaign.campaignProducts.map((cp) => cp.product),
        participatingFacilities: campaign._count.facilityCampaigns,
        targetFacilityTypes,
        targetFacilityTags,
        minMonthlyGuests: campaign.minMonthlyGuests,
        isEligible,
        myApplication: myApplication
          ? {
              id: myApplication.id,
              status: myApplication.status,
              requestedUnits: myApplication.requestedUnits,
              approvedUnits: myApplication.approvedUnits,
            }
          : null,
      };
    });

    return NextResponse.json({ campaigns: campaignsWithParsedData });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
