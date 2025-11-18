import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/payments - Get all invoices for admin review
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get status filter from query params
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');

    // Build where clause
    const where: any = {};
    if (statusFilter) {
      where.paymentStatus = statusFilter;
    }

    // Get invoices
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        manufacturer: {
          select: {
            id: true,
            companyName: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          paymentStatus: 'asc', // processing first
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    // Transform data to include email at manufacturer level
    const transformedInvoices = invoices.map(invoice => ({
      ...invoice,
      manufacturer: {
        id: invoice.manufacturer.id,
        companyName: invoice.manufacturer.companyName,
        email: invoice.manufacturer.user.email,
      },
    }));

    return NextResponse.json(
      { invoices: transformedInvoices },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('請求書取得エラー:', error);
    return NextResponse.json(
      { error: '請求書の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
