import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ProductStatus } from '@prisma/client';

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().optional().nullable(),
  category: z.enum([
    'shampoo',
    'conditioner',
    'body_soap',
    'face_wash',
    'lotion',
    'cream',
    'serum',
    'sunscreen',
    'toothbrush',
    'toothpaste',
    'drink',
    'food',
    'supplement',
    'amenity',
    'other',
  ]).optional(),
  tagline: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  ingredients: z.string().optional().nullable(),
  usageInstructions: z.string().optional().nullable(),
  volume: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  janCode: z.string().optional().nullable(),
  costPrice: z.number().min(0).optional(),
  retailPrice: z.number().min(0).optional(),
  ecUrl: z.string().url().optional(),
  ecPlatform: z.string().optional().nullable(),
  mainImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'pending', 'approved', 'rejected', 'archived']).optional(),
});

// GET /api/admin/products/[id] - Get product details
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

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        manufacturer: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT /api/admin/products/[id] - Update product
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
    const validatedData = updateProductSchema.parse(body);

    // If status is being changed to approved, set approvedAt and approvedBy
    const updateData: any = { ...validatedData };
    if (validatedData.status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = userId;
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_UPDATE_PRODUCT',
        resourceType: 'product',
        resourceId: params.id,
        newValues: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json({ product, message: '商品情報を更新しました' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] - Delete product
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
    await prisma.product.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_DELETE_PRODUCT',
        resourceType: 'product',
        resourceId: params.id,
      },
    });

    return NextResponse.json({ message: '商品を削除しました' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
