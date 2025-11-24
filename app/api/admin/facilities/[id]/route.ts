import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateFacilitySchema = z.object({
  facilityName: z.string().min(1).optional(),
  facilityNameKana: z.string().optional().nullable(),
  facilityType: z.enum(['hotel', 'ryokan', 'onsen', 'cafe', 'restaurant', 'gym', 'salon', 'other']).optional(),
  postalCode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable().or(z.literal('')),
  totalRooms: z.number().int().min(0).optional().nullable(),
  totalBeds: z.number().int().min(0).optional().nullable(),
  avgDailyGuests: z.number().int().min(0).optional().nullable(),
  avgMonthlyGuests: z.number().int().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
});

// GET /api/admin/facilities/[id] - Get facility details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const facility = await prisma.facility.findUnique({
      where: { id: id },
      include: {
        user: {
          select: {
            email: true,
            status: true,
          },
        },
      },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    // Parse JSON fields
    const tags = facility.tags ? JSON.parse(facility.tags) : [];
    const images = facility.images ? JSON.parse(facility.images) : [];

    return NextResponse.json({
      facility: {
        ...facility,
        tags,
        images,
      },
    });
  } catch (error) {
    console.error('Error fetching facility:', error);
    return NextResponse.json({ error: 'Failed to fetch facility' }, { status: 500 });
  }
}

// PUT /api/admin/facilities/[id] - Update facility
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateFacilitySchema.parse(body);

    const facility = await prisma.facility.update({
      where: { id: id },
      data: validatedData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_UPDATE_FACILITY',
        resourceType: 'facility',
        resourceId: id,
        newValues: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json({ facility, message: '施設情報を更新しました' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error updating facility:', error);
    return NextResponse.json({ error: 'Failed to update facility' }, { status: 500 });
  }
}

// DELETE /api/admin/facilities/[id] - Delete facility
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get facility with userId
    const facility = await prisma.facility.findUnique({
      where: { id: id },
      select: { userId: true },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const deletionDate = new Date();

    // Soft delete both facility and user
    await prisma.$transaction([
      prisma.facility.update({
        where: { id: id },
        data: { deletedAt: deletionDate },
      }),
      prisma.user.update({
        where: { id: facility.userId },
        data: { deletedAt: deletionDate },
      }),
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_DELETE_FACILITY',
        resourceType: 'facility',
        resourceId: id,
      },
    });

    return NextResponse.json({ message: '施設を削除しました' });
  } catch (error) {
    console.error('Error deleting facility:', error);
    return NextResponse.json({ error: 'Failed to delete facility' }, { status: 500 });
  }
}
