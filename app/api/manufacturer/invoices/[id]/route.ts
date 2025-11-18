import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/manufacturer/invoices/[id] - Get invoice details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get manufacturer
    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'メーカー情報が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        invoiceItems: {
          include: {
            campaign: {
              select: {
                name: true,
              },
            },
            facility: {
              select: {
                facilityName: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify this invoice belongs to the manufacturer
    if (invoice.manufacturerId !== manufacturer.id) {
      return NextResponse.json(
        { error: 'この請求書にアクセスする権限がありません' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return NextResponse.json(
      { invoice },
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
