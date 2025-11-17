import { prisma } from './prisma';

export type NotificationType = 
  | 'account_approved'
  | 'account_rejected'
  | 'product_approved'
  | 'product_rejected'
  | 'campaign_approved'
  | 'campaign_rejected'
  | 'campaign_application'
  | 'application_approved'
  | 'application_rejected'
  | 'qr_scan'
  | 'purchase_made'
  | 'system';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        relatedResourceType: params.relatedResourceType,
        relatedResourceId: params.relatedResourceId,
      },
    });
  } catch (error) {
    console.error('通知作成エラー:', error);
    return null;
  }
}

// Helper functions for common notifications
export async function notifyAccountApproved(userId: string, role: string) {
  return createNotification({
    userId,
    type: 'account_approved',
    title: 'アカウントが承認されました',
    message: `${role === 'manufacturer' ? 'メーカー' : '施設'}アカウントが承認されました。全ての機能をご利用いただけます。`,
  });
}

export async function notifyAccountRejected(userId: string, role: string, reason?: string) {
  return createNotification({
    userId,
    type: 'account_rejected',
    title: 'アカウント申請が却下されました',
    message: `申請が却下されました。${reason ? `理由: ${reason}` : ''}`,
  });
}

export async function notifyProductApproved(userId: string, productId: string, productName: string) {
  return createNotification({
    userId,
    type: 'product_approved',
    title: '商品が承認されました',
    message: `「${productName}」が承認されました。キャンペーンで使用できます。`,
    relatedResourceType: 'Product',
    relatedResourceId: productId,
  });
}

export async function notifyProductRejected(userId: string, productId: string, productName: string, reason?: string) {
  return createNotification({
    userId,
    type: 'product_rejected',
    title: '商品申請が却下されました',
    message: `「${productName}」の申請が却下されました。${reason ? `理由: ${reason}` : ''}`,
    relatedResourceType: 'Product',
    relatedResourceId: productId,
  });
}

export async function notifyCampaignApproved(userId: string, campaignId: string, campaignName: string) {
  return createNotification({
    userId,
    type: 'campaign_approved',
    title: 'キャンペーンが承認されました',
    message: `「${campaignName}」が承認されました。開始日になると自動的にアクティブになります。`,
    relatedResourceType: 'Campaign',
    relatedResourceId: campaignId,
  });
}

export async function notifyCampaignRejected(userId: string, campaignId: string, campaignName: string, reason?: string) {
  return createNotification({
    userId,
    type: 'campaign_rejected',
    title: 'キャンペーン申請が却下されました',
    message: `「${campaignName}」の申請が却下されました。${reason ? `理由: ${reason}` : ''}`,
    relatedResourceType: 'Campaign',
    relatedResourceId: campaignId,
  });
}

export async function notifyCampaignApplication(userId: string, campaignId: string, campaignName: string, facilityName: string) {
  return createNotification({
    userId,
    type: 'campaign_application',
    title: '新しいキャンペーン応募',
    message: `「${facilityName}」が「${campaignName}」に応募しました。`,
    relatedResourceType: 'Campaign',
    relatedResourceId: campaignId,
  });
}

export async function notifyApplicationApproved(userId: string, campaignId: string, campaignName: string, approvedUnits: number) {
  return createNotification({
    userId,
    type: 'application_approved',
    title: 'キャンペーン応募が承認されました',
    message: `「${campaignName}」への応募が承認されました。承認数量: ${approvedUnits}個`,
    relatedResourceType: 'Campaign',
    relatedResourceId: campaignId,
  });
}

export async function notifyApplicationRejected(userId: string, campaignId: string, campaignName: string, reason?: string) {
  return createNotification({
    userId,
    type: 'application_rejected',
    title: 'キャンペーン応募が却下されました',
    message: `「${campaignName}」への応募が却下されました。${reason ? `理由: ${reason}` : ''}`,
    relatedResourceType: 'Campaign',
    relatedResourceId: campaignId,
  });
}

export async function notifyPurchaseMade(userId: string, productName: string, facilityName: string) {
  return createNotification({
    userId,
    type: 'purchase_made',
    title: '購入が発生しました',
    message: `「${facilityName}」で「${productName}」が購入されました。`,
  });
}
