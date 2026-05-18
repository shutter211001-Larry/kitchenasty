import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi.js';
import { useTheme } from '../context/ThemeContext.js';
import MenuItemModal from '../components/MenuItemModal.js';
import { getTranslated } from '../utils/translation.js';
import { getFullUrl } from '../utils/url.js';
import { API_BASE } from '../lib/api.js';

interface Category {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  slug: string;
  isActive: boolean;
  parentId: string | null;
  _count: { menuItems: number };
  children: Category[];
}

interface MenuItem {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  slug: string;
  description: string | null;
  descriptionTranslations?: Record<string, string>;
  price: number;
  image: string | null;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number;
  category: { id: string; name: string; nameTranslations?: Record<string, string> };
  allergens: { allergen: { id: string; name: string; nameTranslations?: Record<string, string> } }[];
  dietaryPreferences: { dietaryPreference: { id: string; name: string; nameTranslations?: Record<string, string> } }[];
  _count: { options: number };
}

interface MenuResponse {
  items: MenuItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function Menu() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read state directly from URL search parameters (Single Source of Truth)
  const selectedCategory = searchParams.get('category');
  const page = Number(searchParams.get('page')) || 1;
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const { settings } = useTheme();

  // Dynamic titles from settings with fallback
  const menuTitle = settings.menuSection?.translations?.title?.[i18n.language] 
    || settings.menuSection?.title 
    || t('menu.title');
    
  const menuDesc = settings.menuSection?.translations?.description?.[i18n.language] 
    || settings.menuSection?.description 
    || t('home.heroDescription').split('.')[0] + '.';

  const selectedLocation = searchParams.get('location');
  const categoriesUrl = selectedLocation
    ? `${API_BASE}/menu/categories?locationId=${selectedLocation}`
    : `${API_BASE}/menu/categories`;
  const { data: categories, isLoading: categoriesLoading } = useApi<Category[]>(categoriesUrl);

  // Build items URL with filters
  const itemsUrl = buildItemsUrl(selectedCategory, debouncedSearch, page, selectedLocation);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [pagination, setPagination] = useState<MenuResponse['pagination'] | null>(null);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Set default category if not specified in URL
  useEffect(() => {
    if (!categories || categories.length === 0) return;
    if (searchParams.get('category')) return; // URL already has a category selection

    const activeCats = categories.filter((c) => c.isActive && !c.parentId);
    if (activeCats.length > 0) {
      const defaultCategory = activeCats[0];
      const params = new URLSearchParams(searchParams);
      params.set('category', defaultCategory.id);
      setSearchParams(params, { replace: true });
    }
  }, [categories, searchParams, setSearchParams]);

  // Debounce search input and update URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      
      const currentSearch = searchParams.get('search') || '';
      if (search !== currentSearch) {
        const params = new URLSearchParams(searchParams);
        if (search) {
          params.set('search', search);
        } else {
          params.delete('search');
        }
        params.set('page', '1'); // Reset to page 1 on search
        setSearchParams(params, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchParams, setSearchParams]);

  // Fetch items
  useEffect(() => {
    // If we don't have a category selected yet, check if we need to wait for categories to load
    // or if a default category redirect is about to happen.
    if (!selectedCategory) {
      if (categoriesLoading || !categories) {
        return;
      }
      const hasActiveCategories = categories.some((c) => c.isActive && !c.parentId);
      if (hasActiveCategories) {
        return;
      }
    }

    setItemsLoading(true);
    setItemsError(null);
    fetch(itemsUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load menu');
        return res.json();
      })
      .then((json) => {
        const data = json.data.map((item: MenuItem) => ({
          ...item,
          image: getFullUrl(item.image)
        }));
        setItems(data);
        setPagination(json.pagination);
      })
      .catch((err) => setItemsError(err.message))
      .finally(() => setItemsLoading(false));
  }, [itemsUrl, selectedCategory, categories, categoriesLoading]);

  const activeCategories = categories?.filter((c) => c.isActive && !c.parentId) || [];
  const activeItems = items.filter((i) => i.isActive && (!i.trackStock || i.stockQty > 0));

  function handleCategoryClick(catId: string) {
    const params = new URLSearchParams(searchParams);
    params.set('category', catId);
    params.set('page', '1');
    setSearchParams(params, { replace: true });
    setMobileCategoriesOpen(false);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams);
    if (newPage > 1) {
      params.set('page', String(newPage));
    } else {
      params.delete('page');
    }
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-main">{menuTitle}</h1>
        <p className="mt-2 text-sub">{menuDesc}</p>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={t('menu.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-input rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-main"
          />
        </div>
      </div>

      {/* Mobile category toggle */}
      <button
        className="md:hidden flex items-center gap-2 mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
        onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        {mobileCategoriesOpen ? t('menu.categories') : t('menu.categories')}
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Category sidebar */}
        <aside className={`md:w-56 shrink-0 ${mobileCategoriesOpen ? '' : 'hidden md:block'}`}>
          <nav className="space-y-1">
            {categoriesLoading && (
              <div className="px-3 py-2 text-sm text-gray-400">{t('common.loading')}</div>
            )}
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-sub hover:bg-surface'
                  }`}
              >
                {getTranslated(cat.name, cat.nameTranslations, i18n.language)}
                <span className="text-hint ml-1 text-xs">({cat._count.menuItems})</span>
              </button>
            ))}

            {!categoriesLoading && activeCategories.length > 0 && (
              <button
                onClick={() => handleCategoryClick('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === 'all'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-sub hover:bg-surface'
                  }`}
              >
                {t('menu.allCategories')}
              </button>
            )}
          </nav>
        </aside>

        {/* Menu items grid */}
        <div className="flex-1">
          {itemsLoading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          )}

          {itemsError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              {t('common.error')}
            </div>
          )}

          {!itemsLoading && !itemsError && activeItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('menu.noItems')}</p>
            </div>
          )}

          {!itemsLoading && activeItems.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className="surface-card rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow text-left"
                  >
                    {item.image ? (
                      <img src={item.image} alt={getTranslated(item.name, item.nameTranslations, i18n.language)} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                        <svg className="w-12 h-12 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-main">{getTranslated(item.name, item.nameTranslations, i18n.language)}</h3>
                        <span className="text-primary-600 font-bold whitespace-nowrap">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-sub mt-1 line-clamp-2">{getTranslated(item.description, item.descriptionTranslations, i18n.language)}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-hint bg-surface px-2 py-0.5 rounded-full border border-input">
                          {getTranslated(item.category.name, item.category.nameTranslations, i18n.language)}
                        </span>
                        {item._count.options > 0 && (
                          <span className="text-xs text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full font-medium">
                            {t('menu.options')}
                          </span>
                        )}
                      </div>

                      {/* Divider and Tags */}
                      <div className="mt-3 pt-3 border-t border-input/50">
                        <div className="flex flex-wrap gap-1.5">
                          {item.allergens?.map((a) => (
                            <span 
                              key={a.allergen.id} 
                              className="text-[10px] bg-red-100 px-1.5 py-0.5 rounded border border-red-200 font-bold uppercase tracking-tight"
                              style={{ color: '#991b1b' }}
                            >
                              {getTranslated(a.allergen.name, a.allergen.nameTranslations, i18n.language)}
                            </span>
                          ))}
                          {item.dietaryPreferences?.map((d) => (
                            <span 
                              key={d.dietaryPreference.id} 
                              className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 font-bold uppercase tracking-tight"
                              style={{ color: '#78350f' }}
                            >
                              {getTranslated(d.dietaryPreference.name, d.dietaryPreference.nameTranslations, i18n.language)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="px-3 py-1.5 text-sm border border-input rounded-lg disabled:opacity-40 hover:bg-surface text-sub transition-colors"
                  >
                    {t('locations.previous')}
                  </button>
                  <span className="text-sm text-sub">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className="px-3 py-1.5 text-sm border border-input rounded-lg disabled:opacity-40 hover:bg-surface text-sub transition-colors"
                  >
                    {t('locations.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Item detail modal */}
      {selectedItemId && (
        <MenuItemModal
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </div>
  );
}

function buildItemsUrl(categoryId: string | null, search: string, page: number, locationId: string | null): string {
  const params = new URLSearchParams();
  if (categoryId && categoryId !== 'all') params.set('categoryId', categoryId);
  if (search) params.set('search', search);
  if (page > 1) params.set('page', String(page));
  if (locationId) params.set('locationId', locationId);
  params.set('limit', '12');
  return `${API_BASE}/menu/items?${params}`;
}
