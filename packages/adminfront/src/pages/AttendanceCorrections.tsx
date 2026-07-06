import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import toast from 'react-hot-toast';

export default function AttendanceCorrections() {
  const { t } = useTranslation();
  const { token } = useAuth();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.append('status', statusFilter);

      const res = await fetch(`/api/attendance/corrections?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      } else {
        toast.error('Failed to fetch requests');
      }
    } catch (err) {
      console.error(err);
      toast.error('System error');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/corrections/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('attendanceCorrections.updateSuccess'));
        fetchRequests();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      toast.error('System error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendanceCorrections.status')}</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border-gray-300 text-sm w-48"
          >
            <option value="">{t('attendanceRecords.all') || 'All'}</option>
            <option value="PENDING">{t('attendanceCorrections.statusPending')}</option>
            <option value="APPROVED">{t('attendanceCorrections.statusApproved')}</option>
            <option value="REJECTED">{t('attendanceCorrections.statusRejected')}</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendanceCorrections.date')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendanceCorrections.employee')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendanceCorrections.requestedCheckIn')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendanceCorrections.requestedCheckOut')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendanceCorrections.reason')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendanceCorrections.status')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map(req => (
              <tr key={req.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="font-medium">{req.user?.name}</div>
                  <div className="text-gray-500 text-xs">{req.user?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {req.requestedCheckIn ? new Date(req.requestedCheckIn).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {req.requestedCheckOut ? new Date(req.requestedCheckOut).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                  {req.reason}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    req.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {req.status === 'APPROVED' ? t('attendanceCorrections.statusApproved') : 
                     req.status === 'REJECTED' ? t('attendanceCorrections.statusRejected') : 
                     t('attendanceCorrections.statusPending')}
                  </span>
                  {req.manager && (
                    <div className="text-xs text-gray-500 mt-1">{t('attendanceCorrections.manager')}: {req.manager.name}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {req.status === 'PENDING' && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                        disabled={loading}
                        className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded"
                      >
                        {t('attendanceCorrections.approve')}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded"
                      >
                        {t('attendanceCorrections.reject')}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  {t('attendanceCorrections.noRecords')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
