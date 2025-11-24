import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('=== Checking existing data ===\n');

    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
    console.log('Users:', users.length);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ID: ${user.id}`);
    });

    // Check manufacturers
    const manufacturers = await prisma.manufacturer.findMany({
      select: {
        id: true,
        userId: true,
        companyName: true,
      },
    });
    console.log('\nManufacturers:', manufacturers.length);
    manufacturers.forEach(mfr => {
      console.log(`  - ${mfr.companyName} - ID: ${mfr.id}, UserID: ${mfr.userId}`);
    });

    // Check facilities
    const facilities = await prisma.facility.findMany({
      select: {
        id: true,
        userId: true,
        facilityName: true,
      },
    });
    console.log('\nFacilities:', facilities.length);
    facilities.forEach(fac => {
      console.log(`  - ${fac.facilityName} - ID: ${fac.id}, UserID: ${fac.userId}`);
    });

    // Check contracts
    const contracts = await prisma.contract.count();
    console.log('\nContracts:', contracts);

    // Check facility invoices
    const facilityInvoices = await prisma.facilityInvoice.count();
    console.log('Facility Invoices:', facilityInvoices);

    // Check manufacturer invoices
    const invoices = await prisma.invoice.count();
    console.log('Manufacturer Invoices:', invoices);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
