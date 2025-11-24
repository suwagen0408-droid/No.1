import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoiceHTML, InvoiceData } from '@/lib/pdf-generator';

/**
 * GET /api/facility/invoices/[id]/pdf
 * Generate and return invoice PDF (HTML for demo)
 */
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
        { status: 401 }
      );
    }

    // Get user with facility relationship
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { facility: true },
    });

    if (!user || user.role !== 'facility' || !user.facility) {
      return NextResponse.json(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    // Fetch invoice with items
    const invoice = await prisma.facilityInvoice.findFirst({
      where: {
        id,
        facilityId: user.facility.id,
      },
      include: {
        facility: {
          select: {
            facilityName: true,
          },
        },
        items: {
          include: {
            campaign: {
              select: {
                name: true,
                manufacturer: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404 }
      );
    }

    // Transform invoice data to PDF format
    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      facilityName: invoice.facility.facilityName,
      billingPeriodStart: invoice.billingPeriodStart.toISOString(),
      billingPeriodEnd: invoice.billingPeriodEnd.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      issuedAt: invoice.issuedAt.toISOString(),
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
      subtotal: invoice.subtotal,
      shippingFee: invoice.shippingFee,
      tax: invoice.tax,
      total: invoice.total,
    };

    // Generate HTML (or PDF in production)
    const htmlContent = generateInvoiceHTML(invoiceData);

    // Return HTML with proper content type
    // In production with puppeteer, this would return PDF:
    // return new NextResponse(pdfBuffer, {
    //   headers: {
    //     'Content-Type': 'application/pdf',
    //     'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    //   },
    // });

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate invoice PDF:', error);
    return NextResponse.json(
      { error: '請求書PDFの生成に失敗しました' },
      { status: 500 }
    );
  }
}
