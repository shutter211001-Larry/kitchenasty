import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomer: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  conditions?: any;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CouponList() {
  const { t } = useTranslation();
    const TYPE_LABELS: Record<string, string> = {
      PERCENTAGE: t('autoGen.admin.key411'),
      FIXED: t('autoGen.admin.key412'),
      FREE_DELIVERY: t('autoGen.admin.key413'),
      BOGO: t('autoGen.admin.key414'),
    };

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    setLoading(true);
    fetch(`/api/coupons?page=${page}&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load coupons');
        return res.json();
      })
      .then((data) => {
        setCoupons(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, token]);

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, isActive } : c)));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string, code: string) {
    if (!window.confirm(`您確定要刪除優惠券 ${code} 嗎？此操作將無法復原。`)) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('autoGen.admin.key415'));
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('autoGen.admin.key416')}</h1>
        <Link
          to="/promotions/coupons/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t('autoGen.admin.key417')}
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label={t('autoGen.admin.key418')} />
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {!loading && !error && coupons.length === 0 && (
        <p className="text-gray-500 text-center py-12">{t('autoGen.admin.key419')}</p>
      )}

      {!loading && coupons.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key420')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key421')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key422')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key423')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key424')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key425')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('autoGen.admin.key426')}</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold">{coupon.code}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                        {TYPE_LABELS[coupon.type] || coupon.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {coupon.type === 'PERCENTAGE'
                        ? `${coupon.value}%`
                        : coupon.type === 'FIXED'
                          ? `$${coupon.value.toFixed(2)}`
                          : coupon.type === 'BOGO'
                            ? t('autoGen.admin.key427')
                            : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(() => {
                        let parsed: any = {};
                        if (coupon.conditions) {
                          try {
                            parsed = typeof coupon.conditions === 'string' ? JSON.parse(coupon.conditions) : coupon.conditions;
                          } catch (e) {}
                        }
                        const minOrderText = coupon.minOrder > 0 ? `$${coupon.minOrder.toFixed(2)}` : '';
                        const minItemText = parsed.minItemCount > 0 ? `${parsed.minItemCount}件` : '';
                        if (minOrderText && minItemText) return `${minOrderText} / ${minItemText}`;
                        if (minOrderText) return minOrderText;
                        if (minItemText) return minItemText;
                        return '—';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(coupon.id, !coupon.isActive)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${coupon.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                          }`}
                        aria-label={`${coupon.isActive ? 'Deactivate' : 'Activate'} coupon ${coupon.code}`}
                      >
                        {coupon.isActive ? t('autoGen.admin.key428') : t('autoGen.admin.key429')}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/promotions/coupons/${coupon.id}`}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                          aria-label={`編輯優惠券 ${coupon.code}`}
                        >
                          {t('autoGen.admin.key430')}
                        </Link>
                        <button
                          onClick={() => handleDelete(coupon.id, coupon.code)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                          aria-label={`刪除優惠券 ${coupon.code}`}
                        >
                          {t('autoGen.admin.key431')}
                        </button>
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
                {t('autoGen.admin.key432')}
              </button>
              <span className="text-sm text-gray-600">
                {t('autoGen.admin.key433')} {pagination.page} {t('autoGen.admin.key434')} {pagination.totalPages} {t('autoGen.admin.key435')}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                {t('autoGen.admin.key436')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
