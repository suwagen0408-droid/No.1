import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminEmail = 'admin@essc.local';
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      role: 'admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  console.log('✅ Admin user created:', {
    email: adminEmail,
    password: 'admin123',
  });

  // Create sample manufacturer
  const manufacturerEmail = 'manufacturer@example.com';
  const manufacturerPassword = await bcrypt.hash('password123', 12);

  const manufacturerUser = await prisma.user.upsert({
    where: { email: manufacturerEmail },
    update: {},
    create: {
      email: manufacturerEmail,
      passwordHash: manufacturerPassword,
      role: 'manufacturer',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.manufacturer.upsert({
    where: { userId: manufacturerUser.id },
    update: {},
    create: {
      userId: manufacturerUser.id,
      companyName: 'サンプル株式会社',
      companyNameKana: 'サンプルカブシキガイシャ',
      representativeName: '山田太郎',
      address: '東京都渋谷区◯◯1-2-3',
      phone: '03-1234-5678',
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
  });

  console.log('✅ Sample manufacturer created:', {
    email: manufacturerEmail,
    password: 'password123',
  });

  // Create sample facility
  const facilityEmail = 'facility@example.com';
  const facilityPassword = await bcrypt.hash('password123', 12);

  const facilityUser = await prisma.user.upsert({
    where: { email: facilityEmail },
    update: {},
    create: {
      email: facilityEmail,
      passwordHash: facilityPassword,
      role: 'facility',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.facility.upsert({
    where: { userId: facilityUser.id },
    update: {},
    create: {
      userId: facilityUser.id,
      facilityName: 'サンプルホテル',
      facilityNameKana: 'サンプルホテル',
      facilityType: 'hotel',
      address: '東京都新宿区◯◯2-3-4',
      phone: '03-2345-6789',
      totalRooms: 100,
      avgDailyGuests: 150,
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
  });

  console.log('✅ Sample facility created:', {
    email: facilityEmail,
    password: 'password123',
  });

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Login credentials:');
  console.log('--------------------------------------------------');
  console.log('Admin:');
  console.log('  Email: admin@essc.local');
  console.log('  Password: admin123');
  console.log('\nManufacturer:');
  console.log('  Email: manufacturer@example.com');
  console.log('  Password: password123');
  console.log('\nFacility:');
  console.log('  Email: facility@example.com');
  console.log('  Password: password123');
  console.log('--------------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
