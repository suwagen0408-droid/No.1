import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find facility user
  const facilityUser = await prisma.user.findFirst({
    where: { email: 'suwagen0408@gmail.com' }
  });
  
  if (!facilityUser) {
    console.log('User not found');
    return;
  }
  
  console.log('User found:', {
    id: facilityUser.id,
    email: facilityUser.email,
    role: facilityUser.role,
  });
  
  // Get facility
  const facility = await prisma.facility.findUnique({
    where: { userId: facilityUser.id }
  });
  
  if (!facility) {
    console.log('Facility not found for user');
    return;
  }
  
  console.log('Facility found:', {
    id: facility.id,
    facilityName: facility.facilityName,
  });
  
  // Get collaborations
  const collaborations = await prisma.facilityCampaign.findMany({
    where: {
      facilityId: facility.id,
      status: {
        in: ['approved', 'active', 'completed'],
      },
    },
    include: {
      campaign: {
        include: {
          manufacturer: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });
  
  console.log('\nCollaborations:', collaborations.length);
  
  collaborations.forEach(collab => {
    console.log(`- ${collab.campaign.manufacturer.companyName} (userId: ${collab.campaign.manufacturer.userId}, status: ${collab.status})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
