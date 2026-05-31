import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface Category {
  id: string;
  name: string;
  trackSharedStock: boolean;
  sharedStockQty: number;
  sharedStockThreshold: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

export default function StockManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'WARNING' | 'SHARED' | 'INDEPENDENT'>('ALL');
  
  // UI Saving feedback states (to show instant green tick / loading)
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, itemRes] = await Promise.all([
        api.get<{ data: Category[] }>('/menu/categories'),
        api.get<{ data: MenuItem[] }>('/menu/items?limit=1000')
      ]);
      setCategories(catRes.data || []);
      setItems(itemRes.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || '無法載入庫存資料');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Instant update handler for MenuItem
  const handleItemUpdate = async (itemId: string, updates: Partial<MenuItem>) => {
    setSavingId(itemId);
    setSavedFeedbackId(null);
    try {
      // Find item in state to get current values as baseline
      const currentItem = items.find(i => i.id === itemId);
      if (!currentItem) return;

      const payload = {
        ...updates,
        // Ensure values are numbers
        stockQty: updates.stockQty !== undefined ? Number(updates.stockQty) : currentItem.stockQty,
      };

      const res = await api.patch<{ data: MenuItem }>(`/menu/items/${itemId}`, payload);
      
      // Update local state
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...res.data } : i));
      
      setSavedFeedbackId(itemId);
      setTimeout(() => setSavedFeedbackId(null), 1500);
    } catch (err: any) {
      alert(`更新商品庫存失敗: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  // Instant update handler for Category
  const handleCategoryUpdate = async (categoryId: string, updates: Partial<Category>) => {
    setSavingId(categoryId);
    setSavedFeedbackId(null);
    try {
      const currentCategory = categories.find(c => c.id === categoryId);
      if (!currentCategory) return;

      const payload = {
        ...updates,
        sharedStockQty: updates.sharedStockQty !== undefined ? Number(updates.sharedStockQty) : currentCategory.sharedStockQty,
        sharedStockThreshold: updates.sharedStockThreshold !== undefined ? Number(updates.sharedStockThreshold) : currentCategory.sharedStockThreshold,
      };

      const res = await api.patch<{ data: any }>(`/menu/categories/${categoryId}`, payload);
      
      // Update local state
      setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, ...res.data } : c));
      
      setSavedFeedbackId(categoryId);
      setTimeout(() => setSavedFeedbackId(null), 1500);
    } catch (err: any) {
      alert(`更新分類共用庫存失敗: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  // Stats calculators
  const totalItems = items.length;
  const trackedItems = items.filter(i => i.trackStock).length;
  
  // Calculate warning items (independently tracked <= 5 or parent category is warning/sold out)
  const warningItemsCount = items.filter(item => {
    const parentCategory = categories.find(c => c.id === item.categoryId);
    const categoryWarning = parentCategory?.trackSharedStock && parentCategory.sharedStockQty <= parentCategory.sharedStockThreshold;
    const independentWarning = item.trackStock && item.stockQty <= 5;
    return categoryWarning || independentWarning;
  }).length;

  const soldOutItemsCount = items.filter(item => {
    const parentCategory = categories.find(c => c.id === item.categoryId);
    const categorySoldOut = parentCategory?.trackSharedStock && parentCategory.sharedStockQty === 0;
    const independentSoldOut = item.trackStock && item.stockQty === 0;
    return categorySoldOut || independentSoldOut;
  }).length;

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategoryId || item.categoryId === selectedCategoryId;
    
    const parentCategory = categories.find(c => c.id === item.categoryId);
    const isShared = parentCategory?.trackSharedStock;
    const isWarning = (isShared && parentCategory!.sharedStockQty <= parentCategory!.sharedStockThreshold) || (item.trackStock && item.stockQty <= 5);

    if (filterType === 'WARNING') return matchesSearch && matchesCategory && isWarning;
    if (filterType === 'SHARED') return matchesSearch && matchesCategory && isShared;
    if (filterType === 'INDEPENDENT') return matchesSearch && matchesCategory && item.trackStock;
    return matchesSearch && matchesCategory;
  });

  // Group filtered items by category
  const itemsByCategoryId = filteredItems.reduce((acc, item) => {
    if (!acc[item.categoryId]) acc[item.categoryId] = [];
    acc[item.categoryId].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">載入商品與庫存關聯中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📦 雙重庫存關係面板 (Double-Stock Matrix)</h2>
          <p className="text-sm text-gray-500 mt-1">
            視覺化觀察「分類共用庫存 (如：當日麵團顆數)」與「商品獨立庫存」的關聯。您可在本頁面直接修改，系統會即時存檔。
          </p>
        </div>
        <button
          onClick={fetchData}
          className="self-start md:self-auto px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors inline-flex items-center gap-1.5"
        >
          🔄 重新整理
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline font-medium hover:text-red-900">重試</button>
        </div>
      )}

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 transition-all hover:shadow-md">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">總商品品項</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{totalItems} <span className="text-xs text-gray-400 font-normal">個</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 transition-all hover:shadow-md">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">獨立追蹤庫存</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{trackedItems} <span className="text-xs text-gray-400 font-normal">品項</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 transition-all hover:shadow-md">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">⚠️ 庫存預警 / 低庫存</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{warningItemsCount} <span className="text-xs text-gray-400 font-normal">品項</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 transition-all hover:shadow-md">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">🚫 已售完 / 缺貨中</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{soldOutItemsCount} <span className="text-xs text-gray-400 font-normal">品項</span></div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Search */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">搜尋商品</label>
          <input
            type="text"
            placeholder="搜尋商品名稱，例如：瑪格麗特..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Category select */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">按商品分類篩選</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">全部分類</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.trackSharedStock ? ' (共用庫存)' : ''}</option>
            ))}
          </select>
        </div>

        {/* Filter type buttons */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">快速狀態過濾</label>
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              onClick={() => setFilterType('ALL')}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-colors ${filterType === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterType('WARNING')}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-colors ${filterType === 'WARNING' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'}`}
            >
              預警/缺貨
            </button>
            <button
              onClick={() => setFilterType('SHARED')}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-colors ${filterType === 'SHARED' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-indigo-600'}`}
            >
              共用分類
            </button>
            <button
              onClick={() => setFilterType('INDEPENDENT')}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-colors ${filterType === 'INDEPENDENT' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              獨立追蹤
            </button>
          </div>
        </div>
      </div>

      {/* Main Stock Matrix Grid */}
      <div className="space-y-8">
        {categories
          .filter(cat => !selectedCategoryId || cat.id === selectedCategoryId)
          .map((cat) => {
            const catItems = itemsByCategoryId[cat.id] || [];
            if (catItems.length === 0 && searchTerm) return null; // Hide categories with no matches during search

            return (
              <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-250 overflow-hidden">
                {/* Category Header Bar */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      🏷️ {cat.name}
                      <span className="text-xs text-gray-400 font-normal">({catItems.length} 個品項)</span>
                    </h3>
                  </div>

                  {/* Shared Category Stock Toggle / Config */}
                  <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.trackSharedStock}
                        onChange={(e) => handleCategoryUpdate(cat.id, { trackSharedStock: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-gray-700">分類當日共用庫存</span>
                    </label>

                    {cat.trackSharedStock && (
                      <div className="flex items-center gap-4 border-l border-gray-200 pl-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 font-medium">總庫存:</span>
                          <div className="flex items-center">
                            <button
                              onClick={() => handleCategoryUpdate(cat.id, { sharedStockQty: Math.max(0, cat.sharedStockQty - 1) })}
                              className="w-6 h-6 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-l flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={cat.sharedStockQty}
                              onChange={(e) => handleCategoryUpdate(cat.id, { sharedStockQty: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-12 h-6 border-y border-gray-200 text-center text-xs font-bold focus:ring-0 focus:outline-none"
                            />
                            <button
                              onClick={() => handleCategoryUpdate(cat.id, { sharedStockQty: cat.sharedStockQty + 1 })}
                              className="w-6 h-6 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-r flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 font-medium">預警提示門檻:</span>
                          <input
                            type="number"
                            value={cat.sharedStockThreshold}
                            onChange={(e) => handleCategoryUpdate(cat.id, { sharedStockThreshold: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-10 h-6 border border-gray-200 rounded text-center text-xs font-bold focus:ring-0 focus:outline-none"
                          />
                        </div>

                        {/* Category Shared Badge */}
                        {cat.sharedStockQty === 0 ? (
                          <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px] font-extrabold">
                            🚫 分類售完
                          </span>
                        ) : cat.sharedStockQty <= cat.sharedStockThreshold ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                            ⚠️ 分類低庫存
                          </span>
                        ) : (
                          <span className="text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded text-[10px] font-bold">
                            📦 共用充足
                          </span>
                        )}
                      </div>
                    )}

                    {/* Loading/Saved feedback indicator for Category */}
                    {savingId === cat.id && (
                      <span className="text-[10px] text-gray-400 animate-pulse pl-1">儲存中...</span>
                    )}
                    {savedFeedbackId === cat.id && (
                      <span className="text-[10px] text-green-600 font-bold pl-1 animate-bounce">✓ 已同步</span>
                    )}
                  </div>
                </div>

                {/* Products Table */}
                {catItems.length === 0 ? (
                  <div className="px-6 py-4 text-center text-sm text-gray-400 italic">
                    此分類下尚無匹配的商品品項。
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-150">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">商品名稱</th>
                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">獨立庫存追蹤</th>
                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">獨立庫存數量</th>
                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">有效實際庫存 (Effective Stock)</th>
                        <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">庫存狀態關係</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 bg-white">
                      {catItems.map((item) => {
                        // Calculate stock levels
                        const hasCategoryStock = cat.trackSharedStock;
                        const hasIndependentStock = item.trackStock;
                        
                        // Effective Stock logic:
                        // 1. If category trackSharedStock is enabled, it limits the total.
                        // 2. If item trackStock is also enabled, it is MIN(category, item).
                        // 3. If item trackStock is NOT enabled, it is bounded ONLY by category sharedStockQty.
                        // 4. If neither are enabled, it is unlimited.
                        let effectiveStock: number | string = '無限制';
                        let isWarning = false;
                        let isSoldOut = false;
                        
                        if (hasCategoryStock && hasIndependentStock) {
                          effectiveStock = Math.min(cat.sharedStockQty, item.stockQty);
                          isSoldOut = effectiveStock === 0;
                          isWarning = effectiveStock <= Math.max(cat.sharedStockThreshold, 5);
                        } else if (hasCategoryStock && !hasIndependentStock) {
                          effectiveStock = cat.sharedStockQty;
                          isSoldOut = cat.sharedStockQty === 0;
                          isWarning = cat.sharedStockQty <= cat.sharedStockThreshold;
                        } else if (!hasCategoryStock && hasIndependentStock) {
                          effectiveStock = item.stockQty;
                          isSoldOut = item.stockQty === 0;
                          isWarning = item.stockQty <= 5; // Default 5 threshold for independent
                        }

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* Product Name */}
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-400">NT$ {item.price}</div>
                            </td>

                            {/* Independent Tracking switch */}
                            <td className="px-6 py-3 whitespace-nowrap">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={item.trackStock}
                                  onChange={(e) => handleItemUpdate(item.id, { trackStock: e.target.checked })}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                                />
                                <span className="text-xs font-medium text-gray-600">啟用獨立庫存</span>
                              </label>
                            </td>

                            {/* Independent Stock Quantity control */}
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  disabled={!item.trackStock}
                                  onClick={() => handleItemUpdate(item.id, { stockQty: Math.max(0, item.stockQty - 1) })}
                                  className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-l flex items-center justify-center font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  disabled={!item.trackStock}
                                  value={item.trackStock ? item.stockQty : ''}
                                  placeholder="無限制"
                                  onChange={(e) => handleItemUpdate(item.id, { stockQty: Math.max(0, parseInt(e.target.value) || 0) })}
                                  className="w-16 h-7 border-y border-gray-200 text-center text-xs font-bold focus:ring-0 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                />
                                <button
                                  type="button"
                                  disabled={!item.trackStock}
                                  onClick={() => handleItemUpdate(item.id, { stockQty: item.stockQty + 1 })}
                                  className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-r flex items-center justify-center font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  +
                                </button>

                                {/* Item specific feedback indicators */}
                                {savingId === item.id && (
                                  <span className="text-[10px] text-gray-400 animate-pulse ml-2">存...</span>
                                )}
                                {savedFeedbackId === item.id && (
                                  <span className="text-[10px] text-green-600 font-bold ml-2 animate-bounce">✓</span>
                                )}
                              </div>
                            </td>

                            {/* Effective Stock quantity */}
                            <td className="px-6 py-3 whitespace-nowrap">
                              {typeof effectiveStock === 'number' ? (
                                <span className={`text-sm font-extrabold ${isSoldOut ? 'text-red-700' : isWarning ? 'text-amber-700 animate-pulse' : 'text-indigo-600'}`}>
                                  {effectiveStock} <span className="text-xs font-normal text-gray-400">份</span>
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">∞ (無限制)</span>
                              )}
                            </td>

                            {/* Relationships Description Badge */}
                            <td className="px-6 py-3 whitespace-nowrap">
                              {hasCategoryStock && hasIndependentStock ? (
                                <div className="flex flex-col gap-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 max-w-max">
                                    🔗 雙重限制模式
                                  </span>
                                  <span className="text-[10px] text-gray-400 leading-normal">
                                    取較小值：分類({cat.sharedStockQty}) 與 獨立({item.stockQty})
                                  </span>
                                </div>
                              ) : hasCategoryStock && !hasIndependentStock ? (
                                <div className="flex flex-col gap-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 max-w-max">
                                    🍩 僅分類限制
                                  </span>
                                  <span className="text-[10px] text-gray-400 leading-normal">
                                    僅受分類當日共用庫存 ({cat.sharedStockQty}) 限制
                                  </span>
                                </div>
                              ) : !hasCategoryStock && hasIndependentStock ? (
                                <div className="flex flex-col gap-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 max-w-max">
                                    📦 僅商品獨立
                                  </span>
                                  <span className="text-[10px] text-gray-400 leading-normal">
                                    僅追蹤此商品獨立庫存數量 ({item.stockQty})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">無庫存限制 (可無限下單)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
