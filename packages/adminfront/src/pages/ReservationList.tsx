import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Reservation {
  id: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  comment: string | null;
  customer: { id: string; name: string; email: string; phone: string | null };
  location: { id: string; name: string };
  table: { id: string; name: string; capacity: number } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SEATED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-200 text-green-900',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ReservationList() {
  const { t } = useTranslation();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);
    if (dateFilter) params.set('date', dateFilter);

    fetch(`/api/reservations?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load reservations');
        return res.json();
      })
      .then((data) => {
        setReservations(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter, dateFilter, token]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('autoGen.admin.key1121')}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          aria-label={t('autoGen.admin.key1122')}
        >
          <option value="">{t('autoGen.admin.key1123')}</option>
          <option value="PENDING">{t('autoGen.admin.key1124')}</option>
          <option value="CONFIRMED">{t('autoGen.admin.key1125')}</option>
          <option value="SEATED">{t('autoGen.admin.key1126')}</option>
          <option value="COMPLETED">{t('autoGen.admin.key1127')}</option>
          <option value="CANCELLED">{t('autoGen.admin.key1128')}</option>
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          aria-label="Filter by date"
        />
        {dateFilter && (
          <button
            onClick={() => { setDateFilter(''); setPage(1); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {t('autoGen.admin.key1129')}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label={t('autoGen.admin.key1130')} />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>
      )}

      {!loading && !error && reservations.length === 0 && (
        <p className="text-gray-500 text-center py-12">{t('autoGen.admin.key1131')}</p>
      )}

      {!loading && reservations.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key1132')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key1133')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key1134')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key1135')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key1136')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key1137')}</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {new Date(r.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">{r.time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{r.customer.name}</div>
                      <div className="text-xs text-gray-500">{r.customer.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.partySize} {t('autoGen.admin.key1138')}</td>
                    <td className="px-4 py-3">
                      {r.table ? (
                        <span className="text-gray-900">{r.table.name} ({r.table.capacity} {t('autoGen.admin.key1139')}</span>
                      ) : (
                        <span className="text-gray-400">{t('autoGen.admin.key1140')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
                        {r.status === 'PENDING' ? t('autoGen.admin.key1141') : r.status === 'CONFIRMED' ? t('autoGen.admin.key1142') : r.status === 'SEATED' ? t('autoGen.admin.key1143') : r.status === 'COMPLETED' ? t('autoGen.admin.key1144') : r.status === 'CANCELLED' ? t('autoGen.admin.key1145') : r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.status === 'PENDING' && (
                          <button
                            onClick={() => updateStatus(r.id, 'CONFIRMED')}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                            aria-label={`確認 ${r.customer.name} 的預約`}
                          >
                            {t('autoGen.admin.key1146')}
                          </button>
                        )}
                        {r.status === 'CONFIRMED' && (
                          <button
                            onClick={() => updateStatus(r.id, 'SEATED')}
                            className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
                            aria-label={`安排 ${r.customer.name} 入座`}
                          >
                            {t('autoGen.admin.key1147')}
                          </button>
                        )}
                        {r.status === 'SEATED' && (
                          <button
                            onClick={() => updateStatus(r.id, 'COMPLETED')}
                            className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                            aria-label={`完成 ${r.customer.name} 的預約`}
                          >
                            {t('autoGen.admin.key1148')}
                          </button>
                        )}
                        {!['COMPLETED', 'CANCELLED'].includes(r.status) && (
                          <button
                            onClick={() => updateStatus(r.id, 'CANCELLED')}
                            className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                            aria-label={`取消 ${r.customer.name} 的預約`}
                          >
                            {t('autoGen.admin.key1149')}
                          </button>
                        )}
                        <Link
                          to={`/reservations/${r.id}`}
                          className="text-xs px-2 py-1 text-primary-600 hover:text-primary-700"
                        >
                          {t('autoGen.admin.key1150')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                {t('autoGen.admin.key1151')}
              </button>
              <span className="text-sm text-gray-600">
                {t('autoGen.admin.key1152')} {pagination.page} {t('autoGen.admin.key1153')} {pagination.totalPages} {t('autoGen.admin.key1154')}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                {t('autoGen.admin.key1155')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
