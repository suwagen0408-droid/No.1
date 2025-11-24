import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface InvoiceItem {
  facilityId: string;
  facilityUserId: string;
  facilityName: string;
  facilityEmail: string;
  campaignId: string;
  campaignName: string;
  units: number;
  unitPrice: number;
  amount: number;
  shippingFee: number;
}

// POST /api/admin/billing/generate-invoices - Manually trigger invoice generation
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const body = await request.json();
    const { year, month } = body;

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: '有効な年月を指定してください' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    console.log(`🗓️  Generating invoices for ${year}-${String(month).padStart(2, '0')}...`);

    // Find all completed/active campaigns with invoice_later payment model in the period
    const facilityCampaigns = await prisma.facilityCampaign.findMany({
      where: {
        status: {
          in: ['approved', 'active', 'completed'],
        },
        campaign: {
          costModel: 'invoice_later',
          paymentTiming: 'monthly_invoice',
        },
        approvedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        facility: {
          select: {
            id: true,
            facilityName: true,
            userId: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            unitPrice: true,
            shippingFee: true,
            shippingCostCoveredBy: true,
          },
        },
      },
    });

    if (facilityCampaigns.length === 0) {
      return NextResponse.json(
        {
          message: 'この期間の請求対象がありません',
          invoiceCount: 0,
        },
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Group by facility
    const facilitiesMap = new Map<string, InvoiceItem[]>();

    for (const fc of facilityCampaigns) {
      const facilityId = fc.facilityId;
      const unitPrice = fc.campaign.unitPrice || 0;
      const amount = unitPrice * fc.approvedUnits;
      const shippingFee = fc.campaign.shippingCostCoveredBy === 'facility' ? (fc.campaign.shippingFee || 0) : 0;

      const item: InvoiceItem = {
        facilityId,
        facilityUserId: fc.facility.userId,
        facilityName: fc.facility.facilityName,
        facilityEmail: fc.facility.user.email,
        campaignId: fc.campaign.id,
        campaignName: fc.campaign.name,
        units: fc.approvedUnits,
        unitPrice,
        amount,
        shippingFee,
      };

      if (!facilitiesMap.has(facilityId)) {
        facilitiesMap.set(facilityId, []);
      }
      facilitiesMap.get(facilityId)!.push(item);
    }

    let invoiceCount = 0;
    const invoices = [];

    for (const [facilityId, items] of facilitiesMap.entries()) {
      const totalAmount = items.reduce((sum, item) => sum + item.amount + item.shippingFee, 0);
      const invoiceNumber = `INV-F-${year}${String(month).padStart(2, '0')}-${String(invoiceCount + 1).padStart(5, '0')}`;

      // Create FacilityInvoice
      const invoice = await prisma.facilityInvoice.create({
        data: {
          facilityId,
          invoiceNumber,
          billingPeriodStart: startDate,
          billingPeriodEnd: endDate,
          subtotal: items.reduce((sum, item) => sum + item.amount, 0),
          shippingFee: items.reduce((sum, item) => sum + item.shippingFee, 0),
          tax: 0,
          total: totalAmount,
          status: 'issued',
          issuedAt: new Date(),
          dueDate: new Date(year, month, 20), // Due on 20th of next month
        },
      });

      // Create invoice items
      for (const item of items) {
        await prisma.facilityInvoiceItem.create({
          data: {
            facilityInvoiceId: invoice.id,
            itemType: 'campaign',
            description: `${item.campaignName} (${item.units}ユニット @ ¥${item.unitPrice})`,
            campaignId: item.campaignId,
            quantity: item.units,
            unitPrice: item.unitPrice,
            amount: item.amount,
          },
        });

        if (item.shippingFee > 0) {
          await prisma.facilityInvoiceItem.create({
            data: {
              facilityInvoiceId: invoice.id,
              itemType: 'shipping',
              description: `配送料 - ${item.campaignName}`,
              campaignId: item.campaignId,
              quantity: 1,
              unitPrice: item.shippingFee,
              amount: item.shippingFee,
            },
          });
        }
      }

      // Create notification
      await prisma.notification.create({
        data: {
          userId: items[0].facilityUserId,
          type: 'invoice_issued',
          title: '請求書が発行されました',
          message: `${year}年${month}月分の請求書（${invoiceNumber}）が発行されました。金額: ¥${totalAmount.toLocaleString()}`,
          relatedResourceType: 'FacilityInvoice',
          relatedResourceId: invoice.id,
        },
      });

      invoiceCount++;
      invoices.push({
        invoiceNumber,
        facilityName: items[0].facilityName,
        totalAmount,
      });

      console.log(`✅ Invoice ${invoiceNumber} created for ${items[0].facilityName}`);
    }

    return NextResponse.json(
      {
        message: `${invoiceCount}件の請求書を生成しました`,
        invoiceCount,
        period: `${year}年${month}月`,
        invoices,
      },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Error generating invoices:', error);
    return NextResponse.json(
      { error: '請求書の生成に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
