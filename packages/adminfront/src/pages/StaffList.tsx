import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';

interface Staff {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  location: { id: string; name: string } | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-gray-100 text-gray-700',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'staff.roles.superAdmin',
  MANAGER: 'staff.roles.manager',
  STAFF: 'staff.roles.staff',
};

export default function StaffList() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (roleFilter) params.set('role', roleFilter);
    if (search) params.set('search', search);

    fetch(`/api/staff?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load staff');
        return res.json();
      })
      .then((data) => {
        setStaff(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, roleFilter, search, token]);

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, isActive } : s)));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('staff.title')}</h1>
        <Link
          to="/staff/invite"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t('staff.actions.invite')}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder={t('staff.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-64"
          aria-label={t('staff.searchPlaceholder')}
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          aria-label={t('staff.roleFilter')}
        >
          <option value="">{t('staff.roleFilter')}</option>
          <option value="SUPER_ADMIN">{t('staff.roles.superAdmin')}</option>
          <option value="MANAGER">{t('staff.roles.manager')}</option>
          <option value="STAFF">{t('staff.roles.staff')}</option>
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label={t('autoGen.admin.key1548')} />
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {!loading && !error && staff.length === 0 && (
        <p className="text-gray-500 text-center py-12">{t('staff.notFound')}</p>
      )}

      {!loading && staff.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('staff.table.name')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('staff.table.email')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('staff.table.role')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('staff.table.location')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('staff.table.status')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('staff.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{member.name}</td>
                    <td className="px-4 py-3 text-gray-600">{member.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLE_LABELS[member.role] ? t(ROLE_LABELS[member.role]) : member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {member.location?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(member.id, !member.isActive)}
                        disabled={member.id === currentUser?.id}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          member.id === currentUser?.id
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500'
                            : member.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        aria-label={`${member.isActive ? t('autoGen.admin.key1549') : t('autoGen.admin.key1550')} ${member.name}`}
                      >
                        {member.isActive ? t('staff.isActive') : t('staff.isInactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/staff/${member.id}`}
                        className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                      >
                        {t('staff.actions.edit')}
                      </Link>
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
                {t('autoGen.admin.key1551')}
              </button>
              <span className="text-sm text-gray-600">
                {t('autoGen.admin.key1552')} {pagination.page} {t('autoGen.admin.key1553')} {pagination.totalPages} {t('autoGen.admin.key1554')}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                {t('autoGen.admin.key1555')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
