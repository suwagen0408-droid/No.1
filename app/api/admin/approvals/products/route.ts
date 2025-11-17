import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyProductApproved, notifyProductRejected } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    // Get pending products
    const pendingProducts = await prisma.product.findMany({
      where: {
        status: 'pending',
      },
      include: {
        manufacturer: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get recently processed products (last 20)
    const processedProducts = await prisma.product.findMany({
      where: {
        status: { in: ['approved', 'rejected'] },
        deletedAt: null,
      },
      include: {
        manufacturer: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        approver: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({
      pending: pendingProducts,
      processed: processedProducts,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, action, rejectionReason, adminId } = body;

    if (!productId || !action || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        manufacturer: {
          include: {
            user: true,
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

    if (product.status !== 'pending') {
      return NextResponse.json(
        { error: 'Product is not pending approval' },
        { status: 400 }
      );
    }

    const now = new Date();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        status: newStatus,
        approvedAt: action === 'approve' ? now : null,
        approvedBy: adminId,
        rejectionReason: action === 'reject' ? rejectionReason : null,
        updatedAt: now,
      },
    });

    // Create notification for manufacturer
    if (action === 'approve') {
      await notifyProductApproved(product.manufacturer.userId, productId, product.name);
    } else {
      await notifyProductRejected(product.manufacturer.userId, productId, product.name, rejectionReason);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: action === 'approve' ? 'APPROVE_PRODUCT' : 'REJECT_PRODUCT',
        resourceType: 'product',
        resourceId: productId,
        newValues: JSON.stringify({
          status: newStatus,
          rejectionReason: rejectionReason,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Product ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error processing product approval:', error);
    return NextResponse.json(
      { error: 'Failed to process product approval' },
      { status: 500 }
    );
  }
}
