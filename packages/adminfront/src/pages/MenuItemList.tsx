import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { getFullUrl } from '../utils/url.js';

interface MenuItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  trackStock: boolean;
  stockQty: number;
  category: { id: string; name: string };
  _count: { options: number; allergens: number; mealtimes: number; dietaryPreferences: number };
}

interface Category {
  id: string;
  name: string;
}

interface MenuItemResponse {
  success: boolean;
  data: MenuItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function MenuItemList() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchItems = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (categoryFilter) params.set('categoryId', categoryFilter);

    api.get<MenuItemResponse>(`/menu/items?${params}`)
      .then((res) => {
        setItems(res.data);
        setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    api.get<{ data: Category[] }>('/menu/categories')
      .then((res) => setCategories(res.data))
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchItems(1);
  }, [search, categoryFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除產品 "${name}" 嗎？`)) return;
    try {
      await api.delete(`/menu/items/${id}`);
      fetchItems(pagination.page);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">產品管理 (Menu Items)</h2>
        <Link
          to="/menu/items/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          + 新增產品
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4">
        <input
          type="text"
          placeholder="搜尋產品名稱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="搜尋產品"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="依分類篩選"
        >
          <option value="">所有分類</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600 mb-4">錯誤: {error}</p>}

      {!loading && items.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">找不到任何產品。</p>
          <Link to="/menu/items/new" className="text-primary-600 hover:text-primary-700 font-medium">
            建立您的第一個產品
          </Link>
        </div>
      )}

      {loading && <p className="text-gray-500">載入產品中...</p>}

      {!loading && items.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">產品 (Item)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分類 (Category)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">價格 (Price)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態 (Status)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">內容/屬性</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={getFullUrl(item.image)!} alt={item.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-400">{item.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {item.isActive ? '銷售中' : '已停售'}
                        </span>
                        {item.trackStock && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.stockQty > 0 ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            庫存: {item.stockQty}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {item._count.options} 選項 &middot; {item._count.allergens} 過敏原 &middot; {item._count.dietaryPreferences} 忌口
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                      <Link to={`/menu/items/${item.id}`} className="text-primary-600 hover:text-primary-900 font-medium" aria-label={`編輯 ${item.name}`}>
                        編輯
                      </Link>
                      <button onClick={() => handleDelete(item.id, item.name)} className="text-red-600 hover:text-red-900 font-medium" aria-label={`刪除 ${item.name}`}>
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">共 {pagination.total} 項產品</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchItems(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  上一頁
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  第 {pagination.page} 頁，共 {pagination.totalPages} 頁
                </span>
                <button
                  onClick={() => fetchItems(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  下一頁
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
