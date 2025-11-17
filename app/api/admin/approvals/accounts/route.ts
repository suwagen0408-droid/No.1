import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get pending manufacturers and facilities
    const pendingManufacturers = await prisma.user.findMany({
      where: {
        role: 'manufacturer',
        status: 'pending',
      },
      include: {
        manufacturer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const pendingFacilities = await prisma.user.findMany({
      where: {
        role: 'facility',
        status: 'pending',
      },
      include: {
        facility: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get approved/rejected accounts (last 20)
    const processedAccounts = await prisma.user.findMany({
      where: {
        role: { in: ['manufacturer', 'facility'] },
        status: { in: ['active', 'rejected'] },
      },
      include: {
        manufacturer: {
          include: {
            approver: {
              select: {
                email: true,
              },
            },
          },
        },
        facility: {
          include: {
            approver: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({
      pending: {
        manufacturers: pendingManufacturers,
        facilities: pendingFacilities,
      },
      processed: processedAccounts,
    });
  } catch (error) {
    console.error('Error fetching pending accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, rejectionReason, adminId } = body;

    if (!userId || !action || !adminId) {
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

    // Get user with manufacturer/facility data
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

    if (user.status !== 'pending') {
      return NextResponse.json(
        { error: 'Account is not pending approval' },
        { status: 400 }
      );
    }

    const now = new Date();
    const newStatus = action === 'approve' ? 'active' : 'rejected';

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: newStatus,
        updatedAt: now,
      },
    });

    // Update manufacturer or facility approval fields
    if (user.manufacturer) {
      await prisma.manufacturer.update({
        where: { id: user.manufacturer.id },
        data: {
          approvedAt: action === 'approve' ? now : null,
          approvedBy: adminId,
          rejectionReason: action === 'reject' ? rejectionReason : null,
          updatedAt: now,
        },
      });
    } else if (user.facility) {
      await prisma.facility.update({
        where: { id: user.facility.id },
        data: {
          approvedAt: action === 'approve' ? now : null,
          approvedBy: adminId,
          rejectionReason: action === 'reject' ? rejectionReason : null,
          updatedAt: now,
        },
      });
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: userId,
        type: action === 'approve' ? 'account_approved' : 'account_rejected',
        title: action === 'approve' ? 'アカウント承認' : 'アカウント却下',
        message:
          action === 'approve'
            ? 'アカウントが承認されました。ログインして利用を開始できます。'
            : `アカウントが却下されました。理由: ${rejectionReason || '未指定'}`,
        relatedResourceType: 'user',
        relatedResourceId: userId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: action === 'approve' ? 'APPROVE_ACCOUNT' : 'REJECT_ACCOUNT',
        resourceType: user.role,
        resourceId: userId,
        newValues: JSON.stringify({
          status: newStatus,
          rejectionReason: rejectionReason,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Account ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error processing account approval:', error);
    return NextResponse.json(
      { error: 'Failed to process account approval' },
      { status: 500 }
    );
  }
}
