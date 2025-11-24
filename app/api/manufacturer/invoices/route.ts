import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  billingPeriodStart: z.string(),
  billingPeriodEnd: z.string(),
  items: z.array(z.object({
    itemType: z.string(),
    description: z.string(),
    campaignId: z.string().optional(),
    facilityId: z.string().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })),
});

// GET /api/manufacturer/invoices - Get manufacturer's invoices
export async function GET(request: NextRequest) {
  try {
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

    // Get invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        manufacturerId: manufacturer.id,
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      { invoices },
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

// POST /api/manufacturer/invoices - Create a new invoice
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
    
    // Validate input
    const validation = createInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { billingPeriodStart, billingPeriodEnd, items } = validation.data;

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

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = Math.floor(subtotal * 0.1); // 10% tax
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceCount = await prisma.invoice.count({
      where: { manufacturerId: manufacturer.id },
    });
    const invoiceNumber = `INV-${manufacturer.id.slice(0, 8).toUpperCase()}-${String(invoiceCount + 1).padStart(4, '0')}`;

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        manufacturerId: manufacturer.id,
        invoiceNumber,
        billingPeriodStart: new Date(billingPeriodStart),
        billingPeriodEnd: new Date(billingPeriodEnd),
        subtotal,
        tax,
        total,
        status: 'draft',
        invoiceItems: {
          create: items.map(item => ({
            itemType: item.itemType,
            description: item.description,
            campaignId: item.campaignId,
            facilityId: item.facilityId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        invoiceItems: true,
      },
    });

    return NextResponse.json(
      {
        message: '請求書を作成しました',
        invoice,
      },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('請求書作成エラー:', error);
    return NextResponse.json(
      { error: '請求書の作成に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
