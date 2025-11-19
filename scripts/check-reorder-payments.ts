import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReorderPayments() {
  console.log('=== Checking Reorder Requests and Payments ===\n');

  // Check approved reorders
  const approvedReorders = await prisma.reorderRequest.findMany({
    where: { status: 'approved' },
    include: {
      campaign: {
        select: {
          name: true,
          paymentTiming: true,
          costModel: true,
        },
      },
      facility: {
        select: {
          facilityName: true,
        },
      },
      product: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${approvedReorders.length} approved reorder requests:\n`);

  for (const reorder of approvedReorders) {
    console.log(`ID: ${reorder.id}`);
    console.log(`Facility: ${reorder.facility.facilityName}`);
    console.log(`Product: ${reorder.product.name}`);
    console.log(`Campaign: ${reorder.campaign.name}`);
    console.log(`Payment Timing: ${reorder.campaign.paymentTiming}`);
    console.log(`Cost Model: ${reorder.campaign.costModel}`);
    console.log(`Unit Cost: ¥${reorder.unitCost || 0}`);
    console.log(`Shipping Cost: ¥${reorder.shippingCost || 0}`);
    console.log(`Total Cost: ¥${reorder.totalCost || 0}`);
    console.log(`Approved At: ${reorder.approvedAt?.toISOString()}`);
    console.log('---\n');
  }

  // Check facility payments
  console.log('\n=== Checking Facility Payments ===\n');
  
  const facilityPayments = await prisma.facilityPayment.findMany({
    where: { paymentStatus: 'pending' },
    include: {
      facility: {
        select: {
          facilityName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${facilityPayments.length} pending facility payments:\n`);

  for (const payment of facilityPayments) {
    console.log(`ID: ${payment.id}`);
    console.log(`Facility: ${payment.facility.facilityName}`);
    console.log(`Amount: ¥${payment.amount}`);
    console.log(`Shipping Fee: ¥${payment.shippingFee || 0}`);
    console.log(`Total Amount: ¥${payment.totalAmount}`);
    console.log(`Payment Status: ${payment.paymentStatus}`);
    console.log(`Created At: ${payment.createdAt.toISOString()}`);
    console.log('---\n');
  }

  // Check campaigns to see their payment settings
  console.log('\n=== Checking Campaign Payment Settings ===\n');
  
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'active',
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      paymentTiming: true,
      costModel: true,
      unitPrice: true,
      shippingFee: true,
      shippingCostCoveredBy: true,
    },
  });

  console.log(`Found ${campaigns.length} active campaigns:\n`);

  for (const campaign of campaigns) {
    console.log(`ID: ${campaign.id}`);
    console.log(`Name: ${campaign.name}`);
    console.log(`Payment Timing: ${campaign.paymentTiming}`);
    console.log(`Cost Model: ${campaign.costModel}`);
    console.log(`Unit Price: ¥${campaign.unitPrice || 'N/A'}`);
    console.log(`Shipping Fee: ¥${campaign.shippingFee || 'N/A'}`);
    console.log(`Shipping Cost Covered By: ${campaign.shippingCostCoveredBy || 'N/A'}`);
    console.log('---\n');
  }

  await prisma.$disconnect();
}

checkReorderPayments()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
