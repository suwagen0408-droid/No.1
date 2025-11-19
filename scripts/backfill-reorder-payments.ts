import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillReorderPayments() {
  console.log('=== Backfilling Missing Reorder Payments ===\n');

  // Find approved reorders with costs but no payment records
  const approvedReorders = await prisma.reorderRequest.findMany({
    where: {
      status: 'approved',
      totalCost: {
        gt: 0,
      },
    },
    include: {
      campaign: {
        select: {
          paymentTiming: true,
        },
      },
      facilityProductPlacement: {
        select: {
          facilityCampaignId: true,
        },
      },
    },
  });

  console.log(`Found ${approvedReorders.length} approved reorders with costs\n`);

  let created = 0;
  let skipped = 0;

  for (const reorder of approvedReorders) {
    // Check if payment record already exists
    const existingPayment = await prisma.facilityPayment.findFirst({
      where: {
        facilityId: reorder.facilityId,
        facilityCampaignId: reorder.facilityProductPlacement.facilityCampaignId,
        amount: reorder.unitCost || 0,
        totalAmount: reorder.totalCost || 0,
        createdAt: {
          gte: new Date(reorder.approvedAt!.getTime() - 60000), // Within 1 minute of approval
          lte: new Date(reorder.approvedAt!.getTime() + 60000),
        },
      },
    });

    if (existingPayment) {
      console.log(`Skipping reorder ${reorder.id} - payment already exists`);
      skipped++;
      continue;
    }

    // Only create payment for on_approval or none with cost
    if (reorder.campaign.paymentTiming === 'on_approval' || 
        (reorder.campaign.paymentTiming === 'none' && reorder.totalCost && reorder.totalCost > 0)) {
      
      console.log(`Creating payment for reorder ${reorder.id}`);
      console.log(`  Facility: ${reorder.facilityId}`);
      console.log(`  Amount: ¥${reorder.unitCost || 0}`);
      console.log(`  Shipping: ¥${reorder.shippingCost || 0}`);
      console.log(`  Total: ¥${reorder.totalCost || 0}`);

      await prisma.facilityPayment.create({
        data: {
          facilityId: reorder.facilityId,
          facilityCampaignId: reorder.facilityProductPlacement.facilityCampaignId,
          amount: reorder.unitCost || 0,
          shippingFee: reorder.shippingCost || 0,
          totalAmount: reorder.totalCost || 0,
          currency: 'JPY',
          paymentMethod: 'pending',
          paymentStatus: 'pending',
          createdAt: reorder.approvedAt || new Date(),
          updatedAt: new Date(),
        },
      });

      created++;
      console.log(`  ✅ Payment record created\n`);
    } else {
      console.log(`Skipping reorder ${reorder.id} - payment timing is ${reorder.campaign.paymentTiming}\n`);
      skipped++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${approvedReorders.length}`);

  await prisma.$disconnect();
}

backfillReorderPayments()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
