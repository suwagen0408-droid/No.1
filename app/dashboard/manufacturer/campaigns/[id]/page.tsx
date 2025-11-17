'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';

interface Application {
  id: string;
  status: string;
  requestedUnits: number;
  approvedUnits?: number;
  rejectionReason?: string;
  appliedAt: string;
  facility: {
    id: string;
    facilityName: string;
    facilityType: string;
    address?: string;
    monthlyGuests?: number;
    facilityTags?: string;
  };
  campaign: {
    id: string;
    name: string;
    maxUnitsPerFacility?: number;
  };
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [approvalData, setApprovalData] = useState({
    approvedUnits: 0,
    rejectionReason: '',
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== 'manufacturer') {
      router.push('/dashboard');
      return;
    }

    setUser(userData);
    loadApplications();
  }, [router, campaignId]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch(
        `/api/manufacturer/facility-campaigns?campaignId=${campaignId}`,
        {
          headers: { 'x-user-id': userData.id },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: Application) => {
    setSelectedApplication(application);
    setApprovalData({
      approvedUnits: application.requestedUnits,
      rejectionReason: '',
    });
    setShowApprovalModal(true);
  };

  const handleReject = async (application: Application) => {
    const reason = prompt('却下理由を入力してください:');
    if (reason === null) return;

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/manufacturer/facility-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          facilityCampaignId: application.id,
          action: 'reject',
          rejectionReason: reason,
        }),
      });

      if (response.ok) {
        alert('応募を却下しました');
        loadApplications();
      } else {
        const data = await response.json();
        alert(data.error || '却下に失敗しました');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('却下に失敗しました');
    }
  };

  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication) return;

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const response = await fetch('/api/manufacturer/facility-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          facilityCampaignId: selectedApplication.id,
          action: 'approve',
          approvedUnits: approvalData.approvedUnits,
        }),
      });

      if (response.ok) {
        alert('応募を承認しました');
        setShowApprovalModal(false);
        setSelectedApplication(null);
        loadApplications();
      } else {
        const data = await response.json();
        alert(data.error || '承認に失敗しました');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('承認に失敗しました');
    }
  };

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  const pendingApplications = applications.filter((a) => a.status === 'pending');
  const approvedApplications = applications.filter((a) => a.status === 'approved');
  const rejectedApplications = applications.filter((a) => a.status === 'rejected');

  return (
    <DashboardLayout user={user}>
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard/manufacturer/campaigns"
                className="text-blue-600 hover:underline text-sm mb-2 inline-block"
              >
                ← キャンペーン一覧に戻る
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">施設応募管理</h1>
              <p className="mt-2 text-gray-600">
                施設からの応募を承認・却下します
              </p>
            </div>
            <div className="flex space-x-2">
              <Link
                href={`/dashboard/manufacturer/campaigns/${campaignId}/edit`}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                キャンペーンを編集
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="px-6 py-8 space-y-8">
            {/* Pending Applications */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                承認待ち ({pendingApplications.length})
              </h2>
              {pendingApplications.length === 0 ? (
                <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                  承認待ちの応募はありません
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingApplications.map((app) => (
                    <div
                      key={app.id}
                      className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {app.facility.facilityName}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            種類: {app.facility.facilityType} | 応募数量: {app.requestedUnits}個
                          </p>
                          {app.facility.monthlyGuests && (
                            <p className="text-sm text-gray-600">
                              月間来客数: {app.facility.monthlyGuests.toLocaleString()}人
                            </p>
                          )}
                          {app.facility.address && (
                            <p className="text-sm text-gray-500 mt-1">
                              📍 {app.facility.address}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            応募日: {new Date(app.appliedAt).toLocaleDateString('ja-JP')}
                          </p>
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleApprove(app)}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => handleReject(app)}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
                          >
                            却下
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approved Applications */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                承認済み ({approvedApplications.length})
              </h2>
              {approvedApplications.length === 0 ? (
                <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                  承認済みの応募はありません
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedApplications.map((app) => (
                    <div
                      key={app.id}
                      className="border border-green-200 bg-green-50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {app.facility.facilityName}
                        </h3>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                          承認済み
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        種類: {app.facility.facilityType}
                      </p>
                      <p className="text-sm text-gray-600">
                        承認数量: {app.approvedUnits}個
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rejected Applications */}
            {rejectedApplications.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  却下済み ({rejectedApplications.length})
                </h2>
                <div className="space-y-2">
                  {rejectedApplications.map((app) => (
                    <div
                      key={app.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {app.facility.facilityName}
                          </h3>
                          {app.rejectionReason && (
                            <p className="text-sm text-gray-600 mt-1">
                              却下理由: {app.rejectionReason}
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                          却下
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">応募を承認</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedApplication.facility.facilityName}
              </p>
            </div>

            <form onSubmit={handleSubmitApproval} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  承認数量
                </label>
                <input
                  type="number"
                  min="1"
                  max={
                    selectedApplication.campaign.maxUnitsPerFacility ||
                    selectedApplication.requestedUnits
                  }
                  value={approvalData.approvedUnits}
                  onChange={(e) =>
                    setApprovalData({
                      ...approvalData,
                      approvedUnits: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  応募数量: {selectedApplication.requestedUnits}個
                  {selectedApplication.campaign.maxUnitsPerFacility && (
                    <> | 最大: {selectedApplication.campaign.maxUnitsPerFacility}個</>
                  )}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedApplication(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  承認する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
