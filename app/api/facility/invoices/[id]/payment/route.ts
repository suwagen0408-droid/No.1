import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe, toStripeAmount, mockPaymentMethod } from '@/lib/stripe';

/**
 * POST /api/facility/invoices/[id]/payment
 * Process invoice payment via Stripe or bank transfer
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

    // Get user with facility relationship
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { facility: true },
    });

    if (!user || user.role !== 'facility' || !user.facility) {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { paymentMethod, proofUrl } = body;

    // Supported payment methods: 'stripe' or 'bank_transfer'
    if (!paymentMethod || !['stripe', 'bank_transfer'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: '有効な支払い方法を選択してください' },
        { status: 400 }
      );
    }

    // Fetch invoice
    const invoice = await prisma.facilityInvoice.findFirst({
      where: {
        id,
        facilityId: user.facility.id,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'この請求書は既に支払済みです' },
        { status: 400 }
      );
    }

    // Check if invoice is issued
    if (invoice.status !== 'issued' && invoice.status !== 'sent') {
      return NextResponse.json(
        { error: '支払いできる状態ではありません' },
        { status: 400 }
      );
    }

    if (paymentMethod === 'stripe') {
      // Stripe payment flow
      const amount = toStripeAmount(invoice.total, 'jpy');

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'jpy',
        metadata: {
          invoiceId: invoice.id,
          facilityId: user.facility.id,
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      // Simulate payment confirmation (in real app, this happens via webhook)
      const confirmedIntent = await stripe.paymentIntents.confirm(
        paymentIntent.id,
        { payment_method: mockPaymentMethod() }
      );

      if (confirmedIntent.status === 'succeeded') {
        // Update invoice status
        await prisma.facilityInvoice.update({
          where: { id },
          data: {
            status: 'paid',
            paidAt: new Date(),
            paymentMethod: 'stripe',
            stripePaymentIntentId: paymentIntent.id,
          },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'payment_completed',
            title: '支払いが完了しました',
            message: `請求書 ${invoice.invoiceNumber} の支払いが完了しました。`,
            relatedResourceType: 'FacilityInvoice',
            relatedResourceId: invoice.id,
          },
        });

        // Send email notification (async)
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            type: 'payment_completed',
            subject: '支払い完了のお知らせ',
            templateData: {
              message: `請求書 ${invoice.invoiceNumber} の支払いが完了しました。金額: ¥${invoice.total.toLocaleString()}`,
            },
          }),
        }).catch((error) => {
          console.error('Failed to send payment email:', error);
        });

        return NextResponse.json({
          success: true,
          message: '支払いが完了しました',
          paymentIntentId: paymentIntent.id,
        });
      } else {
        return NextResponse.json(
          { error: '支払いの処理に失敗しました' },
          { status: 500 }
        );
      }
    } else if (paymentMethod === 'bank_transfer') {
      // Bank transfer payment flow
      if (!proofUrl) {
        return NextResponse.json(
          { error: '振込証明書のアップロードが必要です' },
          { status: 400 }
        );
      }

      // Update invoice with payment proof (pending verification)
      await prisma.facilityInvoice.update({
        where: { id },
        data: {
          status: 'payment_pending',
          paymentMethod: 'bank_transfer',
          bankTransferProofUrl: proofUrl,
        },
      });

      // Create notification for facility
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'payment_submitted',
          title: '支払い情報を送信しました',
          message: `請求書 ${invoice.invoiceNumber} の振込証明書を提出しました。確認をお待ちください。`,
          relatedResourceType: 'FacilityInvoice',
          relatedResourceId: invoice.id,
        },
      });

      // TODO: Create notification for admin to verify payment

      return NextResponse.json({
        success: true,
        message: '振込証明書を提出しました。確認後、支払いが完了します。',
      });
    }

    return NextResponse.json(
      { error: '無効な支払い方法です' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Invoice payment error:', error);
    return NextResponse.json(
      { error: '支払いの処理に失敗しました' },
      { status: 500 }
    );
  }
}
