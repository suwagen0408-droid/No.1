import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

/**
 * Stripe Webhook Handler
 * 
 * This endpoint receives webhook events from Stripe for:
 * - payment_intent.succeeded - Payment completed successfully
 * - payment_intent.payment_failed - Payment failed
 * - charge.refunded - Payment was refunded
 * 
 * IMPORTANT: In production, you MUST verify the webhook signature using:
 * const sig = request.headers.get('stripe-signature');
 * const event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET!);
 * 
 * For now, this is a MOCK implementation for development.
 */

export async function POST(request: NextRequest) {
  try {
    // In production, verify webhook signature here
    // const sig = request.headers.get('stripe-signature');
    // if (!sig) {
    //   return NextResponse.json({ error: 'No signature' }, { status: 400 });
    // }

    const body = await request.json();
    const event = body;

    console.log(`🔔 [WEBHOOK] Received Stripe event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const facilityPaymentId = paymentIntent.metadata?.facilityPaymentId;

        if (!facilityPaymentId) {
          console.warn('⚠️  Payment intent missing facilityPaymentId metadata');
          break;
        }

        // Update payment status
        const payment = await prisma.facilityPayment.update({
          where: { id: facilityPaymentId },
          data: {
            paymentStatus: 'completed',
            paidAt: new Date(),
            stripePaymentIntentId: paymentIntent.id,
          },
          include: {
            facilityCampaign: {
              include: {
                campaign: {
                  include: {
                    manufacturer: true,
                  },
                },
              },
            },
            facility: true,
          },
        });

        // Update facility campaign status to approved
        await prisma.facilityCampaign.update({
          where: { id: payment.facilityCampaignId },
          data: { status: 'approved' },
        });

        // Send notification to manufacturer
        await prisma.notification.create({
          data: {
            userId: payment.facilityCampaign.campaign.manufacturer.userId,
            type: 'payment_received',
            title: '支払いが完了しました',
            message: `${payment.facility.facilityName}から「${payment.facilityCampaign.campaign.name}」の支払いが完了しました。金額: ¥${payment.totalAmount.toLocaleString()}`,
            relatedResourceType: 'FacilityPayment',
            relatedResourceId: payment.id,
          },
        });

        console.log(`✅ Payment completed: ${facilityPaymentId}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const facilityPaymentId = paymentIntent.metadata?.facilityPaymentId;

        if (!facilityPaymentId) {
          console.warn('⚠️  Payment intent missing facilityPaymentId metadata');
          break;
        }

        // Update payment status to failed
        const payment = await prisma.facilityPayment.update({
          where: { id: facilityPaymentId },
          data: {
            paymentStatus: 'failed',
            failedAt: new Date(),
            failedReason: paymentIntent.last_payment_error?.message || '決済に失敗しました',
          },
          include: {
            facility: true,
          },
        });

        // Send notification to facility
        await prisma.notification.create({
          data: {
            userId: payment.facility.userId,
            type: 'payment_failed',
            title: '支払いが失敗しました',
            message: '支払い処理中にエラーが発生しました。もう一度お試しください。',
            relatedResourceType: 'FacilityPayment',
            relatedResourceId: payment.id,
          },
        });

        console.log(`❌ Payment failed: ${facilityPaymentId}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;

        // Find payment by stripe payment intent ID
        const payment = await prisma.facilityPayment.findUnique({
          where: { stripePaymentIntentId: paymentIntentId },
          include: {
            facility: true,
          },
        });

        if (!payment) {
          console.warn('⚠️  Payment not found for refunded charge');
          break;
        }

        // Update payment status to refunded
        await prisma.facilityPayment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: 'refunded',
          },
        });

        // Send notification to facility
        await prisma.notification.create({
          data: {
            userId: payment.facility.userId,
            type: 'payment_refunded',
            title: '返金処理が完了しました',
            message: `支払いの返金処理が完了しました。金額: ¥${payment.totalAmount.toLocaleString()}`,
            relatedResourceType: 'FacilityPayment',
            relatedResourceId: payment.id,
          },
        });

        console.log(`💰 Payment refunded: ${payment.id}`);
        break;
      }

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
