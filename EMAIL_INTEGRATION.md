# Email Notification System Integration Guide

## 📧 Overview

The ESSC Platform includes a comprehensive email notification system with:

- **Mock Implementation**: Works out of the box for development/demo
- **Production Ready**: Easy migration to Resend, SendGrid, or Nodemailer
- **User Preferences**: Respects per-user notification settings
- **Email Templates**: Professional HTML templates in Japanese
- **Digest System**: Daily/weekly notification digests
- **Event-Specific Controls**: Granular control over notification types

## 🎯 Current Features

### ✅ Implemented Email Notifications

1. **Password Change Confirmation**
   - Sent when user changes password
   - Security alert with next steps
   - Template: `getPasswordChangeEmailTemplate()`

2. **Password Reset Request**
   - Sent when user requests password reset
   - Includes secure reset link with 1-hour expiry
   - Template: `getPasswordResetEmailTemplate()`

3. **Invoice Issued**
   - Sent when monthly invoice is generated
   - Includes invoice details and payment info
   - Template: `getInvoiceIssuedEmailTemplate()`

4. **Notification Digests**
   - Daily digest (at user's preferred time)
   - Weekly digest (on user's preferred day)
   - Template: `getNotificationDigestEmailTemplate()`

### Email API Endpoints

- `POST /api/notifications/send-email` - Send email based on user preferences
  - Checks user's notification preferences
  - Validates notification type permissions
  - Uses appropriate template
  - Returns success/failure status

### Batch Scripts

- `scripts/send-notification-digests.ts` - Send daily/weekly digests
  - Usage: `npx ts-node scripts/send-notification-digests.ts --type=daily`
  - Usage: `npx ts-node scripts/send-notification-digests.ts --type=weekly`
  - Checks user preferences for digest time/day
  - Batches notifications from specified period

- `scripts/generate-monthly-invoices.ts` - Generate invoices with email notifications
  - Sends invoice email to each facility
  - Includes invoice details and payment instructions

## 🔧 Mock Implementation (Current)

### How It Works

The current implementation uses a **mock email service** (`lib/email.ts`):

```typescript
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  console.log('📧 [MOCK] Sending email:', {
    to: options.to,
    subject: options.subject,
  });

  // Simulates network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Returns mock success
  return {
    success: true,
    messageId: `mock-${Date.now()}-${Math.random()}`,
  };
}
```

**Benefits:**
- ✅ No external dependencies required
- ✅ Works immediately in development
- ✅ No API keys needed
- ✅ Safe for testing without sending real emails
- ✅ Console logs show what would be sent

**Limitations:**
- ❌ No actual emails sent
- ❌ Cannot test email delivery
- ❌ No real message IDs

## 🚀 Production Migration Options

### Option 1: Resend (Recommended)

**Best For**: Modern applications, startups, easy integration

#### Installation

```bash
npm install resend
```

#### Environment Variables

```env
RESEND_API_KEY=re_123456789
```

#### Code Changes

Replace `lib/email.ts` `sendEmail` function:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || 'ESSC Platform <noreply@essc.co.jp>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('Email send exception:', error);
    return { success: false, error: error.message };
  }
}
```

#### Domain Setup

1. Go to https://resend.com
2. Add and verify your domain (e.g., `essc.co.jp`)
3. Add DNS records (SPF, DKIM)
4. Update `from` addresses in code

#### Pricing

- Free: 100 emails/day
- Paid: $20/month for 50,000 emails

---

### Option 2: SendGrid

**Best For**: Enterprise applications, high volume

#### Installation

```bash
npm install @sendgrid/mail
```

#### Environment Variables

```env
SENDGRID_API_KEY=SG.123456789
```

#### Code Changes

Replace `lib/email.ts` `sendEmail` function:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const [response] = await sgMail.send({
      to: options.to,
      from: options.from || 'noreply@essc.co.jp',
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return {
      success: true,
      messageId: response.headers['x-message-id'],
    };
  } catch (error: any) {
    console.error('SendGrid error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
```

#### Domain Setup

1. Go to https://sendgrid.com
2. Verify sender identity
3. Add domain authentication (CNAME records)
4. Configure IP warming for high volume

#### Pricing

- Free: 100 emails/day
- Essentials: $19.95/month for 50,000 emails
- Enterprise: Custom pricing

---

### Option 3: Nodemailer (Self-Hosted SMTP)

**Best For**: Self-hosted solutions, existing email infrastructure

#### Installation

```bash
npm install nodemailer
```

#### Environment Variables

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@essc.co.jp
```

#### Code Changes

Replace `lib/email.ts` `sendEmail` function:

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const info = await transporter.sendMail({
      from: options.from || process.env.SMTP_FROM || 'noreply@essc.co.jp',
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('SMTP error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
```

#### SMTP Setup

**Gmail Example:**
1. Enable 2-factor authentication
2. Generate App Password
3. Use app password as `SMTP_PASSWORD`

**Custom SMTP:**
- Use your own SMTP server
- Configure firewall rules
- Set up SPF/DKIM records

---

## 📅 Scheduling Email Digests

### Using Cron Jobs (Linux/macOS)

Edit crontab:
```bash
crontab -e
```

Add schedules:
```bash
# Daily digest at 9:00 AM
0 9 * * * cd /path/to/essc-platform && npx ts-node scripts/send-notification-digests.ts --type=daily >> /var/log/essc-digests.log 2>&1

# Weekly digest on Monday at 9:00 AM
0 9 * * 1 cd /path/to/essc-platform && npx ts-node scripts/send-notification-digests.ts --type=weekly >> /var/log/essc-digests.log 2>&1

# Monthly invoices on 1st of month at 1:00 AM
0 1 1 * * cd /path/to/essc-platform && npx ts-node scripts/generate-monthly-invoices.ts >> /var/log/essc-invoices.log 2>&1
```

### Using PM2 (Node.js Process Manager)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'daily-digest',
      script: 'npx',
      args: 'ts-node scripts/send-notification-digests.ts --type=daily',
      cron_restart: '0 9 * * *', // Daily at 9 AM
      autorestart: false,
    },
    {
      name: 'weekly-digest',
      script: 'npx',
      args: 'ts-node scripts/send-notification-digests.ts --type=weekly',
      cron_restart: '0 9 * * 1', // Monday at 9 AM
      autorestart: false,
    },
    {
      name: 'monthly-invoices',
      script: 'npx',
      args: 'ts-node scripts/generate-monthly-invoices.ts',
      cron_restart: '0 1 1 * *', // 1st of month at 1 AM
      autorestart: false,
    },
  ],
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enable on system boot
```

### Using Cloud Schedulers

**Vercel Cron:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/monthly-invoices",
      "schedule": "0 1 1 * *"
    }
  ]
}
```

**AWS EventBridge / GCP Cloud Scheduler:**
- Create scheduled events
- Point to API endpoints or Lambda functions
- Use authentication headers

---

## 🎨 Email Templates

All email templates are defined in `lib/email.ts`:

### Available Templates

1. **Password Change** - `getPasswordChangeEmailTemplate(userName)`
2. **Password Reset** - `getPasswordResetEmailTemplate(userName, resetLink)`
3. **Invoice Issued** - `getInvoiceIssuedEmailTemplate(facilityName, invoiceNumber, total, dueDate, invoiceUrl)`
4. **Notification Digest** - `getNotificationDigestEmailTemplate(userName, notifications[], periodType)`

### Customization

Edit templates in `lib/email.ts` to match your branding:

```typescript
export function getPasswordChangeEmailTemplate(userName: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    /* Add your custom styles here */
  </style>
</head>
<body>
  <!-- Your custom template HTML -->
</body>
</html>
  `;
}
```

**Tips:**
- Keep HTML simple (not all email clients support complex CSS)
- Use inline styles for better compatibility
- Test in multiple email clients
- Include plain text version for accessibility

---

## 📊 User Notification Preferences

Users can control notifications at:
- `/dashboard/settings/notifications`

### Preference Schema

```prisma
model NotificationPreference {
  id                              String   @id @default(cuid())
  userId                          String   @unique
  user                            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Master toggles
  emailNotifications              Boolean  @default(true)
  pushNotifications               Boolean  @default(false)
  
  // Email notification types
  emailCampaignNotifications      Boolean  @default(true)
  emailApplicationNotifications   Boolean  @default(true)
  emailMessageNotifications       Boolean  @default(true)
  emailReviewNotifications        Boolean  @default(true)
  emailPaymentNotifications       Boolean  @default(true)
  
  // Digest settings
  dailyDigest                     Boolean  @default(false)
  dailyDigestTime                 String?  // "09:00"
  weeklyDigest                    Boolean  @default(false)
  weeklyDigestDay                 String?  // "1" for Monday
  
  createdAt                       DateTime @default(now())
  updatedAt                       DateTime @updatedAt
}
```

### Preference Checking

The system automatically checks preferences before sending:

```typescript
// In /api/notifications/send-email
const preference = user.notificationPreference;
if (!preference || !preference.emailNotifications) {
  // Don't send
}

const shouldSend = checkNotificationTypeEnabled(preference, type);
if (!shouldSend) {
  // Don't send
}
```

---

## 🔐 Security Best Practices

### Email Content

- ✅ Never include passwords in emails
- ✅ Use secure, time-limited reset links
- ✅ Include warning messages for security-related actions
- ✅ Add contact information for suspicious activity

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// Example with upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 emails per hour
});

// In send-email API
const { success } = await ratelimit.limit(`email:${userId}`);
if (!success) {
  return NextResponse.json({ error: 'Too many emails' }, { status: 429 });
}
```

### SPF/DKIM/DMARC

Configure email authentication to prevent spoofing:

**SPF Record:**
```
v=spf1 include:_spf.resend.com ~all
```

**DKIM:**
- Generated by email provider
- Add DKIM TXT records to DNS

**DMARC:**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@essc.co.jp
```

---

## 🧪 Testing Email Integration

### Development Testing

Use **Mailhog** or **MailCatcher** for local testing:

```bash
# Install Mailhog
brew install mailhog  # macOS
# or use Docker
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Configure Nodemailer
SMTP_HOST=localhost
SMTP_PORT=1025
```

View emails at `http://localhost:8025`

### Staging Testing

Use **Mailtrap** for staging:

1. Sign up at https://mailtrap.io
2. Get SMTP credentials
3. Configure in `.env.staging`

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASSWORD=your-mailtrap-password
```

### Production Testing

- Send test emails to your own address
- Check spam folder
- Verify formatting in multiple clients:
  - Gmail
  - Outlook
  - Apple Mail
  - Mobile clients

---

## 📈 Monitoring & Logging

### Email Delivery Logs

```typescript
// In lib/email.ts
console.log('📧 Email sent:', {
  to: options.to,
  subject: options.subject,
  messageId: result.messageId,
  timestamp: new Date().toISOString(),
});
```

### Metrics to Track

- Email send rate
- Delivery rate
- Bounce rate
- Open rate (if using tracking pixels)
- Click rate (for links)
- Unsubscribe rate

### Error Handling

```typescript
try {
  const result = await sendEmail(options);
  if (!result.success) {
    // Log failure but don't throw
    console.error('Email failed:', result.error);
    // Optionally queue for retry
  }
} catch (error) {
  // Network or system error
  console.error('Email exception:', error);
  // Alert ops team
}
```

---

## 🎯 Migration Checklist

- [ ] Choose email provider (Resend/SendGrid/Nodemailer)
- [ ] Install required npm packages
- [ ] Set up environment variables
- [ ] Update `lib/email.ts` with production code
- [ ] Configure domain/sender verification
- [ ] Set up SPF/DKIM/DMARC records
- [ ] Test email delivery in staging
- [ ] Set up cron jobs or schedulers
- [ ] Configure monitoring and alerts
- [ ] Test digest system
- [ ] Verify user preferences work correctly
- [ ] Load test email system
- [ ] Document any custom templates
- [ ] Train team on email system

---

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [SendGrid Documentation](https://docs.sendgrid.com)
- [Nodemailer Documentation](https://nodemailer.com)
- [Email on Acid](https://www.emailonacid.com) - Email testing tool
- [Litmus](https://www.litmus.com) - Email testing and analytics

---

**Implemented by**: Claude Code Agent  
**Date**: 2024-11-18  
**Status**: ✅ Ready for Production Migration
