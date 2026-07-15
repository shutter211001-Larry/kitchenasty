import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { getFullUrl } from '../../utils/url.js';
import { confirm } from '../../lib/confirm';
import { toast } from "react-hot-toast";
import { Plus, Edit2, Trash2, Bot } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { PageContent } from '../../components/layout/PageContent.js';
import { TableContainer, Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { SkeletonList } from '../../components/ui/Skeleton.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { PackageSearch } from 'lucide-react';
import { ProgressiveImage } from '../../components/ui/ProgressiveImage.js';

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
  locationId: string | null;
  location?: { id: string; name: string } | null;
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
  const { t } = useTranslation();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const searchParams = new URLSearchParams(window.location.search);
  const locationId = searchParams.get('locationId');

  const fetchItems = (page = 1) => {
  setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (categoryFilter) params.set('categoryId', categoryFilter);
    if (locationId) params.set('locationId', locationId);

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
    if (!await confirm({ 
      message: `確定要刪除產品 "${name}" 嗎？此操作無法復原。`,
      isDanger: true,
      expectedText: name,
      confirmText: t('menuItemList.delete') || '刪除'
    })) return;
    try {
      const deleteUrl = locationId ? `/menu/items/${id}?locationId=${locationId}` : `/menu/items/${id}`;
      await api.delete(deleteUrl);
      fetchItems(pagination.page);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader 
        title={t('menuItemList.productManagement')}
        action={
          <div className="flex items-center gap-3">
            <Link to="/menu/items/ai-detect">
              <Button variant="secondary" icon={<Bot size={16} />}>
                {t('menuItemList.72854d') || 'AI 菜單偵測'}
              </Button>
            </Link>
            <Link to={`/menu/items/new${locationId ? `?locationId=${locationId}` : ''}`}>
              <Button icon={<Plus size={16} />}>
                {t('menuItemList.addProduct')}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4">
        <input
          type="text"
          placeholder={t('menuItemList.searchProductNamePlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label={t('menuItemList.searchProduct')}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label={t('menuItemList.filterByCategory')}
        >
          <option value="">{t('menuItemList.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600 mb-4">{t('menuItemList.errorLabel')} {error}</p>}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title={t('menuItemList.noProductsFound') || '目前沒有品項'}
          description={t('menuItemList.noProductsDescription') || '這裡看起來空空如也，點擊下方按鈕新增您的第一個菜單品項吧！'}
          action={
            <Link to="/menu/items/new">
              <Button icon={<Plus size={16} />}>
                {t('menuItemList.createFirstProduct') || '新增品項'}
              </Button>
            </Link>
          }
        />
      )}

      {loading && <div className="mt-6"><SkeletonList /></div>}

      {!loading && items.length > 0 && (
        <>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('menuItemList.productItem')}</TableHead>
                <TableHead>{t('menuItemList.category')}</TableHead>
                <TableHead>{t('menuItemList.price')}</TableHead>
                <TableHead>{t('menuItemList.status')}</TableHead>
                <TableHead>{t('menuItemList.contentAttributes')}</TableHead>
                <TableHead className="text-right">{t('menuItemList.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <ProgressiveImage src={getFullUrl(item.image)!} alt={item.name} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {item.name}
                          {item.locationId ? (
                            <Badge variant="info">
                              {item.location ? `${item.location.name} 專屬` : t('menuItemList.branchCustom') || '門市專屬'}
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              {t('menuItemList.inheritedFromMain') || '總部公版'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{item.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.category.name}
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    ${item.price.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={item.isActive ? 'success' : 'danger'}>
                        {item.isActive ? t('menuItemList.onSale') : t('menuItemList.discontinued')}
                      </Badge>
                      {item.trackStock && (
                        <Badge variant={item.stockQty > 0 ? 'info' : 'warning'}>
                          {t('menuItemList.stockLabel')} {item.stockQty}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {item._count.options} {t('menuItemList.options')} {item._count.allergens} {t('menuItemList.allergens')} {item._count.dietaryPreferences} {t('menuItemList.dietaryRestrictions')}
                  </TableCell>
                  <TableCell className="text-right space-x-3">
                    <Link to={`/menu/items/${item.id}${locationId ? `?locationId=${locationId}` : ''}`} className="text-primary-600 hover:text-primary-900 font-medium inline-flex items-center gap-1" aria-label={`編輯 ${item.name}`}>
                      <Edit2 size={16} />
                      {t('menuItemList.edit')}
                    </Link>
                    <button onClick={() => handleDelete(item.id, item.name)} className="text-red-600 hover:text-red-900 font-medium inline-flex items-center gap-1" aria-label={`刪除 ${item.name}`}>
                      <Trash2 size={16} />
                      {t('menuItemList.delete')}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">{t('menuItemList.totalPrefix')} {pagination.total} {t('menuItemList.productsCount')}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchItems(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  {t('menuItemList.previousPage')}
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {t('menuItemList.pagePrefix')} {pagination.page} {t('menuItemList.pageOf')} {pagination.totalPages} {t('menuItemList.pageSuffix')}
                </span>
                <button
                  onClick={() => fetchItems(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                >
                  {t('menuItemList.nextPage')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
