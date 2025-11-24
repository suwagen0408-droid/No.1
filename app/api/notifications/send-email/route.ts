import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sendEmail,
  getPasswordChangeEmailTemplate,
  getPasswordResetEmailTemplate,
  getInvoiceIssuedEmailTemplate,
} from '@/lib/email';

/**
 * POST /api/notifications/send-email
 * Send email notification based on user preferences
 * 
 * This is an internal API used by other services
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      type,
      subject,
      templateData,
    } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'userId and type are required' },
        { status: 400 }
      );
    }

    // Get user and their notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        notificationPreference: true,
        manufacturer: true,
        facility: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has email notifications enabled for this type
    const preference = user.notificationPreference;
    if (!preference || !preference.emailNotifications) {
      return NextResponse.json({
        success: false,
        message: 'Email notifications are disabled',
      });
    }

    // Check specific notification type preferences
    const shouldSend = checkNotificationTypeEnabled(preference, type);
    if (!shouldSend) {
      return NextResponse.json({
        success: false,
        message: `Email notifications for type "${type}" are disabled`,
      });
    }

    // Generate email content based on type
    let htmlContent: string;
    let emailSubject: string = subject;

    const userName =
      user.manufacturer?.companyName ||
      user.facility?.facilityName ||
      user.email;

    switch (type) {
      case 'password_changed':
        htmlContent = getPasswordChangeEmailTemplate(userName);
        emailSubject = emailSubject || 'パスワード変更完了のお知らせ';
        break;

      case 'password_reset':
        htmlContent = getPasswordResetEmailTemplate(
          userName,
          templateData.resetLink
        );
        emailSubject = emailSubject || 'パスワードリセットのご依頼';
        break;

      case 'invoice_issued':
        htmlContent = getInvoiceIssuedEmailTemplate(
          userName,
          templateData.invoiceNumber,
          templateData.total,
          templateData.dueDate,
          templateData.invoiceUrl
        );
        emailSubject = emailSubject || '請求書発行のお知らせ';
        break;

      default:
        // Generic notification email
        htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">ESSC Platform</h1>
  </div>
  
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1e40af;">${emailSubject}</h2>
    
    <p>こんにちは、${userName}様</p>
    
    <p>${templateData.message || '新しい通知があります。'}</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        詳細を確認
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px;">
      ESSC株式会社<br>
      〒100-0001 東京都千代田区○○ 1-2-3
    </p>
  </div>
</body>
</html>
        `;
    }

    // Send email
    const result = await sendEmail({
      to: user.email,
      subject: emailSubject,
      html: htmlContent,
    });

    if (result.success) {
      console.log('✅ Email sent successfully:', result.messageId);
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      console.error('❌ Email send failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email send exception:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Check if notification type is enabled in user preferences
 */
function checkNotificationTypeEnabled(
  preference: any,
  notificationType: string
): boolean {
  // Map notification types to preference fields
  const typeMap: Record<string, string> = {
    campaign_approved: 'emailCampaignNotifications',
    campaign_rejected: 'emailCampaignNotifications',
    campaign_created: 'emailCampaignNotifications',
    application_received: 'emailApplicationNotifications',
    application_approved: 'emailApplicationNotifications',
    application_rejected: 'emailApplicationNotifications',
    message_received: 'emailMessageNotifications',
    review_received: 'emailReviewNotifications',
    payment_completed: 'emailPaymentNotifications',
    invoice_issued: 'emailPaymentNotifications',
    password_changed: 'emailNotifications', // Always check main toggle
    password_reset: 'emailNotifications', // Always check main toggle
  };

  const preferenceField = typeMap[notificationType];
  if (!preferenceField) {
    // If type not mapped, default to enabled
    return true;
  }

  return preference[preferenceField] === true;
}
