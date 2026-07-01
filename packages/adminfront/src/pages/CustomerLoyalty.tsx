import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

interface Customer {
  id: string;
  name: string;
  email: string;
  loyaltyPoints: number;
}

interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string | null;
  createdAt: string;
  order: { orderNumber: string } | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export default function CustomerLoyalty() {
  const { t } = useTranslation();
  // Original Customer States
  const [searchEmail, setSearchEmail] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustDesc, setAdjustDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New Redemption Rules States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [redemptionRules, setRedemptionRules] = useState<Record<string, { isRedeemable: boolean; maxRedemptionAmount: number }>>({});
  const [menuSearch, setMenuSearch] = useState('');
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);

  useEffect(() => {
    fetchMenuAndRules();
  }, []);

  const fetchMenuAndRules = async () => {
    setRulesLoading(true);
    try {
      const [menuRes, settingsRes] = await Promise.all([
        api.get<{ data: MenuItem[] }>('/menu/items'),
        api.get<{ data: any }>('/settings/advanced')
      ]);
      setMenuItems(menuRes.data || []);
      const advanced = settingsRes.data || {};
      setRedemptionRules(advanced.loyaltyRedemptionRules || {});
    } catch (err: any) {
      console.error('Failed to load menu or advanced settings:', err);
      setError(t('autoGen.admin.key496'));
    } finally {
      setRulesLoading(false);
    }
  };

  const searchCustomer = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.get<{ data: Customer[] }>(`/dashboard/customers?email=${encodeURIComponent(searchEmail)}`);
      if (res.data.length === 0) {
        setError(t('autoGen.admin.key497'));
        setCustomer(null);
        return;
      }
      setCustomer(res.data[0]);
      setTransactions([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!customer) return;
    const points = parseInt(adjustPoints);
    if (isNaN(points) || points === 0) {
      setError(t('autoGen.admin.key498'));
      return;
    }

    setError('');
    setSuccess('');
    try {
      await api.post(`/loyalty/customers/${customer.id}/adjust`, {
        points,
        description: adjustDesc || undefined,
      });
      setCustomer({ ...customer, loyaltyPoints: customer.loyaltyPoints + points });
      setAdjustPoints('');
      setAdjustDesc('');
      setSuccess(`${points > 0 ? '+' : ''}${points} 點數已成功調整`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleRedeemable = (itemId: string) => {
  const current = redemptionRules[itemId] || { isRedeemable: false, maxRedemptionAmount: 0 };
    setRedemptionRules({
      ...redemptionRules,
      [itemId]: {
        ...current,
        isRedeemable: !current.isRedeemable,
      }
    });
  };

  const handleAmountChange = (itemId: string, val: string) => {
    const num = parseFloat(val);
    const current = redemptionRules[itemId] || { isRedeemable: false, maxRedemptionAmount: 0 };
    setRedemptionRules({
      ...redemptionRules,
      [itemId]: {
        ...current,
        maxRedemptionAmount: isNaN(num) ? 0 : num,
      }
    });
  };

  const handleSaveRules = async () => {
    setRulesSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/settings/advanced', {
        loyaltyRedemptionRules: redemptionRules
      });
      setSuccess(t('autoGen.admin.key499'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || t('autoGen.admin.key500'));
    } finally {
      setRulesSaving(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('autoGen.admin.key501')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('autoGen.admin.key502')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl mb-6 shadow-sm transition-all duration-300">
          <p className="font-semibold">{t('autoGen.admin.key503')}</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-r-xl mb-6 shadow-sm transition-all duration-300">
          <p className="font-semibold">{t('autoGen.admin.key504')}</p>
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Member Management */}
        <div className="lg:col-span-5 space-y-6">
          {/* Find Customer */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>{t('autoGen.admin.key505')}</span>
            </h2>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={t('autoGen.admin.key506')}
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCustomer()}
                className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                aria-label={t('autoGen.admin.key507')}
              />
              <button
                onClick={searchCustomer}
                disabled={loading || !searchEmail}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-sm"
              >
                {loading ? t('autoGen.admin.key508') : t('autoGen.admin.key509')}
              </button>
            </div>
          </div>

          {customer && (
            <div className="space-y-6 animate-fadeIn">
              {/* Customer Info Card */}
              <div className="bg-gradient-to-br from-primary-600 to-orange-500 rounded-2xl shadow-md text-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="bg-white/20 text-xs px-2.5 py-1 rounded-full font-medium">{t('autoGen.admin.key510')}</span>
                    <h3 className="text-xl font-bold mt-3">{customer.name}</h3>
                    <p className="text-sm text-white/80 mt-1">{customer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/70">{t('autoGen.admin.key511')}</p>
                    <p className="text-4xl font-extrabold mt-1">{customer.loyaltyPoints}</p>
                    <p className="text-xs text-white/80 mt-1">{t('autoGen.admin.key512')} {(customer.loyaltyPoints / 100).toFixed(1)} {t('autoGen.admin.key513')}</p>
                  </div>
                </div>
              </div>

              {/* Adjust Points Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t('autoGen.admin.key514')}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('autoGen.admin.key515')}</label>
                    <input
                      type="number"
                      placeholder={t('autoGen.admin.key516')}
                      value={adjustPoints}
                      onChange={(e) => setAdjustPoints(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      aria-label={t('autoGen.admin.key517')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('autoGen.admin.key518')}</label>
                    <input
                      type="text"
                      placeholder={t('autoGen.admin.key519')}
                      value={adjustDesc}
                      onChange={(e) => setAdjustDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      aria-label={t('autoGen.admin.key520')}
                    />
                  </div>
                  <button
                    onClick={handleAdjust}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                  >
                    {t('autoGen.admin.key521')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Product Point Margin Controls */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('autoGen.admin.key522')}</h2>
                <p className="text-xs text-gray-400 mt-1">{t('autoGen.admin.key523')}</p>
              </div>
              <button
                onClick={handleSaveRules}
                disabled={rulesSaving || rulesLoading}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                {rulesSaving ? t('autoGen.admin.key524') : t('autoGen.admin.key525')}
              </button>
            </div>

            {/* Product Search Bar */}
            <div className="mb-4 relative">
              <input
                type="text"
                placeholder={t('autoGen.admin.key526')}
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
              <span className="absolute left-3 top-3.5 text-gray-400 text-sm"></span>
            </div>

            {rulesLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">{t('autoGen.admin.key527')}</p>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {filteredMenuItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">{t('autoGen.admin.key528')}</div>
                ) : (
                  filteredMenuItems.map((item) => {
                    const rule = redemptionRules[item.id] || { isRedeemable: false, maxRedemptionAmount: 0 };
                    return (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t('autoGen.admin.key529')} {item.price} {t('autoGen.admin.key530')}</span>
                            {!item.isActive && (
                              <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded">{t('autoGen.admin.key531')}</span>
                            )}
                          </div>
                        </div>

                        {/* Switch controls */}
                        <div className="flex items-center gap-4 sm:gap-6">
                          {/* Toggle Switch */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">{t('autoGen.admin.key532')}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleRedeemable(item.id)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                                rule.isRedeemable ? 'bg-primary-600' : 'bg-gray-200'
                              }`}
                              aria-pressed={rule.isRedeemable}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  rule.isRedeemable ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Max Redemption Amount Input */}
                          <div className="flex items-center gap-2 w-32 sm:w-36">
                            <span className="text-xs font-medium text-gray-500">{t('autoGen.admin.key533')}</span>
                            <div className="relative rounded-lg shadow-sm w-full">
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                                <span className="text-xs text-gray-400">$</span>
                              </div>
                              <input
                                type="number"
                                min="0"
                                disabled={!rule.isRedeemable}
                                value={rule.isRedeemable ? (rule.maxRedemptionAmount || '') : ''}
                                onChange={(e) => handleAmountChange(item.id, e.target.value)}
                                placeholder={t('autoGen.admin.key534')}
                                className="block w-full rounded-lg border border-gray-300 py-1.5 pl-5 pr-2 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 transition-all text-right font-medium"
                                aria-label={`${item.name} 折抵上限`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
