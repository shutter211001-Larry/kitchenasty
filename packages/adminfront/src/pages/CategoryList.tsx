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
        <h2 className="text-2xl font-semibold text-gray-800">{t('categoryList.categoryManagement')}</h2>
        <Link
          to="/menu/categories/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t('categoryList.addCategory')}
        </Link>
      </div>

      {loading && <p className="text-gray-500">{t('categoryList.loadingCategories')}</p>}
      {error && <p className="text-red-600">{t('categoryList.error')} {error}</p>}

      {!loading && !error && topLevel.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">{t('categoryList.noCategories')}</p>
          <Link to="/menu/categories/new" className="text-primary-600 hover:text-primary-700 font-medium">
            {t('categoryList.createFirstCategory')}
          </Link>
        </div>
      )}

      {!loading && topLevel.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('categoryList.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('categoryList.productCount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('categoryList.sharedStock')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('categoryList.subcategories')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('categoryList.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('categoryList.sortOrder')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('categoryList.actions')}</th>
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
                          {t('categoryList.soldOut')}
                        </span>
                      ) : (cat.sharedStockQty || 0) <= (cat.sharedStockThreshold || 5) ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm inline-flex items-center gap-1 animate-pulse">
                          {t('categoryList.restockWarning')}{cat.sharedStockQty})
                        </span>
                      ) : (
                        <span className="text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm inline-flex items-center gap-1">
                          {t('categoryList.stockRemaining')} {cat.sharedStockQty}
                        </span>
                      )
                    ) : (
                      <span className="text-gray-400 font-normal text-xs">{t('categoryList.independentStock')}</span>
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
                      {cat.isActive ? t('categoryList.active') : t('categoryList.disabled')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cat.sortOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                    <Link to={`/menu/categories/${cat.id}`} className="text-primary-600 hover:text-primary-900 font-medium" aria-label={`編輯分類 ${cat.name}`}>
                      {t('categoryList.edit')}
                    </Link>
                    <button onClick={() => handleDelete(cat.id, cat.name)} className="text-red-600 hover:text-red-900 font-medium" aria-label={`刪除分類 ${cat.name}`}>
                      {t('categoryList.delete')}
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Special "All" (全部) row sorted at the bottom */}
              <tr className="bg-gray-50/50 hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">{t('categoryList.allCategories')}</div>
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
                    {t('categoryList.enabled')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 italic">
                  {t('categoryList.pinToBottom')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-400 italic">
                  {t('categoryList.systemDefault')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
