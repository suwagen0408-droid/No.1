import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updatePlacementSchema = z.object({
  currentUnits: z.number().int().min(0).optional(),
  reorderThreshold: z.number().int().min(0).optional(),
  locationLabel: z.string().min(1).optional(),
  notes: z.string().optional(),
});

const stockUpdateSchema = z.object({
  changeType: z.enum(['restock', 'consume', 'adjust', 'damage']),
  changeAmount: z.number().int(),
  notes: z.string().optional(),
});

// GET /api/facility/placements/[id] - Get single placement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const placement = await prisma.facilityProductPlacement.findFirst({
      where: {
        id: params.id,
        facilityCampaign: {
          facilityId: facility.id,
        },
      },
      include: {
        product: true,
        facilityCampaign: {
          include: {
            campaign: true,
          },
        },
        qrCodes: {
          where: {
            isActive: true,
          },
        },
        stockLogs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    return NextResponse.json({ placement });
  } catch (error) {
    console.error('Error fetching placement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch placement' },
      { status: 500 }
    );
  }
}

// PUT /api/facility/placements/[id] - Update placement
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updatePlacementSchema.parse(body);

    // Verify ownership
    const existingPlacement = await prisma.facilityProductPlacement.findFirst({
      where: {
        id: params.id,
        facilityCampaign: {
          facilityId: facility.id,
        },
      },
    });

    if (!existingPlacement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    const placement = await prisma.facilityProductPlacement.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        product: true,
        facilityCampaign: {
          include: {
            campaign: true,
          },
        },
      },
    });

    return NextResponse.json({ placement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating placement:', error);
    return NextResponse.json(
      { error: 'Failed to update placement' },
      { status: 500 }
    );
  }
}

// POST /api/facility/placements/[id] - Update stock (for stock changes)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = stockUpdateSchema.parse(body);

    // Verify ownership
    const placement = await prisma.facilityProductPlacement.findFirst({
      where: {
        id: params.id,
        facilityCampaign: {
          facilityId: facility.id,
        },
      },
    });

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    // Calculate new balance
    const newBalance = placement.currentUnits + validatedData.changeAmount;

    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    // Update placement
    const updatedPlacement = await prisma.facilityProductPlacement.update({
      where: { id: params.id },
      data: {
        currentUnits: newBalance,
      },
    });

    // Create stock log
    await prisma.stockLog.create({
      data: {
        facilityProductPlacementId: params.id,
        changeType: validatedData.changeType,
        changeAmount: validatedData.changeAmount,
        newBalance,
        notes: validatedData.notes,
        userId,
      },
    });

    return NextResponse.json({
      placement: updatedPlacement,
      message: 'Stock updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating stock:', error);
    return NextResponse.json(
      { error: 'Failed to update stock' },
      { status: 500 }
    );
  }
}

// DELETE /api/facility/placements/[id] - Soft delete placement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    // Verify ownership
    const placement = await prisma.facilityProductPlacement.findFirst({
      where: {
        id: params.id,
        facilityCampaign: {
          facilityId: facility.id,
        },
      },
    });

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    // Hard delete since FacilityProductPlacement doesn't have deletedAt field
    await prisma.facilityProductPlacement.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Placement deleted successfully' });
  } catch (error) {
    console.error('Error deleting placement:', error);
    return NextResponse.json(
      { error: 'Failed to delete placement' },
      { status: 500 }
    );
  }
}
