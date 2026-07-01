import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
}

const ENTITIES = [
  'MenuItem', 'Category', 'Order', 'Coupon', 'Location',
  'Staff', 'SiteSettings', 'AutomationRule',
];

const ACTIONS = ['create', 'update', 'delete'];

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
};

export default function AuditLog() {
  const { t } = useTranslation();

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (entityFilter) params.set('entity', entityFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (search) params.set('search', search);

    fetch(`/api/developer/audit-logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setLogs(res.data);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, entityFilter, actionFilter, search, token]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('autoGen.admin.key121')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          aria-label={t('autoGen.admin.key122')}
        >
          <option value="">{t('autoGen.admin.key123')}</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          aria-label={t('autoGen.admin.key124')}
        >
          <option value="">{t('autoGen.admin.key125')}</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a === 'create' && t('autoGen.admin.key126')}
              {a === 'update' && t('autoGen.admin.key127')}
              {a === 'delete' && t('autoGen.admin.key128')}
              {!['create', 'update', 'delete'].includes(a) && a}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder={t('autoGen.admin.key129')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
          aria-label={t('autoGen.admin.key130')}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 text-left">{t('autoGen.admin.key131')}</th>
              <th className="px-6 py-3 text-left">{t('autoGen.admin.key132')}</th>
              <th className="px-6 py-3 text-left">{t('autoGen.admin.key133')}</th>
              <th className="px-6 py-3 text-left">{t('autoGen.admin.key134')}</th>
              <th className="px-6 py-3 text-left">{t('autoGen.admin.key135')}</th>
              <th className="px-6 py-3 text-left">{t('autoGen.admin.key136')}</th>
              <th className="px-6 py-3 text-left">{t('autoGen.admin.key137')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('autoGen.admin.key138')}</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">{t('autoGen.admin.key139')}</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-gray-700">{log.userEmail}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {log.action === 'create' && t('autoGen.admin.key140')}
                      {log.action === 'update' && t('autoGen.admin.key141')}
                      {log.action === 'delete' && t('autoGen.admin.key142')}
                      {!['create', 'update', 'delete'].includes(log.action) && log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-700">{log.entity}</td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                    {log.entityId ? log.entityId.substring(0, 12) + '...' : '-'}
                  </td>
                  <td className="px-6 py-3 text-gray-500 font-mono text-xs">{log.ipAddress || '-'}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
          >
            {t('autoGen.admin.key143')}
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {t('autoGen.admin.key144')} {page} {t('autoGen.admin.key145')} {totalPages} {t('autoGen.admin.key146')}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
          >
            {t('autoGen.admin.key147')}
          </button>
        </div>
      )}
    </div>
  );
}
