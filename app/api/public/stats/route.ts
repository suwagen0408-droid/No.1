import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, CampaignStatus, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Auto-activate campaigns that are approved and past their start date
    const now = new Date();
    const campaignsToActivate = await prisma.campaign.findMany({
      where: {
        status: CampaignStatus.approved,
        startDate: { lte: now },
        deletedAt: null,
      },
    });

    if (campaignsToActivate.length > 0) {
      await Promise.all(
        campaignsToActivate.map((campaign) =>
          prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: CampaignStatus.active },
          })
        )
      );
    }

    // 公開統計情報を取得（認証不要）
    const [totalManufacturers, totalFacilities, activeCampaigns] = await Promise.all([
      prisma.manufacturer.count({
        where: {
          deletedAt: null,
          user: {
            status: UserStatus.approved, // 承認済みのみカウント
          },
        },
      }),
      prisma.facility.count({
        where: {
          deletedAt: null,
          user: {
            status: UserStatus.approved, // 承認済みのみカウント
          },
        },
      }),
      prisma.campaign.count({
        where: {
          status: CampaignStatus.active,
          deletedAt: null,
        },
      }),
    ]);

    return NextResponse.json(
      {
        stats: {
          totalManufacturers,
          totalFacilities,
          activeCampaigns,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  } catch (error) {
    console.error('公開統計取得エラー:', error);
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}
