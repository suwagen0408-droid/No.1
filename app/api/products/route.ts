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

/**
 * GET /api/products
 * Get products based on user role:
 * - manufacturer: Get their own products
 * - facility: Get all approved products
 * - admin: Get all products (with optional status filter)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and their role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        manufacturer: true,
        facility: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let products;

    // Role-based product fetching
    if (user.role === 'manufacturer') {
      if (!user.manufacturer) {
        return NextResponse.json(
          { error: 'Manufacturer profile not found' },
          { status: 404 }
        );
      }

      products = await prisma.product.findMany({
        where: {
          manufacturerId: user.manufacturer.id,
          deletedAt: null,
          ...(status && { status }),
        },
        include: {
          manufacturer: {
            select: {
              id: true,
              companyName: true,
            },
          },
          _count: {
            select: {
              campaignProducts: true,
              productReviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'facility') {
      // Facilities only see approved products
      products = await prisma.product.findMany({
        where: {
          status: 'approved',
          deletedAt: null,
        },
        include: {
          manufacturer: {
            select: {
              id: true,
              companyName: true,
            },
          },
          _count: {
            select: {
              campaignProducts: true,
              productReviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'admin') {
      // Admin sees all products with optional status filter
      products = await prisma.product.findMany({
        where: {
          deletedAt: null,
          ...(status && { status }),
        },
        include: {
          manufacturer: {
            select: {
              id: true,
              companyName: true,
            },
          },
          _count: {
            select: {
              campaignProducts: true,
              productReviews: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 403 }
      );
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product (manufacturer only)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get manufacturer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { manufacturer: true },
    });

    if (!user || user.role !== 'manufacturer' || !user.manufacturer) {
      return NextResponse.json(
        { error: 'Only manufacturers can create products' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = productSchema.parse(body);

    // Create product with 'draft' status by default
    const product = await prisma.product.create({
      data: {
        ...validatedData,
        manufacturerId: user.manufacturer.id,
        status: 'draft',
      },
      include: {
        manufacturer: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    console.error('Error creating product:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
