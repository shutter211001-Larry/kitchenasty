import { api } from '../lib/api';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import toast from 'react-hot-toast';

export default function AttendanceRecords() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  
  const [records, setRecords] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  // Filters
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOutOfRange, setIsOutOfRange] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLocations();
    fetchRecords();
  }, []);

  async function fetchLocations() {
    try {
      const data = await api.get<any>('/locations');
      if (data.success) {
        setLocations(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchRecords() {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (locationId) query.append('locationId', locationId);
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      if (isOutOfRange) query.append('isOutOfRange', 'true');

      const data = await api.get<any>(`/attendance/records?${query.toString()}`);
      if (data.success) {
        setRecords(data.data);
      } else {
        toast.error(t('attendanceRecords.failedToLoadRecords'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('nav.attendanceRecords')}</h2>

      <div className="bg-white p-6 rounded shadow mb-6">
        <form onSubmit={handleFilter} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendanceRecords.branchStore')}</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded border-gray-300 text-sm"
            >
              <option value="">{t('attendanceRecords.all')}</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendanceRecords.startDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border-gray-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendanceRecords.endDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border-gray-300 text-sm"
            />
          </div>
          <div className="flex items-center h-10">
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isOutOfRange}
                onChange={(e) => setIsOutOfRange(e.target.checked)}
                className="mr-2 rounded text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              {t('attendanceRecords.showAbnormalDistanceOnly')}
            </label>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {t('attendanceRecords.filter')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('attendanceRecords.date')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('attendanceRecords.employee')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('attendanceRecords.store')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('attendanceRecords.clockInTime')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('attendanceRecords.clockOutTime')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('attendanceRecords.status')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map(record => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(record.checkIn).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.user?.name}
                  <span className="block text-xs text-gray-500">{record.user?.email}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.location?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(record.checkIn).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {!record.checkOut ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {t('attendanceRecords.missingCheckout') || '未下班'}
                    </span>
                  ) : record.isOutOfRange ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {t('attendanceRecords.abnormalDistance')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {t('attendanceRecords.normal')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {t('attendanceRecords.noMatchingRecordsFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
