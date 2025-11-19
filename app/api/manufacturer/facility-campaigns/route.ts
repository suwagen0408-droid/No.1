import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const approvalSchema = z.object({
  facilityCampaignId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  approvedUnits: z.number().int().min(1).optional(),
  rejectionReason: z.string().optional(),
});

// GET /api/manufacturer/facility-campaigns - Get facility campaign applications
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const url = new URL(request.url);
    const campaignId = url.searchParams.get('campaignId');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    const where: any = {
      campaign: {
        manufacturerId: manufacturer.id,
        deletedAt: null,
      },
    };

    if (campaignId) {
      where.campaignId = campaignId;
    }

    const applications = await prisma.facilityCampaign.findMany({
      where,
      include: {
        facility: {
          select: {
            id: true,
            facilityName: true,
            facilityType: true,
            address: true,
            avgMonthlyGuests: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            maxUnitsPerFacility: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching facility campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST /api/manufacturer/facility-campaigns - Approve or reject application
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { userId },
    });

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = approvalSchema.parse(body);

    // Verify facility campaign belongs to manufacturer's campaign
    const facilityCampaign = await prisma.facilityCampaign.findUnique({
      where: { id: validatedData.facilityCampaignId },
      include: {
        campaign: true,
        facility: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (
      !facilityCampaign ||
      facilityCampaign.campaign.manufacturerId !== manufacturer.id
    ) {
      return NextResponse.json(
        { error: 'Application not found or not authorized' },
        { status: 403 }
      );
    }

    if (facilityCampaign.status !== 'pending') {
      return NextResponse.json(
        { error: 'Application has already been processed' },
        { status: 400 }
      );
    }

    if (validatedData.action === 'approve') {
      // Approve application
      const approvedUnits =
        validatedData.approvedUnits || facilityCampaign.requestedUnits;

      // Check if approved units exceed campaign max
      if (
        facilityCampaign.campaign.maxUnitsPerFacility &&
        approvedUnits > facilityCampaign.campaign.maxUnitsPerFacility
      ) {
        return NextResponse.json(
          { error: 'Approved units exceed maximum per facility' },
          { status: 400 }
        );
      }

      // Determine status based on payment model
      let newStatus: 'approved' | 'pending_payment' = 'approved';
      const campaign = facilityCampaign.campaign;
      
      // Phase 1: Handle payment models
      if (campaign.costModel === 'free' || campaign.paymentTiming === 'none') {
        // Free campaign - no payment required
        newStatus = 'approved';
      } else if (campaign.paymentTiming === 'on_approval') {
        // Paid sampling - requires immediate payment
        newStatus = 'pending_payment';
        
        // Create payment record and invoice for facility
        if (campaign.unitPrice) {
          const amount = campaign.unitPrice * approvedUnits;
          const shippingFee = campaign.shippingCostCoveredBy === 'facility' ? (campaign.shippingFee || 0) : 0;
          const totalAmount = amount + shippingFee;
          
          await prisma.facilityPayment.create({
            data: {
              facilityId: facilityCampaign.facilityId,
              facilityCampaignId: facilityCampaign.id,
              amount,
              shippingFee,
              totalAmount,
              paymentMethod: 'stripe', // Default, can be changed by facility
              paymentStatus: 'pending',
            },
          });

          // Create facility invoice for immediate payment
          const invoiceCount = await prisma.facilityInvoice.count({
            where: { facilityId: facilityCampaign.facilityId },
          });
          const invoiceNumber = `FINV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;
          
          const subtotal = totalAmount;
          const tax = Math.floor(subtotal * 0.1);
          const total = subtotal + tax;

          await prisma.facilityInvoice.create({
            data: {
              facilityId: facilityCampaign.facilityId,
              invoiceNumber,
              billingPeriodStart: new Date(),
              billingPeriodEnd: new Date(),
              subtotal,
              tax,
              total,
              currency: 'JPY',
              status: 'issued',
              issuedAt: new Date(),
              dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
              paymentStatus: 'pending',
              notes: `キャンペーン承認: ${campaign.name} (${approvedUnits}個)`,
              facilityInvoiceItems: {
                create: [
                  {
                    itemType: 'campaign',
                    description: `${campaign.name} - 商品配置`,
                    quantity: approvedUnits,
                    unitPrice: campaign.unitPrice,
                    amount,
                  },
                  ...(shippingFee > 0 ? [{
                    itemType: 'shipping',
                    description: '配送料',
                    quantity: 1,
                    unitPrice: shippingFee,
                    amount: shippingFee,
                  }] : []),
                ],
              },
            },
          });
        }
      } else if (campaign.paymentTiming === 'monthly_invoice') {
        // Monthly invoice - approve now, bill later
        newStatus = 'approved';
        // Note: Invoice will be generated at end of month by batch process
      }

      await prisma.facilityCampaign.update({
        where: { id: validatedData.facilityCampaignId },
        data: {
          status: newStatus,
          approvedUnits,
          approvedAt: new Date(),
          approvedBy: userId,
        },
      });

      // Create notification for facility
      await prisma.notification.create({
        data: {
          userId: facilityCampaign.facility.userId,
          type: 'facility_campaign_approved',
          title: 'キャンペーン応募が承認されました',
          message: `「${facilityCampaign.campaign.name}」への応募が承認されました。承認数量: ${approvedUnits}個`,
          relatedResourceType: 'facility_campaign',
          relatedResourceId: facilityCampaign.id,
        },
      });
    } else {
      // Reject application
      await prisma.facilityCampaign.update({
        where: { id: validatedData.facilityCampaignId },
        data: {
          status: 'rejected',
          rejectionReason: validatedData.rejectionReason,
          approvedAt: new Date(), // Using this for rejected_at too
          approvedBy: userId,
        },
      });

      // Create notification for facility
      await prisma.notification.create({
        data: {
          userId: facilityCampaign.facility.userId,
          type: 'facility_campaign_rejected',
          title: 'キャンペーン応募が却下されました',
          message: `「${facilityCampaign.campaign.name}」への応募が却下されました。${
            validatedData.rejectionReason
              ? `理由: ${validatedData.rejectionReason}`
              : ''
          }`,
          relatedResourceType: 'facility_campaign',
          relatedResourceId: facilityCampaign.id,
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action:
          validatedData.action === 'approve'
            ? 'APPROVE_FACILITY_CAMPAIGN'
            : 'REJECT_FACILITY_CAMPAIGN',
        resourceType: 'facility_campaign',
        resourceId: facilityCampaign.id,
        oldValues: JSON.stringify({ status: facilityCampaign.status }),
        newValues: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json({
      message: `Application ${validatedData.action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error processing facility campaign:', error);
    return NextResponse.json(
      { error: 'Failed to process application' },
      { status: 500 }
    );
  }
}
