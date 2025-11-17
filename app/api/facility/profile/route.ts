import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const facilityProfileSchema = z.object({
  facilityName: z.string().min(1, '施設名は必須です'),
  facilityNameKana: z.string().optional(),
  facilityType: z.enum(['hotel', 'ryokan', 'onsen', 'resort', 'guesthouse', 'other']),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  websiteUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  totalRooms: z.number().int().min(0).optional(),
  totalBeds: z.number().int().min(0).optional(),
  avgDailyGuests: z.number().int().min(0).optional(),
  avgMonthlyGuests: z.number().int().min(0).optional(),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
});

// GET /api/facility/profile - Get facility profile
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
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
    console.error('Error fetching facility profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facility profile' },
      { status: 500 }
    );
  }
}

// PUT /api/facility/profile - Update facility profile
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = facilityProfileSchema.parse(body);

    // Check if facility exists
    const existingFacility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!existingFacility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    // Update facility
    const facility = await prisma.facility.update({
      where: { userId },
      data: {
        facilityName: validatedData.facilityName,
        facilityNameKana: validatedData.facilityNameKana,
        facilityType: validatedData.facilityType,
        postalCode: validatedData.postalCode,
        address: validatedData.address,
        phone: validatedData.phone,
        websiteUrl: validatedData.websiteUrl || null,
        totalRooms: validatedData.totalRooms,
        totalBeds: validatedData.totalBeds,
        avgDailyGuests: validatedData.avgDailyGuests,
        avgMonthlyGuests: validatedData.avgMonthlyGuests,
        tags: JSON.stringify(validatedData.tags),
        description: validatedData.description,
        images: JSON.stringify(validatedData.images),
      },
    });

    return NextResponse.json({
      facility,
      message: 'プロフィールを更新しました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating facility profile:', error);
    return NextResponse.json(
      { error: 'Failed to update facility profile' },
      { status: 500 }
    );
  }
}
