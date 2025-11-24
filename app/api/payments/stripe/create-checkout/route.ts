import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe, formatAmountForStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: '請求書IDが必要です' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get invoice with items
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        invoiceItems: true,
        manufacturer: {
          select: {
            companyName: true,
            email: true,
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

    // Check if already paid
    if (invoice.paymentStatus === 'completed') {
      return NextResponse.json(
        { error: 'この請求書は既に支払い済みです' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify user is manufacturer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { manufacturer: true }
    });

    if (!user || !user.manufacturer || user.manufacturer.id !== invoice.manufacturerId) {
      return NextResponse.json(
        { error: 'この請求書にアクセスする権限がありません' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = invoice.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: invoice.manufacturer.companyName,
        metadata: {
          manufacturerId: invoice.manufacturerId,
          invoiceId: invoice.id,
        }
      });
      stripeCustomerId = customer.id;
      
      // Update invoice with customer ID
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { stripeCustomerId }
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card', 'konbini'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `請求書 #${invoice.invoiceNumber}`,
              description: `請求期間: ${new Date(invoice.billingPeriodStart).toLocaleDateString('ja-JP')} 〜 ${new Date(invoice.billingPeriodEnd).toLocaleDateString('ja-JP')}`,
            },
            unit_amount: formatAmountForStripe(invoice.total, invoice.currency),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/manufacturer/invoices/${invoiceId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/manufacturer/invoices/${invoiceId}?payment=cancelled`,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        manufacturerId: invoice.manufacturerId,
      },
      payment_intent_data: {
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        }
      }
    });

    // Update invoice with checkout session ID
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        stripeCheckoutSessionId: session.id,
        paymentMethod: 'stripe',
        paymentStatus: 'processing',
      }
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.total,
        currency: invoice.currency,
        paymentMethod: 'stripe',
        paymentStatus: 'processing',
        metadata: JSON.stringify({
          checkoutSessionId: session.id,
        })
      }
    });

    console.log(`✅ Created Stripe checkout session for invoice ${invoice.invoiceNumber}`);

    return NextResponse.json(
      { 
        sessionId: session.id,
        url: session.url,
        message: 'Stripe決済ページを作成しました'
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Stripe決済ページの作成に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
