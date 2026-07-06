import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LeaveApprovals() {
  const { t } = useTranslation();
  const { token } = useAuth();
  
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaves();
  }, []);

  async function fetchLeaves() {
    try {
      const res = await fetch('/api/leaves', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setLeaves(data.data);
    } catch (err) {
      console.error(err);
    }
  }

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(t('attendance.leaveStatusUpdated') || 'Status updated');
        fetchLeaves();
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch (err) {
      toast.error('System error');
    } finally {
      setLoading(false);
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'PERSONAL': return t('attendance.leavePersonal') || '事假';
      case 'SICK': return t('attendance.leaveSick') || '病假';
      case 'ANNUAL': return t('attendance.leaveAnnual') || '特休';
      default: return t('attendance.leaveOther') || '其他';
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.employee') || '員工'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.leaveType') || '假別'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.leaveStartTime') || '開始時間'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.leaveEndTime') || '結束時間'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.leaveReason') || '原因'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.status') || '狀態'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions') || '操作'}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {leaves.map(leave => (
                <tr key={leave.id}>
                  <td className="px-6 py-4 font-medium">{leave.user.name}</td>
                  <td className="px-6 py-4">{getLeaveTypeLabel(leave.leaveType)}</td>
                  <td className="px-6 py-4">{new Date(leave.startTime).toLocaleString()}</td>
                  <td className="px-6 py-4">{new Date(leave.endTime).toLocaleString()}</td>
                  <td className="px-6 py-4 max-w-xs truncate">{leave.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      leave.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      leave.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {leave.status}
                    </span>
                    {leave.manager && <div className="text-xs text-gray-500 mt-1">{leave.manager.name}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {leave.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(leave.id, 'APPROVED')}
                          disabled={loading}
                          className="text-green-600 hover:text-green-900 border border-green-200 rounded px-2 py-1"
                        >
                          {t('common.approve') || '核准'}
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(leave.id, 'REJECTED')}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 border border-red-200 rounded px-2 py-1"
                        >
                          {t('common.reject') || '拒絕'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {t('attendance.noLeaveRecords') || '目前沒有請假紀錄'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
