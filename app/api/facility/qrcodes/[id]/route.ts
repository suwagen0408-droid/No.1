import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/facility/qrcodes/[id] - Toggle QR code active status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const { isActive } = await request.json();

    // Verify QR code belongs to this facility
    const qrCode = await prisma.qrCode.findFirst({
      where: {
        id: params.id,
        facilityProductPlacement: {
          facilityCampaign: {
            facilityId: facility.id,
          },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code not found or not authorized' },
        { status: 403 }
      );
    }

    const updatedQrCode = await prisma.qrCode.update({
      where: { id: params.id },
      data: { isActive },
    });

    return NextResponse.json({
      qrCode: updatedQrCode,
      message: `QR code ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error updating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to update QR code' },
      { status: 500 }
    );
  }
}

// DELETE /api/facility/qrcodes/[id] - Delete QR code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const facility = await prisma.facility.findUnique({
      where: { userId },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    // Verify QR code belongs to this facility
    const qrCode = await prisma.qrCode.findFirst({
      where: {
        id: params.id,
        facilityProductPlacement: {
          facilityCampaign: {
            facilityId: facility.id,
          },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code not found or not authorized' },
        { status: 403 }
      );
    }

    await prisma.qrCode.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'QR code deleted successfully' });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    return NextResponse.json(
      { error: 'Failed to delete QR code' },
      { status: 500 }
    );
  }
}
