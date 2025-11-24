/**
 * Email Service Utility
 * 
 * MOCK implementation for demo purposes
 * 
 * Production Options:
 * 1. Resend (Recommended for modern apps):
 *    npm install resend
 *    Documentation: https://resend.com/docs
 * 
 * 2. SendGrid (Enterprise option):
 *    npm install @sendgrid/mail
 *    Documentation: https://docs.sendgrid.com
 * 
 * 3. Nodemailer (Self-hosted SMTP):
 *    npm install nodemailer
 *    Documentation: https://nodemailer.com
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Mock email sender
 * In production, replace with actual email service
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  console.log('📧 [MOCK] Sending email:', {
    to: options.to,
    subject: options.subject,
    from: options.from || 'noreply@essc.co.jp',
  });

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock success
  return {
    success: true,
    messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
}

/**
 * Production Implementation with Resend:
 * 
 * ```typescript
 * import { Resend } from 'resend';
 * 
 * const resend = new Resend(process.env.RESEND_API_KEY);
 * 
 * export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
 *   try {
 *     const { data, error } = await resend.emails.send({
 *       from: options.from || 'ESSC Platform <noreply@essc.co.jp>',
 *       to: options.to,
 *       subject: options.subject,
 *       html: options.html,
 *       text: options.text,
 *       reply_to: options.replyTo,
 *     });
 * 
 *     if (error) {
 *       console.error('Email send error:', error);
 *       return { success: false, error: error.message };
 *     }
 * 
 *     return { success: true, messageId: data.id };
 *   } catch (error: any) {
 *     console.error('Email send exception:', error);
 *     return { success: false, error: error.message };
 *   }
 * }
 * ```
 */

/**
 * Email Templates
 */

export function getPasswordChangeEmailTemplate(userName: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>パスワード変更完了</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">ESSC Platform</h1>
  </div>
  
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1e40af;">パスワード変更完了</h2>
    
    <p>こんにちは、${userName}様</p>
    
    <p>お客様のアカウントのパスワードが正常に変更されました。</p>
    
    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
      <strong>重要:</strong> このパスワード変更にお心当たりがない場合は、すぐにサポートチームまでご連絡ください。
    </div>
    
    <p>セキュリティを保つために:</p>
    <ul>
      <li>パスワードは定期的に変更してください</li>
      <li>推測されやすいパスワードは使用しないでください</li>
      <li>複数のサービスで同じパスワードを使い回さないでください</li>
    </ul>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px;">
      このメールに心当たりがない場合は、<a href="mailto:support@essc.co.jp" style="color: #2563eb;">support@essc.co.jp</a>までご連絡ください。
    </p>
    
    <p style="color: #6b7280; font-size: 14px;">
      ESSC株式会社<br>
      〒100-0001 東京都千代田区○○ 1-2-3
    </p>
  </div>
</body>
</html>
  `;
}

export function getPasswordResetEmailTemplate(
  userName: string,
  resetLink: string
): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>パスワードリセット</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">ESSC Platform</h1>
  </div>
  
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1e40af;">パスワードリセットのご依頼</h2>
    
    <p>こんにちは、${userName}様</p>
    
    <p>パスワードリセットのご依頼を承りました。下記のボタンをクリックして、新しいパスワードを設定してください。</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        パスワードをリセット
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      または、下記のリンクをコピーしてブラウザに貼り付けてください:<br>
      <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
    </p>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
      <strong>注意:</strong> このリンクの有効期限は1時間です。
    </div>
    
    <p>このパスワードリセットにお心当たりがない場合は、このメールを無視してください。</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px;">
      ESSC株式会社<br>
      〒100-0001 東京都千代田区○○ 1-2-3<br>
      <a href="mailto:support@essc.co.jp" style="color: #2563eb;">support@essc.co.jp</a>
    </p>
  </div>
</body>
</html>
  `;
}

export function getInvoiceIssuedEmailTemplate(
  facilityName: string,
  invoiceNumber: string,
  total: number,
  dueDate: string,
  invoiceUrl: string
): string {
  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>請求書発行のお知らせ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">ESSC Platform</h1>
  </div>
  
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1e40af;">請求書発行のお知らせ</h2>
    
    <p>こんにちは、${facilityName}様</p>
    
    <p>以下の請求書を発行いたしました。</p>
    
    <div style="background-color: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">請求書番号</td>
          <td style="padding: 8px 0; font-weight: bold; text-align: right;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">請求金額</td>
          <td style="padding: 8px 0; font-weight: bold; font-size: 20px; color: #2563eb; text-align: right;">
            ${formatCurrency(total)}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">支払期限</td>
          <td style="padding: 8px 0; font-weight: bold; text-align: right;">${formatDate(dueDate)}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${invoiceUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        請求書を確認
      </a>
    </div>
    
    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
      <strong>お支払い方法:</strong><br>
      支払期限までに下記口座へお振込みください。<br><br>
      <strong>銀行名:</strong> ○○銀行<br>
      <strong>支店名:</strong> △△支店<br>
      <strong>口座種別:</strong> 普通<br>
      <strong>口座番号:</strong> 1234567<br>
      <strong>口座名義:</strong> ESSC株式会社
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px;">
      ご不明な点がございましたら、お気軽にお問い合わせください。<br>
      <a href="mailto:billing@essc.co.jp" style="color: #2563eb;">billing@essc.co.jp</a>
    </p>
    
    <p style="color: #6b7280; font-size: 14px;">
      ESSC株式会社<br>
      〒100-0001 東京都千代田区○○ 1-2-3
    </p>
  </div>
</body>
</html>
  `;
}

export function getNotificationDigestEmailTemplate(
  userName: string,
  notifications: Array<{
    type: string;
    message: string;
    createdAt: string;
  }>,
  periodType: 'daily' | 'weekly'
): string {
  const periodLabel = periodType === 'daily' ? '本日' : '今週';

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>通知ダイジェスト</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">ESSC Platform</h1>
  </div>
  
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1e40af;">${periodLabel}の通知ダイジェスト</h2>
    
    <p>こんにちは、${userName}様</p>
    
    <p>${periodLabel}の通知をまとめてお届けします。（${notifications.length}件）</p>
    
    <div style="margin: 20px 0;">
      ${notifications
        .map(
          (notif) => `
        <div style="background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 10px; border-radius: 4px;">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e40af;">${getNotificationTypeLabel(notif.type)}</p>
          <p style="margin: 0 0 5px 0;">${notif.message}</p>
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            ${new Date(notif.createdAt).toLocaleString('ja-JP')}
          </p>
        </div>
      `
        )
        .join('')}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        ダッシュボードを見る
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px;">
      通知設定は<a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/settings/notifications" style="color: #2563eb;">こちら</a>から変更できます。
    </p>
    
    <p style="color: #6b7280; font-size: 14px;">
      ESSC株式会社<br>
      〒100-0001 東京都千代田区○○ 1-2-3
    </p>
  </div>
</body>
</html>
  `;
}

function getNotificationTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    campaign_approved: '✅ キャンペーン承認',
    campaign_rejected: '❌ キャンペーン却下',
    application_received: '📨 応募受信',
    application_approved: '✅ 応募承認',
    application_rejected: '❌ 応募却下',
    payment_completed: '💳 支払い完了',
    invoice_issued: '📄 請求書発行',
    review_received: '⭐ レビュー受信',
    password_changed: '🔐 パスワード変更',
    account_approved: '✅ アカウント承認',
    account_rejected: '❌ アカウント却下',
  };
  return typeMap[type] || '📢 通知';
}
