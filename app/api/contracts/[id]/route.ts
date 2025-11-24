import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/contracts/[id] - Get contract details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        manufacturer: true,
        facility: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get contract with access control
    const where: any = { id };

    if (user.role === 'manufacturer' && user.manufacturer) {
      where.manufacturerId = user.manufacturer.id;
    } else if (user.role === 'facility' && user.facility) {
      where.facilityId = user.facility.id;
    }
    // Admin can see all contracts (no additional where clause)

    const contract = await prisma.contract.findFirst({
      where,
      include: {
        manufacturer: {
          select: {
            companyName: true,
          },
        },
        facility: {
          select: {
            facilityName: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return NextResponse.json(
      { contract },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Contract retrieval error:', error);
    return NextResponse.json(
      { error: '契約の取得に失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
