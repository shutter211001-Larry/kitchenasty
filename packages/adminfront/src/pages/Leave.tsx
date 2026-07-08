import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { api } from '../lib/api.js';

export default function Leave() {
  const { t } = useTranslation();
  const { token } = useAuth();
  
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    leaveType: 'PERSONAL',
    startTime: '',
    endTime: '',
    reason: ''
  });

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  async function fetchMyLeaves() {
    try {
      const res = await api.get('leaves/my-records');
      const data = res;
      if (data.success) setMyLeaves(data.data);
    } catch (err) {
      console.error(err);
    }
  }

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await api.post('leaves', JSON.stringify(form));
      
      const data = res;
      if (data.success) {
        toast.success(t('attendance.leaveSuccess') || 'Leave request submitted');
        setShowModal(false);
        setForm({ leaveType: 'PERSONAL', startTime: '', endTime: '', reason: '' });
        fetchMyLeaves();
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('attendance.leaveTitle') || '請假申請'}</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded shadow hover:bg-primary-700"
        >
          {t('attendance.requestLeave') || '新增請假單'}
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.leaveType') || '假別'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.leaveStartTime') || '開始時間'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.leaveEndTime') || '結束時間'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.leaveReason') || '原因'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('attendance.status') || '狀態'}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {myLeaves.map(leave => (
                <tr key={leave.id}>
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
                  </td>
                </tr>
              ))}
              {myLeaves.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {t('attendance.noLeaveRecords') || '目前沒有請假紀錄'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold">{t('attendance.requestLeave') || '新增請假單'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400">&times;</button>
            </div>
            
            <form onSubmit={submitLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendance.leaveType') || '假別'}</label>
                <select
                  required
                  value={form.leaveType}
                  onChange={(e) => setForm({...form, leaveType: e.target.value})}
                  className="w-full rounded border-gray-300"
                >
                  <option value="PERSONAL">{t('attendance.leavePersonal') || '事假'}</option>
                  <option value="SICK">{t('attendance.leaveSick') || '病假'}</option>
                  <option value="ANNUAL">{t('attendance.leaveAnnual') || '特休'}</option>
                  <option value="OTHER">{t('attendance.leaveOther') || '其他'}</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendance.leaveStartTime') || '開始時間'}</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({...form, startTime: e.target.value})}
                    className="w-full rounded border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendance.leaveEndTime') || '結束時間'}</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({...form, endTime: e.target.value})}
                    className="w-full rounded border-gray-300"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendance.leaveReason') || '原因'}</label>
                <textarea
                  required
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({...form, reason: e.target.value})}
                  className="w-full rounded border-gray-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  {t('common.cancel') || '取消'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  {t('common.submit') || '送出'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
