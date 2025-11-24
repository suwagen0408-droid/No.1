import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const formData = await request.formData();
    const invoiceId = formData.get('invoiceId') as string;
    const transferDate = formData.get('transferDate') as string;
    const transferNote = formData.get('transferNote') as string;
    const proofFile = formData.get('proofFile') as File;

    if (!invoiceId || !transferDate || !proofFile) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        manufacturer: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Verify user is manufacturer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { manufacturer: true }
    });

    if (!user || !user.manufacturer || user.manufacturer.id !== invoice.manufacturerId) {
      return NextResponse.json(
        { error: 'この請求書にアクセスする権限がありません' },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Check if already paid
    if (invoice.paymentStatus === 'completed') {
      return NextResponse.json(
        { error: 'この請求書は既に支払い済みです' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Save file
    const bytes = await proofFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'payment-proofs');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const fileExt = proofFile.name.split('.').pop();
    const fileName = `proof_${invoiceId}_${Date.now()}.${fileExt}`;
    const filePath = join(uploadDir, fileName);
    const publicUrl = `/uploads/payment-proofs/${fileName}`;

    await writeFile(filePath, buffer);

    // Update invoice
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentMethod: 'bank_transfer',
        paymentStatus: 'processing',
        bankTransferProof: publicUrl,
        bankTransferDate: new Date(transferDate),
        bankTransferNote: transferNote || null,
      }
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: invoice.total,
        currency: invoice.currency,
        paymentMethod: 'bank_transfer',
        paymentStatus: 'processing',
        transferProofUrl: publicUrl,
        transferDate: new Date(transferDate),
        transferNote: transferNote || null,
      }
    });

    // Get all admin users for notification
    const admins = await prisma.user.findMany({
      where: { role: 'admin' }
    });

    // Notify admins to verify payment
    const notificationPromises = admins.map(admin =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'payment_verification_required',
          title: '支払い確認が必要です',
          message: `${invoice.manufacturer.companyName} から請求書 #${invoice.invoiceNumber} の振込証明が提出されました。確認をお願いします。`,
          relatedResourceType: 'Invoice',
          relatedResourceId: invoiceId,
        }
      })
    );

    await Promise.all(notificationPromises);

    // Notify manufacturer
    await prisma.notification.create({
      data: {
        userId: invoice.manufacturer.userId,
        type: 'payment_proof_submitted',
        title: '振込証明を提出しました',
        message: `請求書 #${invoice.invoiceNumber} の振込証明を提出しました。管理者による確認をお待ちください。`,
        relatedResourceType: 'Invoice',
        relatedResourceId: invoiceId,
      }
    });

    console.log(`📄 Bank transfer proof uploaded for invoice ${invoice.invoiceNumber}`);
    console.log(`📢 Notified ${admins.length} admins for verification`);

    return NextResponse.json(
      {
        message: '振込証明を提出しました。管理者による確認をお待ちください。',
        proofUrl: publicUrl,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error) {
    console.error('Bank transfer proof upload error:', error);
    return NextResponse.json(
      { error: '振込証明のアップロードに失敗しました' },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
