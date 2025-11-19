#!/usr/bin/env ts-node
/**
 * Monthly Invoice Generation Batch Script
 * 
 * This script generates invoices for all facilities using the "invoice_later" payment model.
 * Should be run monthly (via cron job or scheduler).
 * 
 * Usage:
 *   npx ts-node scripts/generate-monthly-invoices.ts [--year YYYY] [--month MM]
 * 
 * If year/month not provided, generates invoices for the previous month.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface InvoiceItem {
  facilityId: string;
  facilityName: string;
  campaignId: string;
  campaignName: string;
  units: number;
  unitPrice: number;
  amount: number;
  shippingFee: number;
}

async function generateMonthlyInvoices(year: number, month: number) {
  console.log(`\n🗓️  Generating invoices for ${year}-${String(month).padStart(2, '0')}...\n`);

  const startDate = new Date(year, month - 1, 1); // First day of month
  const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

  console.log(`📅 Period: ${startDate.toLocaleDateString('ja-JP')} - ${endDate.toLocaleDateString('ja-JP')}`);

  try {
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
            manufacturer: {
              select: {
                id: true,
                companyName: true,
                userId: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(`📊 Found ${facilityCampaigns.length} invoice_later transactions`);

    // Find all approved reorder requests with invoice_later payment in the period
    const reorderRequests = await prisma.reorderRequest.findMany({
      where: {
        status: {
          in: ['approved', 'shipped', 'delivered'],
        },
        campaign: {
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
          },
        },
        product: {
          select: {
            name: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`📦 Found ${reorderRequests.length} reorder requests\n`);

    if (facilityCampaigns.length === 0 && reorderRequests.length === 0) {
      console.log('✅ No invoices to generate for this period.');
      return;
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
        facilityName: fc.facility.facilityName,
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

    // Add reorder requests to invoice items
    for (const reorder of reorderRequests) {
      const facilityId = reorder.facilityId;
      const unitPrice = reorder.unitCost || 0;
      const units = reorder.approvedUnits || reorder.requestedUnits;
      const amount = unitPrice * units;
      const shippingFee = reorder.shippingCost || 0;

      const item: InvoiceItem = {
        facilityId,
        facilityName: reorder.facility.facilityName,
        campaignId: reorder.campaign.id,
        campaignName: `【追加発注】${reorder.product.name}`,
        units,
        unitPrice,
        amount,
        shippingFee,
      };

      if (!facilitiesMap.has(facilityId)) {
        facilitiesMap.set(facilityId, []);
      }
      facilitiesMap.get(facilityId)!.push(item);
    }

    console.log(`🏢 Generating invoices for ${facilitiesMap.size} facilities...\n`);

    let invoiceCount = 0;

    for (const [facilityId, items] of facilitiesMap.entries()) {
      const invoiceNumber = `INV-F-${year}${String(month).padStart(2, '0')}-${String(invoiceCount + 1).padStart(5, '0')}`;

      console.log(`📄 Creating invoice ${invoiceNumber} for ${items[0].facilityName}...`);

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const totalShipping = items.reduce((sum, item) => sum + item.shippingFee, 0);
      const tax = 0; // Tax calculation can be added later
      const grandTotal = subtotal + totalShipping + tax;

      console.log(`   Subtotal: ¥${subtotal.toLocaleString()}`);
      console.log(`   Shipping: ¥${totalShipping.toLocaleString()}`);
      console.log(`   Total: ¥${grandTotal.toLocaleString()} (${items.length} items)`);

      // Create FacilityInvoice
      const invoice = await prisma.facilityInvoice.create({
        data: {
          facilityId,
          invoiceNumber,
          billingPeriodStart: startDate,
          billingPeriodEnd: endDate,
          subtotal: subtotal,
          tax: tax,
          total: grandTotal,
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

        // Add shipping fee as separate item if applicable
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

      // Get facility user ID
      const facility = await prisma.facility.findUnique({
        where: { id: facilityId },
        select: { userId: true },
      });

      if (!facility) {
        console.log(`   ⚠️  Warning: Facility ${facilityId} not found, skipping notification`);
        continue;
      }

      // Create notification for facility
      await prisma.notification.create({
        data: {
          userId: facility.userId,
          type: 'invoice_issued',
          title: '請求書が発行されました',
          message: `${year}年${month}月分の請求書（${invoiceNumber}）が発行されました。金額: ¥${grandTotal.toLocaleString()}`,
          relatedResourceType: 'FacilityInvoice',
          relatedResourceId: invoice.id,
        },
      });

      // Send email notification (using fetch to call internal API)
      try {
        const emailResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: facility.userId,
            type: 'invoice_issued',
            subject: '請求書発行のお知らせ',
            templateData: {
              invoiceNumber,
              total: grandTotal,
              dueDate: new Date(year, month, 20).toISOString(),
              invoiceUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/facility/invoices`,
            },
          }),
        });

        if (emailResponse.ok) {
          console.log(`   📧 Email notification sent`);
        } else {
          console.log(`   ⚠️  Email notification failed (will retry from digest)`);
        }
      } catch (emailError) {
        console.log(`   ⚠️  Email notification error:`, emailError);
      }

      invoiceCount++;
      console.log(`   ✅ Invoice created successfully`);
    }

    console.log(`\n✅ Generated ${invoiceCount} invoices successfully!`);
    console.log(`📧 Email notifications sent to facilities\n`);

  } catch (error) {
    console.error('❌ Error generating invoices:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let targetYear: number;
let targetMonth: number;

if (args.includes('--year') && args.includes('--month')) {
  const yearIndex = args.indexOf('--year');
  const monthIndex = args.indexOf('--month');
  targetYear = parseInt(args[yearIndex + 1]);
  targetMonth = parseInt(args[monthIndex + 1]);
} else {
  // Default to previous month
  const now = new Date();
  targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  targetMonth = now.getMonth() === 0 ? 12 : now.getMonth();
}

console.log('📦 Monthly Invoice Generation Script');
console.log('=====================================');

generateMonthlyInvoices(targetYear, targetMonth)
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
