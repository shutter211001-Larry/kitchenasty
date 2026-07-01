import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  children: { id: string; name: string }[];
  _count: { menuItems: number };
  trackSharedStock?: boolean;
  sharedStockQty?: number;
  sharedStockThreshold?: number;
}

export default function CategoryList() {
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: Category[] }>('/menu/categories')
      .then((res) => { setCategories(res.data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const topLevel = categories.filter((c) => !c.parentId);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除分類 "${name}" 嗎？`)) return;
    try {
      await api.delete(`/menu/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('autoGen.admin.key205')}</h2>
        <Link
          to="/menu/categories/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t('autoGen.admin.key206')}
        </Link>
      </div>

      {loading && <p className="text-gray-500">{t('autoGen.admin.key207')}</p>}
      {error && <p className="text-red-600">{t('autoGen.admin.key208')} {error}</p>}

      {!loading && !error && topLevel.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">{t('autoGen.admin.key209')}</p>
          <Link to="/menu/categories/new" className="text-primary-600 hover:text-primary-700 font-medium">
            {t('autoGen.admin.key210')}
          </Link>
        </div>
      )}

      {!loading && topLevel.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('autoGen.admin.key211')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('autoGen.admin.key212')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('autoGen.admin.key213')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('autoGen.admin.key214')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('autoGen.admin.key215')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('autoGen.admin.key216')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('autoGen.admin.key217')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topLevel.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{cat.name}</div>
                    <div className="text-xs text-gray-400">{cat.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cat._count.menuItems}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    {cat.trackSharedStock ? (
                      (cat.sharedStockQty || 0) === 0 ? (
                        <span className="text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md text-xs font-extrabold shadow-sm inline-flex items-center gap-1">
                          {t('autoGen.admin.key218')}
                        </span>
                      ) : (cat.sharedStockQty || 0) <= (cat.sharedStockThreshold || 5) ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm inline-flex items-center gap-1 animate-pulse">
                          {t('autoGen.admin.key219')}{cat.sharedStockQty})
                        </span>
                      ) : (
                        <span className="text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm inline-flex items-center gap-1">
                          {t('autoGen.admin.key220')} {cat.sharedStockQty}
                        </span>
                      )
                    ) : (
                      <span className="text-gray-400 font-normal text-xs">{t('autoGen.admin.key221')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cat.children.length > 0
                      ? cat.children.map((c) => c.name).join(', ')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {cat.isActive ? t('autoGen.admin.key222') : t('autoGen.admin.key223')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cat.sortOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                    <Link to={`/menu/categories/${cat.id}`} className="text-primary-600 hover:text-primary-900 font-medium" aria-label={`編輯分類 ${cat.name}`}>
                      {t('autoGen.admin.key224')}
                    </Link>
                    <button onClick={() => handleDelete(cat.id, cat.name)} className="text-red-600 hover:text-red-900 font-medium" aria-label={`刪除分類 ${cat.name}`}>
                      {t('autoGen.admin.key225')}
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Special "All" (全部) row sorted at the bottom */}
              <tr className="bg-gray-50/50 hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">{t('autoGen.admin.key226')}</div>
                  <div className="text-xs text-gray-400">all</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {categories.reduce((sum, c) => sum + (c._count?.menuItems || 0), 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {t('autoGen.admin.key227')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 italic">
                  {t('autoGen.admin.key228')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-400 italic">
                  {t('autoGen.admin.key229')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
