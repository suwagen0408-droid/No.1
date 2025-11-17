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
        manufacturer: {
          select: {
            companyName: true,
            address: true,
            phone: true,
            postalCode: true,
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

    // Verify ownership
    if (invoice.manufacturerId !== manufacturer.id) {
      return NextResponse.json(
        { error: '権限がありません' },
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

// PATCH /api/manufacturer/invoices/[id] - Update invoice status
export async function PATCH(
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

    const body = await request.json();
    const { status } = body;

    if (!['draft', 'issued', 'paid', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: '無効なステータスです' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
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
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify ownership
    if (invoice.manufacturerId !== manufacturer.id) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const now = new Date();
    const updateData: any = {
      status,
      updatedAt: now,
    };

    if (status === 'issued' && !invoice.issuedAt) {
      updateData.issuedAt = now;
      updateData.dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }

    if (status === 'paid' && !invoice.paidAt) {
      updateData.paidAt = now;
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: 'ステータスを更新しました',
        invoice: updatedInvoice,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('請求書更新エラー:', error);
    return NextResponse.json(
      { error: '請求書の更新に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

// DELETE /api/manufacturer/invoices/[id] - Delete invoice (only drafts)
export async function DELETE(
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
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify ownership
    if (invoice.manufacturerId !== manufacturer.id) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Only allow deleting drafts
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: '下書きの請求書のみ削除できます' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Delete invoice (cascade will delete items)
    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: '請求書を削除しました' },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('請求書削除エラー:', error);
    return NextResponse.json(
      { error: '請求書の削除に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
