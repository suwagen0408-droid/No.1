import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  console.log(`📨 Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId;
  
  if (!invoiceId) {
    console.error('No invoiceId in session metadata');
    return;
  }

  console.log(`✅ Checkout session completed for invoice ${invoiceId}`);

  // Update invoice
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentStatus: 'completed',
      paidAt: new Date(),
      stripePaymentIntentId: session.payment_intent as string,
    }
  });

  // Update payment record
  await prisma.payment.updateMany({
    where: {
      invoiceId,
      paymentMethod: 'stripe',
      paymentStatus: 'processing',
    },
    data: {
      paymentStatus: 'completed',
      stripePaymentIntentId: session.payment_intent as string,
      processedAt: new Date(),
    }
  });

  // Get invoice details for notification
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

  if (invoice) {
    // Send notification to manufacturer
    await prisma.notification.create({
      data: {
        userId: invoice.manufacturer.userId,
        type: 'payment_completed',
        title: '支払いが完了しました',
        message: `請求書 #${invoice.invoiceNumber} の支払いが完了しました。金額: ¥${invoice.total.toLocaleString()}`,
        relatedResourceType: 'Invoice',
        relatedResourceId: invoiceId,
      }
    });

    console.log(`📧 Notification sent to manufacturer for invoice ${invoice.invoiceNumber}`);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoiceId;
  
  if (!invoiceId) {
    console.error('No invoiceId in payment intent metadata');
    return;
  }

  console.log(`💰 Payment succeeded for invoice ${invoiceId}`);

  // Update payment record with charge details
  await prisma.payment.updateMany({
    where: {
      invoiceId,
      stripePaymentIntentId: paymentIntent.id,
    },
    data: {
      stripeChargeId: paymentIntent.latest_charge as string,
      paymentStatus: 'completed',
      processedAt: new Date(),
    }
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoiceId;
  
  if (!invoiceId) {
    console.error('No invoiceId in payment intent metadata');
    return;
  }

  console.log(`❌ Payment failed for invoice ${invoiceId}`);

  // Update invoice
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentStatus: 'failed',
    }
  });

  // Update payment record
  await prisma.payment.updateMany({
    where: {
      invoiceId,
      stripePaymentIntentId: paymentIntent.id,
    },
    data: {
      paymentStatus: 'failed',
      failedReason: paymentIntent.last_payment_error?.message || 'Unknown error',
      processedAt: new Date(),
    }
  });

  // Get invoice details for notification
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

  if (invoice) {
    // Send notification to manufacturer
    await prisma.notification.create({
      data: {
        userId: invoice.manufacturer.userId,
        type: 'payment_failed',
        title: '支払いに失敗しました',
        message: `請求書 #${invoice.invoiceNumber} の支払いに失敗しました。別の支払い方法をお試しください。`,
        relatedResourceType: 'Invoice',
        relatedResourceId: invoiceId,
      }
    });
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) {
    console.error('No payment intent in charge');
    return;
  }

  console.log(`🔄 Charge refunded: ${charge.id}`);

  // Find payment by payment intent ID
  const payment = await prisma.payment.findFirst({
    where: {
      stripePaymentIntentId: paymentIntentId,
    },
    include: {
      invoice: {
        include: {
          manufacturer: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  if (payment) {
    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: 'refunded',
        stripeRefundId: charge.refunds?.data[0]?.id,
        processedAt: new Date(),
      }
    });

    // Update invoice
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        paymentStatus: 'refunded',
      }
    });

    // Send notification
    await prisma.notification.create({
      data: {
        userId: payment.invoice.manufacturer.userId,
        type: 'payment_refunded',
        title: '支払いが返金されました',
        message: `請求書 #${payment.invoice.invoiceNumber} の支払いが返金されました。金額: ¥${payment.amount.toLocaleString()}`,
        relatedResourceType: 'Invoice',
        relatedResourceId: payment.invoiceId,
      }
    });
  }
}
