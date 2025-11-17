import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const manufacturerProfileSchema = z.object({
  companyName: z.string().min(1, '会社名は必須です'),
  companyNameKana: z.string().optional(),
  representativeName: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  websiteUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  businessLicenseNumber: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
});

// GET /api/manufacturer/profile - Get manufacturer profile
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manufacturer = await prisma.manufacturer.findUnique({
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

    if (!manufacturer) {
      return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 });
    }

    return NextResponse.json({ manufacturer });
  } catch (error) {
    console.error('Error fetching manufacturer profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manufacturer profile' },
      { status: 500 }
    );
  }
}

// PUT /api/manufacturer/profile - Update manufacturer profile
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = manufacturerProfileSchema.parse(body);

    // Check if manufacturer exists
    const existingManufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!existingManufacturer) {
      return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 });
    }

    // Update manufacturer
    const manufacturer = await prisma.manufacturer.update({
      where: { userId },
      data: {
        companyName: validatedData.companyName,
        companyNameKana: validatedData.companyNameKana,
        representativeName: validatedData.representativeName,
        postalCode: validatedData.postalCode,
        address: validatedData.address,
        phone: validatedData.phone,
        websiteUrl: validatedData.websiteUrl || null,
        businessLicenseNumber: validatedData.businessLicenseNumber,
        description: validatedData.description,
        logoUrl: validatedData.logoUrl || null,
      },
    });

    return NextResponse.json({
      manufacturer,
      message: 'プロフィールを更新しました',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating manufacturer profile:', error);
    return NextResponse.json(
      { error: 'Failed to update manufacturer profile' },
      { status: 500 }
    );
  }
}
