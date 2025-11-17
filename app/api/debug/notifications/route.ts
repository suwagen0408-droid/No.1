import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DEBUG API - Check notifications in database
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    // Get all notifications for this user
    const userNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // If admin, get all recent notifications
    let allNotifications = [];
    if (user?.role === 'admin') {
      allNotifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      });
    }

    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, email: true },
    });

    // Count notifications by user
    const notificationCounts = await prisma.notification.groupBy({
      by: ['userId'],
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      currentUser: user,
      userNotifications,
      userNotificationCount: userNotifications.length,
      admins,
      allNotifications: user?.role === 'admin' ? allNotifications : null,
      notificationCounts,
    });
  } catch (error) {
    console.error('Error fetching debug notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug notifications' },
      { status: 500 }
    );
  }
}
