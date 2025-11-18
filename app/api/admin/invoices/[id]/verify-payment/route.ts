import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/invoices/[id]/verify-payment
 * Admin verifies bank transfer payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // Verify admin access
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { approved, rejectionReason } = body;

    // Fetch invoice
    const invoice = await prisma.facilityInvoice.findUnique({
      where: { id },
      include: {
        facility: {
          select: {
            userId: true,
            facilityName: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404 }
      );
    }

    // Check if payment is pending verification
    if (invoice.status !== 'payment_pending') {
      return NextResponse.json(
        { error: '確認できる状態ではありません' },
        { status: 400 }
      );
    }

    if (approved) {
      // Approve payment
      await prisma.facilityInvoice.update({
        where: { id },
        data: {
          status: 'paid',
          paidAt: new Date(),
        },
      });

      // Create notification for facility
      await prisma.notification.create({
        data: {
          userId: invoice.facility.userId,
          type: 'payment_completed',
          title: '支払いが確認されました',
          message: `請求書 ${invoice.invoiceNumber} の支払いが確認され、完了しました。`,
          relatedResourceType: 'FacilityInvoice',
          relatedResourceId: invoice.id,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          userEmail: user.email,
          userRole: user.role,
          action: 'PAYMENT_VERIFIED',
          resourceType: 'FacilityInvoice',
          resourceId: invoice.id,
          newValues: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.total,
            verifiedBy: user.email,
          }),
        },
      });

      // Send email notification
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: invoice.facility.userId,
          type: 'payment_completed',
          subject: '支払い確認完了のお知らせ',
          templateData: {
            message: `請求書 ${invoice.invoiceNumber} の支払いが確認されました。金額: ¥${invoice.total.toLocaleString()}`,
          },
        }),
      }).catch((error) => {
        console.error('Failed to send payment email:', error);
      });

      return NextResponse.json({
        success: true,
        message: '支払いを承認しました',
      });
    } else {
      // Reject payment
      await prisma.facilityInvoice.update({
        where: { id },
        data: {
          status: 'issued', // Revert to issued
          bankTransferProofUrl: null,
        },
      });

      // Create notification for facility
      await prisma.notification.create({
        data: {
          userId: invoice.facility.userId,
          type: 'payment_rejected',
          title: '支払い確認が却下されました',
          message: `請求書 ${invoice.invoiceNumber} の振込証明書が却下されました。理由: ${rejectionReason || '不明'}`,
          relatedResourceType: 'FacilityInvoice',
          relatedResourceId: invoice.id,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          userEmail: user.email,
          userRole: user.role,
          action: 'PAYMENT_REJECTED',
          resourceType: 'FacilityInvoice',
          resourceId: invoice.id,
          oldValues: JSON.stringify({
            proofUrl: invoice.bankTransferProofUrl,
          }),
          newValues: JSON.stringify({
            rejectionReason: rejectionReason || 'Not specified',
            rejectedBy: user.email,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: '支払いを却下しました',
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: '支払い確認の処理に失敗しました' },
      { status: 500 }
    );
  }
}
