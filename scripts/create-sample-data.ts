import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSampleData() {
  try {
    console.log('=== Creating sample data ===\n');

    // Get existing data
    const manufacturer1 = await prisma.manufacturer.findFirst({
      where: { companyName: 'サンプル株式会社' },
    });
    const manufacturer2 = await prisma.manufacturer.findFirst({
      where: { companyName: '株式会社ESSC' },
    });
    const facility1 = await prisma.facility.findFirst({
      where: { facilityName: 'サンプルホテル' },
    });
    const facility2 = await prisma.facility.findFirst({
      where: { facilityName: 'ホテルESSC' },
    });
    const facility3 = await prisma.facility.findFirst({
      where: { facilityName: 'ホテルはあ' },
    });

    if (!manufacturer1 || !manufacturer2 || !facility1 || !facility2 || !facility3) {
      console.error('Required data not found');
      return;
    }

    console.log('Found required data:');
    console.log(`  Manufacturer 1: ${manufacturer1.companyName}`);
    console.log(`  Manufacturer 2: ${manufacturer2.companyName}`);
    console.log(`  Facility 1: ${facility1.facilityName}`);
    console.log(`  Facility 2: ${facility2.facilityName}`);
    console.log(`  Facility 3: ${facility3.facilityName}\n`);

    // Create Contracts
    console.log('Creating contracts...');
    
    const contract1 = await prisma.contract.create({
      data: {
        contractNumber: 'CONTRACT-2025-00001',
        manufacturerId: manufacturer1.id,
        facilityId: facility1.id,
        title: '製品配置契約 - サンプルホテル',
        description: 'サンプル株式会社とサンプルホテルの製品配置に関する契約',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        autoRenew: true,
        renewalPeriod: 12,
        monthlyFee: 50000,
        setupFee: 100000,
        currency: 'JPY',
        status: 'active',
        paymentTerms: '月末締め翌月末払い',
        deliveryTerms: '契約後2週間以内に初回配送',
        terms: '本契約は製品の配置とメンテナンスに関する基本契約です。',
      },
    });
    console.log(`  Created contract: ${contract1.contractNumber}`);

    const contract2 = await prisma.contract.create({
      data: {
        contractNumber: 'CONTRACT-2025-00002',
        manufacturerId: manufacturer2.id,
        facilityId: facility2.id,
        title: '製品配置契約 - ホテルESSC',
        description: '株式会社ESScとホテルESScの製品配置に関する契約',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2026-01-31'),
        autoRenew: false,
        monthlyFee: 75000,
        setupFee: 150000,
        currency: 'JPY',
        status: 'active',
        paymentTerms: '月末締め翌月20日払い',
        deliveryTerms: '契約後1週間以内に初回配送',
        terms: '本契約は製品の配置、メンテナンス、及びマーケティング支援に関する契約です。',
      },
    });
    console.log(`  Created contract: ${contract2.contractNumber}`);

    const contract3 = await prisma.contract.create({
      data: {
        contractNumber: 'CONTRACT-2025-00003',
        manufacturerId: manufacturer1.id,
        facilityId: facility3.id,
        title: '製品配置契約 - ホテルはあ',
        description: 'サンプル株式会社とホテルはあの製品配置に関する契約',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-11-30'),
        autoRenew: true,
        renewalPeriod: 12,
        monthlyFee: 40000,
        currency: 'JPY',
        status: 'active',
        paymentTerms: '月末締め翌月末払い',
        terms: '本契約は製品の配置に関する基本契約です。',
      },
    });
    console.log(`  Created contract: ${contract3.contractNumber}\n`);

    // Create Facility Invoices
    console.log('Creating facility invoices...');
    
    const facilityInvoice1 = await prisma.facilityInvoice.create({
      data: {
        facilityId: facility1.id,
        invoiceNumber: 'FINV-2025-0001',
        billingPeriodStart: new Date('2025-01-01'),
        billingPeriodEnd: new Date('2025-01-31'),
        subtotal: 50000,
        tax: 5000,
        total: 55000,
        currency: 'JPY',
        status: 'issued',
        issuedAt: new Date('2025-02-01'),
        dueDate: new Date('2025-02-28'),
        paymentStatus: 'pending',
        notes: '2025年1月分の月額料金',
        facilityInvoiceItems: {
          create: [
            {
              itemType: 'monthly_fee',
              description: '月額基本料金',
              quantity: 1,
              unitPrice: 50000,
              amount: 50000,
            },
          ],
        },
      },
    });
    console.log(`  Created facility invoice: ${facilityInvoice1.invoiceNumber}`);

    const facilityInvoice2 = await prisma.facilityInvoice.create({
      data: {
        facilityId: facility2.id,
        invoiceNumber: 'FINV-2025-0002',
        billingPeriodStart: new Date('2025-02-01'),
        billingPeriodEnd: new Date('2025-02-28'),
        subtotal: 75000,
        tax: 7500,
        total: 82500,
        currency: 'JPY',
        status: 'paid',
        issuedAt: new Date('2025-03-01'),
        dueDate: new Date('2025-03-20'),
        paidAt: new Date('2025-03-15'),
        paymentMethod: 'bank_transfer',
        paymentStatus: 'completed',
        notes: '2025年2月分の月額料金',
        facilityInvoiceItems: {
          create: [
            {
              itemType: 'monthly_fee',
              description: '月額基本料金',
              quantity: 1,
              unitPrice: 75000,
              amount: 75000,
            },
          ],
        },
      },
    });
    console.log(`  Created facility invoice: ${facilityInvoice2.invoiceNumber}`);

    const facilityInvoice3 = await prisma.facilityInvoice.create({
      data: {
        facilityId: facility1.id,
        invoiceNumber: 'FINV-2025-0003',
        billingPeriodStart: new Date('2025-02-01'),
        billingPeriodEnd: new Date('2025-02-28'),
        subtotal: 50000,
        tax: 5000,
        total: 55000,
        currency: 'JPY',
        status: 'overdue',
        issuedAt: new Date('2025-03-01'),
        dueDate: new Date('2025-03-31'),
        paymentStatus: 'pending',
        notes: '2025年2月分の月額料金 - 支払期限超過',
        facilityInvoiceItems: {
          create: [
            {
              itemType: 'monthly_fee',
              description: '月額基本料金',
              quantity: 1,
              unitPrice: 50000,
              amount: 50000,
            },
          ],
        },
      },
    });
    console.log(`  Created facility invoice: ${facilityInvoice3.invoiceNumber}\n`);

    // Create Manufacturer Invoices
    console.log('Creating manufacturer invoices...');
    
    const invoice1 = await prisma.invoice.create({
      data: {
        manufacturerId: manufacturer1.id,
        invoiceNumber: 'INV-SAMPLE-0001',
        billingPeriodStart: new Date('2025-01-01'),
        billingPeriodEnd: new Date('2025-01-31'),
        subtotal: 150000,
        tax: 15000,
        total: 165000,
        currency: 'JPY',
        status: 'issued',
        issuedAt: new Date('2025-02-01'),
        dueDate: new Date('2025-02-28'),
        paymentStatus: 'pending',
        invoiceItems: {
          create: [
            {
              itemType: 'product_placement',
              description: '製品配置料金',
              quantity: 3,
              unitPrice: 50000,
              amount: 150000,
              facilityId: facility1.id,
            },
          ],
        },
      },
    });
    console.log(`  Created manufacturer invoice: ${invoice1.invoiceNumber}`);

    const invoice2 = await prisma.invoice.create({
      data: {
        manufacturerId: manufacturer2.id,
        invoiceNumber: 'INV-ESSC-0001',
        billingPeriodStart: new Date('2025-02-01'),
        billingPeriodEnd: new Date('2025-02-28'),
        subtotal: 200000,
        tax: 20000,
        total: 220000,
        currency: 'JPY',
        status: 'paid',
        issuedAt: new Date('2025-03-01'),
        dueDate: new Date('2025-03-20'),
        paidAt: new Date('2025-03-18'),
        paymentMethod: 'stripe',
        paymentStatus: 'completed',
        invoiceItems: {
          create: [
            {
              itemType: 'product_placement',
              description: '製品配置料金',
              quantity: 4,
              unitPrice: 50000,
              amount: 200000,
              facilityId: facility2.id,
            },
          ],
        },
      },
    });
    console.log(`  Created manufacturer invoice: ${invoice2.invoiceNumber}\n`);

    console.log('✅ Sample data created successfully!');
    console.log('\nSummary:');
    console.log(`  - Contracts: 3`);
    console.log(`  - Facility Invoices: 3`);
    console.log(`  - Manufacturer Invoices: 2`);

  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData();
