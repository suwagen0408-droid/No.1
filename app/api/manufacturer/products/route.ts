import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Product creation/update schema
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
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
  ]),
  tagline: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  ingredients: z.string().optional(),
  usageInstructions: z.string().optional(),
  volume: z.string().optional(),
  size: z.string().optional(),
  janCode: z.string().optional(),
  costPrice: z.number().min(0),
  retailPrice: z.number().min(0),
  currency: z.string().default('JPY'),
  ecUrl: z.string().url('Valid EC URL is required'),
  ecPlatform: z.string().optional(),
  mainImageUrl: z.string().url().optional(),
});

// GET /api/manufacturer/products - Get all products for logged-in manufacturer
export async function GET(request: NextRequest) {
  try {
    // Get user from auth (in real app, use JWT or session)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get manufacturer
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    // Get all products for this manufacturer
    const products = await prisma.product.findMany({
      where: {
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
      include: {
        productImages: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
        _count: {
          select: {
            campaignProducts: true,
            qrScanEvents: true,
            purchaseEvents: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/manufacturer/products - Create new product
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const validatedData = productSchema.parse(body);

    // Create product with status 'pending' (requires admin approval)
    const product = await prisma.product.create({
      data: {
        manufacturerId: manufacturer.id,
        name: validatedData.name,
        nameEn: validatedData.nameEn,
        category: validatedData.category,
        tagline: validatedData.tagline,
        shortDescription: validatedData.shortDescription,
        description: validatedData.description,
        ingredients: validatedData.ingredients,
        usageInstructions: validatedData.usageInstructions,
        volume: validatedData.volume,
        size: validatedData.size,
        janCode: validatedData.janCode,
        costPrice: validatedData.costPrice,
        retailPrice: validatedData.retailPrice,
        currency: validatedData.currency,
        ecUrl: validatedData.ecUrl,
        ecPlatform: validatedData.ecPlatform,
        mainImageUrl: validatedData.mainImageUrl,
        status: 'pending', // Requires admin approval
      },
      include: {
        productImages: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE_PRODUCT',
        resourceType: 'product',
        resourceId: product.id,
        newValues: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json(
      { 
        product,
        message: 'Product created successfully. Waiting for admin approval.',
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
    
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
