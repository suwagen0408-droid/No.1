import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const contractSchema = z.object({
  manufacturerId: z.string().uuid(),
  facilityId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  autoRenew: z.boolean().default(false),
  renewalPeriod: z.number().int().optional(),
  monthlyFee: z.number().optional(),
  setupFee: z.number().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
});

// GET /api/contracts - Get contracts
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { manufacturer: true, facility: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: any = { deletedAt: null };

    if (user.role === 'manufacturer' && user.manufacturer) {
      where.manufacturerId = user.manufacturer.id;
    } else if (user.role === 'facility' && user.facility) {
      where.facilityId = user.facility.id;
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        manufacturer: { select: { companyName: true } },
        facility: { select: { facilityName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ contracts });
  } catch (error) {
    console.error('Contracts retrieval error:', error);
    return NextResponse.json({ error: 'Failed to retrieve contracts' }, { status: 500 });
  }
}

// POST /api/contracts - Create contract
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = contractSchema.parse(body);

    // Generate contract number
    const count = await prisma.contract.count();
    const contractNumber = `CONTRACT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const contract = await prisma.contract.create({
      data: {
        ...validatedData,
        contractNumber,
        status: 'draft',
      },
      include: {
        manufacturer: { select: { companyName: true } },
        facility: { select: { facilityName: true } },
      },
    });

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Contract creation error:', error);
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }
}
