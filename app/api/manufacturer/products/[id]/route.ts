import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().optional(),
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
  tagline: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  ingredients: z.string().optional(),
  usageInstructions: z.string().optional(),
  volume: z.string().optional(),
  size: z.string().optional(),
  janCode: z.string().optional(),
  costPrice: z.number().min(0).optional(),
  retailPrice: z.number().min(0).optional(),
  currency: z.string().optional(),
  ecUrl: z.string().url().optional(),
  ecPlatform: z.string().optional(),
  mainImageUrl: z.string().optional(), // Can be absolute URL or relative path
});

// GET /api/manufacturer/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id: id,
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
      include: {
        productImages: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
        campaignProducts: {
          include: {
            campaign: true,
          },
        },
        _count: {
          select: {
            qrScanEvents: true,
            clickEvents: true,
            purchaseEvents: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT /api/manufacturer/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    // Check if product exists and belongs to this manufacturer
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: id,
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // If product was approved, it needs re-approval after editing
    const body = await request.json();
    const validatedData = productSchema.parse(body);

    const updateData: any = { ...validatedData };
    
    // If product was approved and is being edited, set to pending
    if (existingProduct.status === 'approved') {
      updateData.status = 'pending';
      updateData.approvedAt = null;
      updateData.approvedBy = null;
    }

    const product = await prisma.product.update({
      where: { id: id },
      data: updateData,
      include: {
        productImages: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_PRODUCT',
        resourceType: 'product',
        resourceId: product.id,
        oldValues: JSON.stringify(existingProduct),
        newValues: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json({
      product,
      message:
        existingProduct.status === 'approved'
          ? 'Product updated. Waiting for admin re-approval.'
          : 'Product updated successfully.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/manufacturer/products/[id] - Delete product (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id: id,
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.product.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
        status: 'archived',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_PRODUCT',
        resourceType: 'product',
        resourceId: product.id,
      },
    });

    return NextResponse.json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
