import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.js';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageContent } from '../../components/layout/PageContent';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { Users } from 'lucide-react';
import { api } from '../../lib/api.js';

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

    api.get(`staff?${params}`)
      
      .then((data) => {
        setStaff(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, roleFilter, search, token]);

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const res = await api.patch(`staff/${id}`, JSON.stringify({ isActive }));
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, isActive } : s)));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="pb-12">
      <PageHeader
        title={t('staff.title')}
        action={
          <Link
            to="/staff/invite"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            {t('staff.actions.invite')}
          </Link>
        }
      />
      <PageContent>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder={t('staff.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none w-64 shadow-sm transition-all duration-200"
          aria-label={t('staff.searchPlaceholder')}
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm transition-all duration-200"
          aria-label={t('staff.roleFilter')}
        >
          <option value="">{t('staff.roleFilter')}</option>
          <option value="SUPER_ADMIN">{t('staff.roles.superAdmin')}</option>
          <option value="MANAGER">{t('staff.roles.manager')}</option>
          <option value="STAFF">{t('staff.roles.staff')}</option>
        </select>
      </div>

      {loading && (
        <div className="py-6">
          <SkeletonList />
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {!loading && !error && staff.length === 0 && (
        <div className="py-8">
          <EmptyState 
            icon={Users}
            title={t('staff.notFound') || '目前沒有員工'}
            description={t('staff.emptyDescription') || '點擊右上角「邀請員工」按鈕，立即發送系統邀請信！'}
            action={
              <Link
                to="/staff/invite"
                className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
              >
                {t('staff.actions.invite')}
              </Link>
            }
          />
        </div>
      )}

      {!loading && staff.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                        aria-label={`${member.isActive ? t('staffList.disable') : t('staffList.enable')} ${member.name}`}
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
                {t('staffList.previousPage')}
              </button>
              <span className="text-sm text-gray-600">
                {t('staffList.pagePrefix')} {pagination.page} {t('staffList.pageOfTotal')} {pagination.totalPages} {t('staffList.page')}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                {t('staffList.nextPage')}
              </button>
            </div>
          )}
        </>
      )}
      </PageContent>
    </div>
  );
}
