import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function CouponForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [code, setCode] = useState('');
  const [type, setType] = useState('PERCENTAGE');
  const [value, setValue] = useState(0);
  const [minOrder, setMinOrder] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [perCustomer, setPerCustomer] = useState(1);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isAutomatic, setIsAutomatic] = useState(false);
  
  // BOGO specific states
  const [bogoMode, setBogoMode] = useState<'BUY_GET' | 'VOLUME'>('BUY_GET');
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [getQuantity, setGetQuantity] = useState<number>(1);
  const [getDiscountType, setGetDiscountType] = useState<'FREE' | 'PERCENTAGE' | 'FIXED'>('FREE');
  const [getDiscountValue, setGetDiscountValue] = useState<number>(0);
  const [applicableCategoryIds, setApplicableCategoryIds] = useState<string[]>([]);
  const [applicableMenuItemIds, setApplicableMenuItemIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ id: string; name?: string }[]>([]);
  const [menuItems, setMenuItems] = useState<{ id: string; name?: string }[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    // Fetch categories and menu items for advanced conditions
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
            if (c.type === 'BOGO') {
              const bq = parsed.buyQuantity !== undefined ? parsed.buyQuantity : 1;
              setBuyQuantity(bq);
              setGetQuantity(parsed.getQuantity || 1);
              setGetDiscountType(parsed.getDiscountType || 'FREE');
              setGetDiscountValue(parsed.getDiscountValue || 0);
              setBogoMode(bq === 0 ? 'VOLUME' : 'BUY_GET');
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

    if (type === 'BOGO') {
      conditionsObj.buyQuantity = bogoMode === 'VOLUME' ? 0 : buyQuantity;
      conditionsObj.getQuantity = getQuantity;
      conditionsObj.getDiscountType = getDiscountType;
      conditionsObj.getDiscountValue = getDiscountValue;
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
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/promotions" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '編輯優惠券' : '新增優惠券'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">優惠類型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="PERCENTAGE">百分比折扣 (Percentage Off)</option>
              <option value="FIXED">固定金額折扣 (Fixed Amount Off)</option>
              <option value="FREE_DELIVERY">免運費 (Free Delivery)</option>
              <option value="BOGO">數量組合優惠 (滿件折 / 買就送)</option>
            </select>
          </div>
        </div>

        {type === 'BOGO' && (
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
              數量組合優惠設定 (Quantity Combo Settings)
            </h3>
            
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="bogoMode"
                  checked={bogoMode === 'BUY_GET'}
                  onChange={() => { setBogoMode('BUY_GET'); setGetDiscountType('FREE'); }}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">買 X 送 Y (Buy X Get Y)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="bogoMode"
                  checked={bogoMode === 'VOLUME'}
                  onChange={() => { setBogoMode('VOLUME'); setGetDiscountType('PERCENTAGE'); }}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">滿 X 件享折扣 (Volume Discount)</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {bogoMode === 'BUY_GET' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">需購買數量 (Buy X items)</label>
                    <input
                      type="number"
                      min="1"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">優惠數量 (Get Y items)</label>
                    <input
                      type="number"
                      min="1"
                      value={getQuantity}
                      onChange={(e) => setGetQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">滿件門檻 (Min X items)</label>
                    <input
                      type="number"
                      min="1"
                      value={getQuantity}
                      onChange={(e) => setGetQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="text-sm text-gray-500 flex items-center">
                    (設定「2」代表只要滿2件，這2件都會享有下方設定的折扣)
                  </div>
                </>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">優惠方式 (Discount Type)</label>
                <select
                  value={getDiscountType}
                  onChange={(e) => setGetDiscountType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {bogoMode === 'BUY_GET' && <option value="FREE">免費送 (Free)</option>}
                  <option value="PERCENTAGE">打折 (Percentage Off)</option>
                  <option value="FIXED">固定金額折抵 (Fixed Amount Off)</option>
                </select>
              </div>
              {getDiscountType !== 'FREE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    優惠數值 {getDiscountType === 'PERCENTAGE' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={getDiscountType === 'PERCENTAGE' ? '1' : '0.01'}
                    value={getDiscountValue}
                    onChange={(e) => setGetDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-blue-700">提示：系統會以購物車內符合條件之最低價商品優先給予折扣。</p>
          </div>
        )}

        {type !== 'FREE_DELIVERY' && type !== 'BOGO' && (
          <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">最高折扣金額 ($)</label>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最低消費金額 ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minOrder}
              onChange={(e) => setMinOrder(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">總發行數量 (次)</label>
          <input
            type="number"
            min="1"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="無限制"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">啟用 (Active)</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAutomatic"
              checked={isAutomatic}
              onChange={(e) => setIsAutomatic(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isAutomatic" className="text-sm text-gray-700 font-bold text-indigo-700">
              自動滿額優惠 (結帳時自動套用，不須輸入代碼)
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <button 
            type="button" 
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
          >
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">進階條件 (Advanced Restrictions)</h3>
              <p className="text-xs text-gray-500">若未選擇，則優惠適用於全單所有商品。</p>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isAdvancedOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
          )}
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? '儲存中...' : isEdit ? '更新優惠券' : '建立優惠券'}
          </button>
          <Link
            to="/promotions"
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
