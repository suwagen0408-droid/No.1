import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe, toStripeAmount } from '@/lib/stripe';

// POST /api/facility/payments/create-intent - Create Stripe Payment Intent
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: '支払いIDが必要です' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get facility
    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json(
        { error: '施設情報が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get payment
    const payment = await prisma.facilityPayment.findUnique({
      where: { id: paymentId },
      include: {
        facilityCampaign: {
          include: {
            campaign: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment || payment.facilityId !== facility.id) {
      return NextResponse.json(
        { error: '支払い情報が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (payment.paymentStatus !== 'pending') {
      return NextResponse.json(
        { error: 'この支払いは既に処理されています' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toStripeAmount(payment.totalAmount, 'jpy'),
      currency: 'jpy',
      metadata: {
        facilityPaymentId: payment.id,
        facilityCampaignId: payment.facilityCampaignId,
        facilityId: payment.facilityId,
        campaignName: payment.facilityCampaign.campaign.name,
      },
    });

    // Update payment record with Stripe Payment Intent ID
    await prisma.facilityPayment.update({
      where: { id: paymentId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    console.log(`💳 Payment Intent created for facility payment ${paymentId}: ${paymentIntent.id}`);

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: payment.totalAmount,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Payment Intent creation error:', error);
    return NextResponse.json(
      { error: '決済処理の準備に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
