import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function CouponForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [code, setCode] = useState('');
  const [type, setType] = useState('PERCENTAGE'); // PERCENTAGE, FIXED, FREE_DELIVERY, BOGO (送N件商品)
  const [value, setValue] = useState(0);
  const [minOrder, setMinOrder] = useState(0);
  const [minItemCount, setMinItemCount] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [perCustomer, setPerCustomer] = useState(1);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isAutomatic, setIsAutomatic] = useState(false);
  
  // Participating items (Buy Group)
  const [applicableCategoryIds, setApplicableCategoryIds] = useState<string[]>([]);
  const [applicableMenuItemIds, setApplicableMenuItemIds] = useState<string[]>([]);
  
  // GET_N_ITEMS (BOGO) specific states
  const [getQuantity, setGetQuantity] = useState<number>(1);
  const [getDiscountType, setGetDiscountType] = useState<'FREE' | 'PERCENTAGE' | 'FIXED'>('FREE');
  const [getDiscountValue, setGetDiscountValue] = useState<number>(0);
  
  // Get Group (if different from Participating Items)
  const [isGetGroupDifferent, setIsGetGroupDifferent] = useState(false);
  const [getCategoryIds, setGetCategoryIds] = useState<string[]>([]);
  const [getMenuItemIds, setGetMenuItemIds] = useState<string[]>([]);

  const [categories, setCategories] = useState<{ id: string; name?: string }[]>([]);
  const [menuItems, setMenuItems] = useState<{ id: string; name?: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    Promise.all([
      api.get<any>('/menu/categories'),
      api.get<any>('/menu/items?limit=1000')
    ]).then(([catRes, itemRes]) => {
      if (catRes.data) setCategories(catRes.data);
      if (itemRes.data) setMenuItems(itemRes.data);
    }).catch(err => console.error('Failed to load menu data', err));

    if (!id) return;
    setLoading(true);
    fetch(`/api/coupons/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load coupon');
        return res.json();
      })
      .then((data) => {
        const c = data.data;
        setCode(c.code || '');
        setType(c.type);
        setValue(c.value);
        setMinOrder(c.minOrder);
        setMaxDiscount(c.maxDiscount !== null ? String(c.maxDiscount) : '');
        setUsageLimit(c.usageLimit !== null ? String(c.usageLimit) : '');
        setPerCustomer(c.perCustomer);
        setStartsAt(c.startsAt ? c.startsAt.split('T')[0] : '');
        setExpiresAt(c.expiresAt ? c.expiresAt.split('T')[0] : '');
        setIsActive(c.isActive);
        setIsAutomatic(c.isAutomatic || false);
        
        if (c.conditions) {
          try {
            const parsed = typeof c.conditions === 'string' ? JSON.parse(c.conditions) : c.conditions;
            setApplicableCategoryIds(parsed.applicableCategoryIds || []);
            setApplicableMenuItemIds(parsed.applicableMenuItemIds || []);
            setMinItemCount(parsed.minItemCount || 0);
            
            if (c.type === 'BOGO') {
              setGetQuantity(parsed.getQuantity || 1);
              setGetDiscountType(parsed.getDiscountType || 'FREE');
              setGetDiscountValue(parsed.getDiscountValue || 0);
              
              if ((parsed.getCategoryIds && parsed.getCategoryIds.length > 0) || 
                  (parsed.getMenuItemIds && parsed.getMenuItemIds.length > 0)) {
                setIsGetGroupDifferent(true);
                setGetCategoryIds(parsed.getCategoryIds || []);
                setGetMenuItemIds(parsed.getMenuItemIds || []);
              }
            }
          } catch (e) {
            console.error('Failed to parse conditions');
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const conditionsObj: any = {};
    if (applicableCategoryIds.length > 0) conditionsObj.applicableCategoryIds = applicableCategoryIds;
    if (applicableMenuItemIds.length > 0) conditionsObj.applicableMenuItemIds = applicableMenuItemIds;
    if (minItemCount > 0) conditionsObj.minItemCount = minItemCount;

    if (type === 'BOGO') {
      conditionsObj.getQuantity = getQuantity;
      conditionsObj.getDiscountType = getDiscountType;
      conditionsObj.getDiscountValue = getDiscountValue;
      
      if (isGetGroupDifferent) {
        if (getCategoryIds.length > 0) conditionsObj.getCategoryIds = getCategoryIds;
        if (getMenuItemIds.length > 0) conditionsObj.getMenuItemIds = getMenuItemIds;
      }
    }

    const body = {
      code,
      type,
      value,
      minOrder,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      perCustomer,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
      isActive,
      isAutomatic,
      conditions: Object.keys(conditionsObj).length > 0 ? JSON.stringify(conditionsObj) : null,
    };

    try {
      const url = isEdit ? `/api/coupons/${id}` : `/api/coupons`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save');
      navigate('/promotions');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/promotions" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '編輯優惠活動' : '新增優惠活動'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Basic Info & Active State */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">基本設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">優惠碼 / 活動代碼 (Code)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder={isAutomatic ? "AUTO_PROMO_01" : "SAVE20"}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none font-mono"
              />
            </div>
            <div className="flex flex-col gap-2 justify-center">
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">啟用 (Active)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutomatic}
                  onChange={(e) => setIsAutomatic(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-bold text-indigo-700">
                  自動套用優惠 (無需輸入代碼)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Participating Items (Buy Group) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">1. 參與商品 (Participating Items)</h2>
          <p className="text-sm text-gray-500 mb-4">決定哪些商品會被計入門檻（滿額/滿件），並適用後續的折扣。</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">指定適用分類 (Categories)</label>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applicableCategoryIds.includes(cat.id)}
                      onChange={(e) => {
                        if (e.target.checked) setApplicableCategoryIds([...applicableCategoryIds, cat.id]);
                        else setApplicableCategoryIds(applicableCategoryIds.filter(id => id !== cat.id));
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {cat.name || cat.id}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">* 若皆未勾選，表示全館商品皆參與。</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">指定適用單品 (Menu Items)</label>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {menuItems.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applicableMenuItemIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) setApplicableMenuItemIds([...applicableMenuItemIds, item.id]);
                        else setApplicableMenuItemIds(applicableMenuItemIds.filter(id => id !== item.id));
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {item.name || item.id}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Thresholds */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">2. 觸發門檻 (Thresholds)</h2>
          <p className="text-sm text-gray-500 mb-4">顧客購買的「參與商品」必須達到以下門檻，才會觸發折扣。</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最低消費金額 (滿額 $)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minOrder}
                onChange={(e) => setMinOrder(parseFloat(e.target.value) || 0)}
                placeholder="0 為無金額限制"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最低購買件數 (滿件)</label>
              <input
                type="number"
                min="0"
                value={minItemCount}
                onChange={(e) => setMinItemCount(parseInt(e.target.value) || 0)}
                placeholder="0 為無件數限制"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Discount Setup */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">3. 優惠設定 (Discount Setup)</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">優惠類型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50"
            >
              <option value="PERCENTAGE">打折 (Percentage Off)</option>
              <option value="FIXED">直接折抵金額 (Fixed Amount Off)</option>
              <option value="BOGO">送 N 件商品 (Get N Items Off)</option>
              <option value="FREE_DELIVERY">免運費 (Free Delivery)</option>
            </select>
          </div>

          {/* Value Inputs for PERCENTAGE or FIXED */}
          {(type === 'PERCENTAGE' || type === 'FIXED') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  折扣數值 {type === 'PERCENTAGE' ? '(%)' : '($)'}
                </label>
                <input
                  type="number"
                  step={type === 'PERCENTAGE' ? '1' : '0.01'}
                  min="0"
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              {type === 'PERCENTAGE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最高折扣金額上限 ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="無上限"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* GET_N_ITEMS (BOGO) Config */}
          {type === 'BOGO' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div>
                  <label className="block text-sm font-bold text-blue-900 mb-1">贈送件數 (Get N items)</label>
                  <input
                    type="number"
                    min="1"
                    value={getQuantity}
                    onChange={(e) => setGetQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-blue-700 mt-1">每次達成上方門檻時，可獲得 N 件商品折扣。</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">折扣方式</label>
                    <select
                      value={getDiscountType}
                      onChange={(e) => setGetDiscountType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="FREE">免費 (Free)</option>
                      <option value="PERCENTAGE">打折 (%)</option>
                      <option value="FIXED">固定特價 ($)</option>
                    </select>
                  </div>
                  {getDiscountType !== 'FREE' && (
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">數值</label>
                      <input
                        type="number"
                        min="0"
                        step={getDiscountType === 'PERCENTAGE' ? '1' : '0.01'}
                        value={getDiscountValue}
                        onChange={(e) => setGetDiscountValue(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Get Group Target */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-bold text-gray-900 mb-3">贈品區選擇 (Get Group)</h3>
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGetGroupDifferent}
                    onChange={(e) => setIsGetGroupDifferent(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">贈品區與「參與商品」**不同** (勾選以自訂)</span>
                </label>

                {isGetGroupDifferent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">贈品區分類</label>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                        {categories.map((cat) => (
                          <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getCategoryIds.includes(cat.id)}
                              onChange={(e) => {
                                if (e.target.checked) setGetCategoryIds([...getCategoryIds, cat.id]);
                                else setGetCategoryIds(getCategoryIds.filter(id => id !== cat.id));
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            {cat.name || cat.id}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">贈品區單品</label>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                        {menuItems.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getMenuItemIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) setGetMenuItemIds([...getMenuItemIds, item.id]);
                                else setGetMenuItemIds(getMenuItemIds.filter(id => id !== item.id));
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            {item.name || item.id}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Limits and Dates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">4. 限制與期限 (Limits & Dates)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">每位顧客使用限制 (次)</label>
              <input
                type="number"
                min="1"
                value={perCustomer}
                onChange={(e) => setPerCustomer(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">總發行數量限制 (次)</label>
              <input
                type="number"
                min="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="無限制"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生效日期</label>
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

        <div className="flex justify-end gap-3 pt-4">
          <Link
            to="/promotions"
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-8 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? '儲存中...' : isEdit ? '更新優惠券' : '建立優惠券'}
          </button>
        </div>
      </form>
    </div>
  );
}
