import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateManufacturerSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyNameKana: z.string().optional().nullable(),
  representativeName: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable().or(z.literal('')),
  businessLicenseNumber: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
});

// GET /api/admin/manufacturers/[id] - Get manufacturer details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id: params.id },
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
    console.error('Error fetching manufacturer:', error);
    return NextResponse.json({ error: 'Failed to fetch manufacturer' }, { status: 500 });
  }
}

// PUT /api/admin/manufacturers/[id] - Update manufacturer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const validatedData = updateManufacturerSchema.parse(body);

    const manufacturer = await prisma.manufacturer.update({
      where: { id: params.id },
      data: validatedData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_UPDATE_MANUFACTURER',
        resourceType: 'manufacturer',
        resourceId: params.id,
        newValues: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json({ manufacturer, message: 'メーカー情報を更新しました' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error updating manufacturer:', error);
    return NextResponse.json({ error: 'Failed to update manufacturer' }, { status: 500 });
  }
}

// DELETE /api/admin/manufacturers/[id] - Delete manufacturer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Soft delete
    await prisma.manufacturer.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_DELETE_MANUFACTURER',
        resourceType: 'manufacturer',
        resourceId: params.id,
      },
    });

    return NextResponse.json({ message: 'メーカーを削除しました' });
  } catch (error) {
    console.error('Error deleting manufacturer:', error);
    return NextResponse.json({ error: 'Failed to delete manufacturer' }, { status: 500 });
  }
}
