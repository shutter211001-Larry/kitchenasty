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
        <h2 className="text-2xl font-semibold text-gray-800">分類管理 (Categories)</h2>
        <Link
          to="/menu/categories/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          + 新增分類
        </Link>
      </div>

      {loading && <p className="text-gray-500">載入分類中...</p>}
      {error && <p className="text-red-600">錯誤: {error}</p>}

      {!loading && !error && topLevel.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">目前尚無分類。</p>
          <Link to="/menu/categories/new" className="text-primary-600 hover:text-primary-700 font-medium">
            建立您的第一個分類
          </Link>
        </div>
      )}

      {!loading && topLevel.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名稱 (Name)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">產品數量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">共用庫存</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">子分類</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態 (Status)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排序</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
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
                          🚫 已售完 (0)
                        </span>
                      ) : (cat.sharedStockQty || 0) <= (cat.sharedStockThreshold || 5) ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm inline-flex items-center gap-1 animate-pulse">
                          ⚠️ 補貨預警 ({cat.sharedStockQty})
                        </span>
                      ) : (
                        <span className="text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm inline-flex items-center gap-1">
                          📦 餘 {cat.sharedStockQty}
                        </span>
                      )
                    ) : (
                      <span className="text-gray-400 font-normal text-xs">- (獨立庫存)</span>
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
                      {cat.isActive ? '啟用中' : '已停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cat.sortOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                    <Link to={`/menu/categories/${cat.id}`} className="text-primary-600 hover:text-primary-900 font-medium" aria-label={`編輯分類 ${cat.name}`}>
                      編輯
                    </Link>
                    <button onClick={() => handleDelete(cat.id, cat.name)} className="text-red-600 hover:text-red-900 font-medium" aria-label={`刪除分類 ${cat.name}`}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Special "All" (全部) row sorted at the bottom */}
              <tr className="bg-gray-50/50 hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">全部 (All Categories)</div>
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
                    啟用中
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 italic">
                  固定最末尾
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-400 italic">
                  系統預設
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
