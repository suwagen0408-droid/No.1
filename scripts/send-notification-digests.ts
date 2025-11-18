/**
 * Send Notification Digests
 * 
 * This script sends daily or weekly notification digests to users
 * based on their notification preferences.
 * 
 * Usage:
 *   npx ts-node scripts/send-notification-digests.ts --type daily
 *   npx ts-node scripts/send-notification-digests.ts --type weekly
 * 
 * Schedule with cron:
 *   # Daily at 9:00 AM
 *   0 9 * * * cd /path/to/app && npx ts-node scripts/send-notification-digests.ts --type daily
 * 
 *   # Weekly on Monday at 9:00 AM
 *   0 9 * * 1 cd /path/to/app && npx ts-node scripts/send-notification-digests.ts --type weekly
 */

import { PrismaClient } from '@prisma/client';
import { sendEmail, getNotificationDigestEmailTemplate } from '../lib/email';

const prisma = new PrismaClient();

interface DigestOptions {
  type: 'daily' | 'weekly';
}

async function sendNotificationDigests(options: DigestOptions) {
  console.log(`📧 Starting ${options.type} notification digest...`);

  try {
    // Calculate time range
    const now = new Date();
    const startDate = new Date();

    if (options.type === 'daily') {
      // Last 24 hours
      startDate.setDate(startDate.getDate() - 1);
    } else {
      // Last 7 days
      startDate.setDate(startDate.getDate() - 7);
    }

    console.log(`📅 Time range: ${startDate.toISOString()} to ${now.toISOString()}`);

    // Get all users with digest enabled
    const users = await prisma.user.findMany({
      where: {
        notificationPreference: {
          emailNotifications: true,
          OR:
            options.type === 'daily'
              ? [{ dailyDigest: true }]
              : [{ weeklyDigest: true }],
        },
      },
      include: {
        notificationPreference: true,
        manufacturer: true,
        facility: true,
        notifications: {
          where: {
            createdAt: {
              gte: startDate,
              lte: now,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    console.log(`👥 Found ${users.length} users with ${options.type} digest enabled`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const user of users) {
      // Skip if no notifications
      if (user.notifications.length === 0) {
        console.log(`⏭️  Skipping ${user.email} - no notifications`);
        continue;
      }

      // Check time preferences
      if (options.type === 'daily') {
        const preference = user.notificationPreference;
        if (preference?.dailyDigestTime) {
          const preferredHour = parseInt(preference.dailyDigestTime.split(':')[0]);
          const currentHour = now.getHours();
          
          // Only send within 1 hour of preferred time
          if (Math.abs(currentHour - preferredHour) > 1) {
            console.log(
              `⏰ Skipping ${user.email} - preferred time ${preference.dailyDigestTime}, current ${currentHour}:00`
            );
            continue;
          }
        }
      } else if (options.type === 'weekly') {
        const preference = user.notificationPreference;
        if (preference?.weeklyDigestDay) {
          const preferredDay = parseInt(preference.weeklyDigestDay);
          const currentDay = now.getDay();
          
          // Only send on preferred day
          if (currentDay !== preferredDay) {
            console.log(
              `📆 Skipping ${user.email} - preferred day ${preferredDay}, current ${currentDay}`
            );
            continue;
          }
        }
      }

      // Get user name
      const userName =
        user.manufacturer?.companyName ||
        user.facility?.facilityName ||
        user.email;

      // Generate digest email
      const htmlContent = getNotificationDigestEmailTemplate(
        userName,
        user.notifications.map((notif) => ({
          type: notif.type,
          message: notif.message,
          createdAt: notif.createdAt.toISOString(),
        })),
        options.type
      );

      const subject =
        options.type === 'daily'
          ? `【ESSC】本日の通知ダイジェスト (${user.notifications.length}件)`
          : `【ESSC】今週の通知ダイジェスト (${user.notifications.length}件)`;

      // Send email
      try {
        const result = await sendEmail({
          to: user.email,
          subject,
          html: htmlContent,
        });

        if (result.success) {
          console.log(`✅ Sent digest to ${user.email} (${user.notifications.length} notifications)`);
          emailsSent++;
        } else {
          console.error(`❌ Failed to send digest to ${user.email}:`, result.error);
          emailsFailed++;
        }
      } catch (error: any) {
        console.error(`❌ Exception sending digest to ${user.email}:`, error.message);
        emailsFailed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Emails sent: ${emailsSent}`);
    console.log(`  ❌ Emails failed: ${emailsFailed}`);
    console.log(`  ⏭️  Users skipped: ${users.length - emailsSent - emailsFailed}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const typeArg = args.find((arg) => arg.startsWith('--type='));
const type = typeArg ? typeArg.split('=')[1] : 'daily';

if (type !== 'daily' && type !== 'weekly') {
  console.error('❌ Invalid type. Use --type=daily or --type=weekly');
  process.exit(1);
}

sendNotificationDigests({ type: type as 'daily' | 'weekly' });
