import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe, toStripeAmount, mockPaymentMethod } from '@/lib/stripe';

// GET /api/facility/payments - Get pending payments for facility
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
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

    // Get pending payments
    const payments = await prisma.facilityPayment.findMany({
      where: {
        facilityId: facility.id,
        paymentStatus: 'pending',
      },
      include: {
        facilityCampaign: {
          include: {
            campaign: {
              include: {
                manufacturer: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      { payments },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Payments retrieval error:', error);
    return NextResponse.json(
      { error: '支払い情報の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

// POST /api/facility/payments - Process payment (mock for now)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { paymentId, paymentMethod } = await request.json();

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
        facilityCampaign: true,
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

    // ===== STRIPE PAYMENT PROCESSING =====
    // This is using MOCK Stripe integration for demo purposes
    // In production, replace with real Stripe SDK and payment flow
    
    const now = new Date();
    let stripePaymentIntentId: string | undefined;
    let stripeChargeId: string | undefined;

    try {
      // Create Stripe Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(payment.totalAmount, 'jpy'),
        currency: 'jpy',
        metadata: {
          facilityPaymentId: payment.id,
          facilityCampaignId: payment.facilityCampaignId,
          facilityId: payment.facilityId,
        },
      });

      stripePaymentIntentId = paymentIntent.id;

      // Simulate payment method confirmation
      // In production, this would be done via Stripe Elements on the frontend
      const mockPM = mockPaymentMethod();
      const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: mockPM,
      });

      // Mock charge ID (in real Stripe, this comes from the payment intent)
      stripeChargeId = `ch_mock_${Date.now()}`;

      console.log(`✅ Stripe payment processed: ${stripePaymentIntentId}`);
    } catch (stripeError) {
      console.error('Stripe payment error:', stripeError);
      
      // Mark payment as failed
      await prisma.facilityPayment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: 'failed',
          failedAt: now,
          failedReason: '決済処理に失敗しました',
        },
      });

      return NextResponse.json(
        { error: '決済処理に失敗しました。もう一度お試しください。' },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Update payment status with Stripe information
    await prisma.$transaction([
      prisma.facilityPayment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: 'completed',
          paymentMethod: 'stripe',
          stripePaymentIntentId,
          stripeChargeId,
          paidAt: now,
        },
      }),
      // Update facility campaign status to approved
      prisma.facilityCampaign.update({
        where: { id: payment.facilityCampaignId },
        data: {
          status: 'approved',
        },
      }),
    ]);

    // Create notification for manufacturer
    const campaign = await prisma.campaign.findUnique({
      where: { id: payment.facilityCampaign.campaignId },
      include: {
        manufacturer: true,
      },
    });

    if (campaign) {
      await prisma.notification.create({
        data: {
          userId: campaign.manufacturer.userId,
          type: 'payment_received',
          title: '支払いが完了しました',
          message: `${facility.facilityName}から「${campaign.name}」の支払いが完了しました。`,
          relatedResourceType: 'facility_payment',
          relatedResourceId: paymentId,
        },
      });
    }

    return NextResponse.json(
      { 
        success: true,
        message: '支払いが完了しました',
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: '支払い処理に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
