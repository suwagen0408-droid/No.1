import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for existing data...');
  
  // Get a manufacturer
  const manufacturer = await prisma.manufacturer.findFirst();
  if (!manufacturer) {
    console.log('No manufacturer found. Please create a manufacturer first.');
    return;
  }
  console.log('Found manufacturer:', manufacturer.companyName);
  
  // Get a facility
  const facility = await prisma.facility.findFirst();
  if (!facility) {
    console.log('No facility found. Please create a facility first.');
    return;
  }
  console.log('Found facility:', facility.facilityName);
  
  // Get manufacturer's campaign
  let campaign = await prisma.campaign.findFirst({
    where: { manufacturerId: manufacturer.id }
  });
  
  if (!campaign) {
    console.log('Creating a test campaign...');
    campaign = await prisma.campaign.create({
      data: {
        manufacturerId: manufacturer.id,
        name: 'テストキャンペーン',
        description: 'コラボレーションテスト用',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        totalUnits: 100,
        maxUnitsPerFacility: 10,
      }
    });
    console.log('Created campaign:', campaign.name);
  } else {
    console.log('Found campaign:', campaign.name);
  }
  
  // Check if facility campaign exists
  const existingFC = await prisma.facilityCampaign.findFirst({
    where: {
      facilityId: facility.id,
      campaignId: campaign.id,
    }
  });
  
  if (!existingFC) {
    console.log('Creating facility campaign collaboration...');
    await prisma.facilityCampaign.create({
      data: {
        facilityId: facility.id,
        campaignId: campaign.id,
        status: 'approved',
        requestedUnits: 5,
        approvedUnits: 5,
        approvedAt: new Date(),
      }
    });
    console.log('Created facility campaign collaboration');
  } else {
    console.log('Facility campaign already exists with status:', existingFC.status);
    
    // Update to approved if not already
    if (existingFC.status !== 'approved') {
      await prisma.facilityCampaign.update({
        where: { id: existingFC.id },
        data: { status: 'approved' }
      });
      console.log('Updated status to approved');
    }
  }
  
  // Check the collaboration
  const collaborations = await prisma.facilityCampaign.findMany({
    where: {
      status: { in: ['approved', 'active', 'completed'] }
    },
    include: {
      facility: true,
      campaign: {
        include: {
          manufacturer: true
        }
      }
    }
  });
  
  console.log('\n=== Current Collaborations ===');
  collaborations.forEach(c => {
    console.log(`${c.facility.facilityName} <-> ${c.campaign.manufacturer.companyName} (${c.status})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
