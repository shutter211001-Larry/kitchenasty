import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function CouponForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Stepper State
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [code, setCode] = useState('');
  const [type, setType] = useState('PERCENTAGE'); // PERCENTAGE, FIXED, FREE_DELIVERY, BOGO (送N件商品)
  const [value, setValue] = useState(0);
  const [minOrder, setMinOrder] = useState(0);
  const [minItemCount, setMinItemCount] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [isUnlimitedUsage, setIsUnlimitedUsage] = useState(true);
  const [perCustomer, setPerCustomer] = useState(1);
  const [isUnlimitedPerCustomer, setIsUnlimitedPerCustomer] = useState(false);
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
        setIsUnlimitedUsage(c.usageLimit === null);
        setPerCustomer(c.perCustomer);
        setIsUnlimitedPerCustomer(c.perCustomer === 0);
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

  const validateStep = (step: number) => {
  if (step === 1 && !code.trim() && !isAutomatic) {
      setError(t('couponForm.pleaseEnterPromoCode'));
      return false;
    }
    setError('');
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(s => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

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
      code: isAutomatic && !code ? 'AUTO_' + Date.now() : code,
      type,
      value,
      minOrder,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      usageLimit: isUnlimitedUsage ? null : (usageLimit ? parseInt(usageLimit) : null),
      perCustomer: isUnlimitedPerCustomer ? 0 : perCustomer,
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

  const stepTitles = [
    t('couponForm.basicSettings'),
    t('couponForm.triggerThreshold'),
    t('couponForm.discountMethod'),
    t('couponForm.applicableItems')
  ];

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/promotions" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? t('couponForm.editPromotion') : t('couponForm.addPromotion')}
        </h1>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
          <div 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-primary-600 -z-10 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          ></div>
          
          {stepTitles.map((title, index) => {
            const stepNum = index + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            
            return (
              <div key={stepNum} className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-4 border-white
                    ${isCurrent ? 'bg-primary-600 text-white shadow-md' : 
                      isCompleted ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                >
                  {isCompleted ? (
                     <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-primary-700' : 'text-gray-500'}`}>
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {error && <div className="mb-6 text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-200">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('couponForm.basicAndTimeSettings')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('couponForm.promoCode')}</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder={isAutomatic ? t('couponForm.autoGenerateIfEmpty') : "SAVE20"}
                  required={!isAutomatic}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                />
              </div>
              <div className="flex flex-col gap-3 justify-center mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('couponForm.isActive')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutomatic}
                    onChange={(e) => setIsAutomatic(e.target.checked)}
                    className="rounded border-gray-300 w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-bold text-indigo-700">{t('couponForm.autoApplyDiscount')}</span>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('couponForm.startDate')}</label>
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('couponForm.endDate')}</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('couponForm.maxUsagePerCustomer')}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={perCustomer}
                    onChange={(e) => setPerCustomer(parseInt(e.target.value) || 1)}
                    disabled={isUnlimitedPerCustomer}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none ${isUnlimitedPerCustomer ? 'bg-gray-100 text-gray-400' : ''}`}
                  />
                  <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnlimitedPerCustomer}
                      onChange={(e) => {
                        setIsUnlimitedPerCustomer(e.target.checked);
                        if (e.target.checked) setPerCustomer(0);
                        else setPerCustomer(1);
                      }}
                      className="rounded border-gray-300 w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('couponForm.unlimitedUsage')}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('couponForm.maxTotalUsage')}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    disabled={isUnlimitedUsage}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none ${isUnlimitedUsage ? 'bg-gray-100 text-gray-400' : ''}`}
                  />
                  <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnlimitedUsage}
                      onChange={(e) => {
                        setIsUnlimitedUsage(e.target.checked);
                        if (e.target.checked) setUsageLimit('');
                      }}
                      className="rounded border-gray-300 w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('couponForm.unlimitedTimes')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Thresholds */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('couponForm.triggerThresholds')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('couponForm.thresholdRequirementDescription')}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-800 mb-2">{t('couponForm.minSpendAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minOrder}
                  onChange={(e) => setMinOrder(parseFloat(e.target.value) || 0)}
                  placeholder={t('couponForm.zeroForNoLimit')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-primary-500 outline-none bg-white shadow-sm"
                />
                <p className="text-xs text-gray-500 mt-2">{t('couponForm.minSpendExample')}</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-800 mb-2">{t('couponForm.minPurchaseQuantity')}</label>
                <input
                  type="number"
                  min="0"
                  value={minItemCount}
                  onChange={(e) => setMinItemCount(parseInt(e.target.value) || 0)}
                  placeholder={t('couponForm.zeroForNoQuantityLimit')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-primary-500 outline-none bg-white shadow-sm"
                />
                <p className="text-xs text-gray-500 mt-2">{t('couponForm.minQuantityExample')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Discount Method */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('couponForm.discountSetup')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('couponForm.discountSetupDescription')}</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('couponForm.discountType')}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-primary-500 outline-none shadow-sm font-medium text-gray-800"
              >
                <option value="PERCENTAGE">{t('couponForm.percentageOff')}</option>
                <option value="FIXED">{t('couponForm.fixedAmountOff')}</option>
                <option value="BOGO">{t('couponForm.buyXGetY')}</option>
                <option value="FREE_DELIVERY">{t('couponForm.freeDelivery')}</option>
              </select>
            </div>

            {/* Value Inputs for PERCENTAGE or FIXED */}
            {(type === 'PERCENTAGE' || type === 'FIXED') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-green-50 rounded-xl border border-green-100">
                <div>
                  <label className="block text-sm font-bold text-green-900 mb-2">
                    {t('couponForm.discountValue')} {type === 'PERCENTAGE' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    step={type === 'PERCENTAGE' ? '1' : '0.01'}
                    min="0"
                    value={value}
                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg text-base focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  {type === 'PERCENTAGE' && <p className="text-xs text-green-700 mt-2">{t('couponForm.discountValueExample')}</p>}
                </div>
                {type === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-sm font-bold text-green-900 mb-2">{t('couponForm.maxDiscountAmount')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      placeholder={t('couponForm.noLimit')}
                      className="w-full px-4 py-3 border border-green-200 rounded-lg text-base focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* GET_N_ITEMS (BOGO) Config */}
            {type === 'BOGO' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-sm font-bold text-blue-900 mb-2">{t('couponForm.getNItems')}</label>
                  <input
                    type="number"
                    min="1"
                    value={getQuantity}
                    onChange={(e) => setGetQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-blue-700 mt-2">{t('couponForm.getNItemsDescription')}</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-blue-900 mb-2">{t('couponForm.giftDiscountMethod')}</label>
                    <select
                      value={getDiscountType}
                      onChange={(e) => setGetDiscountType(e.target.value as any)}
                      className="w-full px-4 py-3 border border-blue-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="FREE">{t('couponForm.freeGift')}</option>
                      <option value="PERCENTAGE">{t('couponForm.secondItemDiscount')}</option>
                      <option value="FIXED">{t('couponForm.secondItemFixedPrice')}</option>
                    </select>
                  </div>
                  {getDiscountType !== 'FREE' && (
                    <div>
                      <label className="block text-sm font-bold text-blue-900 mb-2">{t('couponForm.value')}</label>
                      <input
                        type="number"
                        min="0"
                        step={getDiscountType === 'PERCENTAGE' ? '1' : '0.01'}
                        value={getDiscountValue}
                        onChange={(e) => setGetDiscountValue(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-blue-200 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Applicable Items */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('couponForm.applicableItemsSetup')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('couponForm.applicableItemsDescription')}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-800 mb-3">{t('couponForm.selectApplicableCategories')}</label>
                <div className="h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                      <input
                        type="checkbox"
                        checked={applicableCategoryIds.includes(cat.id)}
                        onChange={(e) => {
                          if (e.target.checked) setApplicableCategoryIds([...applicableCategoryIds, cat.id]);
                          else setApplicableCategoryIds(applicableCategoryIds.filter(id => id !== cat.id));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{cat.name || cat.id}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 font-medium bg-white p-2 rounded border border-gray-100">{t('couponForm.allItemsApplyIfEmpty')}</p>
              </div>

              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-800 mb-3">{t('couponForm.selectApplicableItems')}</label>
                <div className="h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {menuItems.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                      <input
                        type="checkbox"
                        checked={applicableMenuItemIds.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) setApplicableMenuItemIds([...applicableMenuItemIds, item.id]);
                          else setApplicableMenuItemIds(applicableMenuItemIds.filter(id => id !== item.id));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{item.name || item.id}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Get Group Target (For BOGO only) */}
            {type === 'BOGO' && (
              <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-blue-900">{t('couponForm.selectGiftGroup')}</h3>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                    <input
                      type="checkbox"
                      checked={isGetGroupDifferent}
                      onChange={(e) => setIsGetGroupDifferent(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-blue-800">{t('couponForm.giftDiffersFromItems')}</span>
                  </label>
                </div>

                {isGetGroupDifferent ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('couponForm.selectGiftCategories')}</label>
                      <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                        {categories.map((cat) => (
                          <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getCategoryIds.includes(cat.id)}
                              onChange={(e) => {
                                if (e.target.checked) setGetCategoryIds([...getCategoryIds, cat.id]);
                                else setGetCategoryIds(getCategoryIds.filter(id => id !== cat.id));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {cat.name || cat.id}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('couponForm.selectGiftItem')}</label>
                      <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                        {menuItems.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-sm text-gray-700 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={getMenuItemIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) setGetMenuItemIds([...getMenuItemIds, item.id]);
                                else setGetMenuItemIds(getMenuItemIds.filter(id => id !== item.id));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {item.name || item.id}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-700">{t('couponForm.currentSettingGiftDiscount')}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1 || saving}
          className="px-6 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white shadow-sm"
        >
          {t('couponForm.previousStep')}
        </button>

        <div className="flex gap-3">
          <Link
            to="/promotions"
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('couponForm.cancel')}
          </Link>
          
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-8 py-2.5 rounded-lg text-sm font-bold transition-colors bg-primary-600 text-white hover:bg-primary-700 shadow-sm"
            >
              {t('couponForm.nextStep')}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-2.5 rounded-lg text-sm font-bold transition-colors bg-green-600 text-white hover:bg-green-700 shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? t('couponForm.saving') : isEdit ? t('couponForm.updatePromotion') : t('couponForm.createPromotion')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
