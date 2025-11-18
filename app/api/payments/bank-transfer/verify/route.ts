import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
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
      where: { id: userId }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const body = await request.json();
    const { invoiceId, approved, rejectionReason } = body;

    if (!invoiceId || approved === undefined) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        manufacturer: {
          include: {
            user: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (invoice.paymentMethod !== 'bank_transfer') {
      return NextResponse.json(
        { error: 'この請求書は銀行振込ではありません' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (approved) {
      // Approve payment
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentStatus: 'completed',
          paidAt: new Date(),
          verifiedBy: userId,
          verifiedAt: new Date(),
        }
      });

      // Update payment record
      await prisma.payment.updateMany({
        where: {
          invoiceId,
          paymentMethod: 'bank_transfer',
          paymentStatus: 'processing',
        },
        data: {
          paymentStatus: 'completed',
          processedAt: new Date(),
        }
      });

      // Notify manufacturer
      await prisma.notification.create({
        data: {
          userId: invoice.manufacturer.userId,
          type: 'payment_verified',
          title: '支払いが確認されました',
          message: `請求書 #${invoice.invoiceNumber} の振込が確認されました。ありがとうございました。`,
          relatedResourceType: 'Invoice',
          relatedResourceId: invoiceId,
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          loggerId: userId,
          action: 'payment_verified',
          entityType: 'Invoice',
          entityId: invoiceId,
          changes: JSON.stringify({
            from: { paymentStatus: 'processing' },
            to: { paymentStatus: 'completed' },
            verifiedBy: user.email,
            amount: invoice.total,
          }),
        }
      });

      console.log(`✅ Payment verified for invoice ${invoice.invoiceNumber} by ${user.email}`);

      return NextResponse.json(
        {
          message: '支払いを承認しました',
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            paymentStatus: 'completed',
          }
        },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );

    } else {
      // Reject payment
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paymentStatus: 'failed',
          bankTransferNote: rejectionReason ? `却下理由: ${rejectionReason}` : invoice.bankTransferNote,
        }
      });

      // Update payment record
      await prisma.payment.updateMany({
        where: {
          invoiceId,
          paymentMethod: 'bank_transfer',
          paymentStatus: 'processing',
        },
        data: {
          paymentStatus: 'failed',
          failedReason: rejectionReason || '管理者により却下されました',
          processedAt: new Date(),
        }
      });

      // Notify manufacturer
      await prisma.notification.create({
        data: {
          userId: invoice.manufacturer.userId,
          type: 'payment_rejected',
          title: '支払いが却下されました',
          message: `請求書 #${invoice.invoiceNumber} の振込証明が却下されました。${rejectionReason ? `理由: ${rejectionReason}` : '詳細は管理者にお問い合わせください。'}`,
          relatedResourceType: 'Invoice',
          relatedResourceId: invoiceId,
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          loggerId: userId,
          action: 'payment_rejected',
          entityType: 'Invoice',
          entityId: invoiceId,
          changes: JSON.stringify({
            from: { paymentStatus: 'processing' },
            to: { paymentStatus: 'failed' },
            rejectedBy: user.email,
            reason: rejectionReason,
          }),
        }
      });

      console.log(`❌ Payment rejected for invoice ${invoice.invoiceNumber} by ${user.email}`);

      return NextResponse.json(
        {
          message: '支払いを却下しました',
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            paymentStatus: 'failed',
          }
        },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: '支払い確認処理に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
