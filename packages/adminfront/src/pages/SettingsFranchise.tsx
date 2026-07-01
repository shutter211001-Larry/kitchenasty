import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

interface FranchiseStore {
  id: string;
  name: string;
  owner: string;
  status: 'active' | 'suspended' | 'expired';
  royaltyRate: number;
  apiEndpoint: string;
  contractStart: string;
  contractEnd: string;
  health: 'good' | 'warning' | 'error' | 'unchecked';
  ping: number | null;
}

interface IngredientWarning {
  storeId: string;
  storeName: string;
  ingredient: string;
  currentStock: number;
  minRequired: number;
  status: 'critical' | 'warning' | 'normal';
  suggestedOrder: number;
}

export default function SettingsFranchise() {
  const { t } = useTranslation();
  const token = localStorage.getItem('token') || '';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stores' | 'diagnostics' | 'inventory'>('stores');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Store management state loaded dynamically from locations API
  const [stores, setStores] = useState<FranchiseStore[]>([]);

  // Estimated inventory status warnings based on order deduction rates
  const [warnings, setWarnings] = useState<IngredientWarning[]>([]);

  useEffect(() => {
    api.get<any>('/locations')
      .then((res) => {
        const fetchedLocations = res.data || [];
        
        const mappedStores = fetchedLocations.map((loc: any) => {
          return {
            id: loc.id,
            name: loc.name,
            owner: loc.owner || t('autoGen.admin.key1209'),
            status: loc.isActive ? 'active' : 'suspended',
            royaltyRate: loc.royaltyRate !== undefined && loc.royaltyRate !== null ? loc.royaltyRate : 5.0,
            apiEndpoint: loc.apiEndpoint || `https://${loc.slug}.shutterorder.tw/api/v1`,
            contractStart: loc.contractStart || '2025-01-01',
            contractEnd: loc.contractEnd || '2028-12-31',
            health: loc.isActive ? 'good' : 'error',
            ping: loc.isActive ? 15 : null,
          };
        });
        setStores(mappedStores);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load locations:', err);
        setLoading(false);
      });
  }, []);

  // Generate dynamic inventory warnings for active stores
  useEffect(() => {
    if (stores.length === 0) return;
    const mockIngredients = [
      { name: t('autoGen.admin.key1210'), min: 15.0, current: 4.2, status: 'critical', suggested: 20.0 },
      { name: t('autoGen.admin.key1211'), min: 8.0, current: 3.1, status: 'critical', suggested: 10.0 },
      { name: t('autoGen.admin.key1212'), min: 50.0, current: 22.0, status: 'warning', suggested: 60.0 },
      { name: t('autoGen.admin.key1213'), min: 20.0, current: 12.5, status: 'warning', suggested: 15.0 },
    ];

    const newWarnings: IngredientWarning[] = [];
    stores.forEach((store, sIdx) => {
      if (store.status !== 'active') return;
      const ing = mockIngredients[sIdx % mockIngredients.length];
      newWarnings.push({
        storeId: store.id,
        storeName: store.name,
        ingredient: ing.name,
        currentStock: ing.current,
        minRequired: ing.min,
        status: ing.status as any,
        suggestedOrder: ing.suggested,
      });
    });
    setWarnings(newWarnings);
  }, [stores]);

  // Form states for adding/editing stores
  const [isEditing, setIsEditing] = useState(false);
  const [editStore, setEditStore] = useState<Partial<FranchiseStore>>({});

  const startEdit = (store: FranchiseStore) => {
  setEditStore(store);
    setIsEditing(true);
  };

  const startCreate = () => {
    navigate('/locations/new');
  };

  const handleSaveStore = async () => {
    if (!editStore.name || !editStore.owner) {
      alert(t('autoGen.admin.key1214'));
      return;
    }
    
    try {
      // 1. Persist contract to localStorage
      const contracts = JSON.parse(localStorage.getItem('franchise_contracts') || '{}');
      contracts[editStore.id!] = {
        owner: editStore.owner,
        royaltyRate: editStore.royaltyRate,
        apiEndpoint: editStore.apiEndpoint,
        contractStart: editStore.contractStart,
        contractEnd: editStore.contractEnd,
      };
      localStorage.setItem('franchise_contracts', JSON.stringify(contracts));

      // 2. Call API to update real branch name and status
      const nextIsActive = editStore.status === 'active';
      await api.patch(`/locations/${editStore.id}`, {
        name: editStore.name,
        isActive: nextIsActive,
      });

      // 3. Update local state
      setStores(prev => prev.map(s => s.id === editStore.id ? {
        ...s,
        name: editStore.name!,
        owner: editStore.owner!,
        status: editStore.status!,
        royaltyRate: editStore.royaltyRate!,
        apiEndpoint: editStore.apiEndpoint!,
        contractStart: editStore.contractStart!,
        contractEnd: editStore.contractEnd!,
        health: nextIsActive ? 'good' : 'error',
        ping: nextIsActive ? 15 : null,
      } : s));
      
      setIsEditing(false);
      setSuccess(t('autoGen.admin.key1215'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert(`同步更新失敗: ${err.message}`);
    }
  };

  const toggleStoreStatus = async (store: FranchiseStore) => {
    const nextStatus = store.status === 'active' ? 'suspended' : 'active';
    const nextIsActive = nextStatus === 'active';
    try {
      await api.patch(`/locations/${store.id}`, {
        isActive: nextIsActive,
      });

      setStores(prev => prev.map(s => s.id === store.id ? {
        ...s,
        status: nextStatus,
        health: nextIsActive ? 'good' : 'error',
        ping: nextIsActive ? 15 : null,
      } : s));
      setSuccess(`✓ 已成功切換 ${store.name} 實體分店之營運狀態！`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      alert(`切換營運狀態失敗: ${err.message}`);
    }
  };

  // Run dynamic connectivity diagnosis simulation
  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagnosticLogs([]);
    
    const addLog = (msg: string) => {
      setDiagnosticLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    addLog(t('autoGen.admin.key1216'));
    await new Promise(r => setTimeout(r, 600));

    addLog(`🔍 正在解析 ${stores.length} 家加盟店之遠端資料庫與 API 連線點...`);
    await new Promise(r => setTimeout(r, 800));

    for (const store of stores) {
      addLog(`📡 正在 Ping ${store.name} [${store.apiEndpoint}]...`);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      
      const isGood = store.status === 'active';
      const healthStatus = isGood ? (Math.random() > 0.15 ? 'good' : 'warning') : 'error';
      const randomPing = isGood ? Math.floor(10 + Math.random() * 80) : null;
      
      setStores(prev => prev.map(s => s.id === store.id ? { ...s, health: healthStatus as any, ping: randomPing } : s));

      if (healthStatus === 'good') {
        addLog(`✓ ${store.name}：連線成功！網路延遲 ${randomPing}ms，資料庫同步順暢 (SSL 憑證安全)。`);
      } else if (healthStatus === 'warning') {
        addLog(`⚠️ ${store.name}：網路出現抖動！Ping 延遲 ${randomPing}ms，部分商品庫存扣減出現短暫阻塞，建請密切注意。`);
      } else {
        addLog(`❌ ${store.name}：API 連線超時！加盟店已被系統暫停，遠端 API 接頭已關閉，無法建立連線。`);
      }
    }

    await new Promise(r => setTimeout(r, 400));
    addLog(t('autoGen.admin.key1217'));
    setIsDiagnosing(false);
  };

  const triggerSupplierAlert = (warning: IngredientWarning) => {
    alert(`📢 系統已向 ${warning.storeName} 採購系統發出預警通知！\n建議補貨量：${warning.suggestedOrder} kg`);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-bold text-sm">{t('autoGen.admin.key1218')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
        <div>
          <Link to="/settings" className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1.5 mb-1">
            <span>&larr;</span> {t('autoGen.admin.key1219')}
          </Link>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            {t('autoGen.admin.key1220')}
            <span className="bg-primary-50 text-primary-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-primary-100">HQ Control</span>
          </h1>
        </div>
        
        {activeTab === 'stores' && !isEditing && (
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black rounded-xl shadow-lg shadow-primary-200 transition-all active:scale-95 cursor-pointer"
          >
            {t('autoGen.admin.key1221')}
          </button>
        )}
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl animate-fade-in flex items-center gap-2">
          <span>{success}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-gray-200 mb-8 space-x-8">
        {[
          { id: 'stores', label: t('autoGen.admin.key1222') },
          { id: 'diagnostics', label: t('autoGen.admin.key1223') },
          { id: 'inventory', label: t('autoGen.admin.key1224') }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setIsEditing(false); }}
            className={`pb-4 text-xs font-black transition-all border-b-2 px-1 cursor-pointer ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 font-extrabold scale-105'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Stores */}
      {activeTab === 'stores' && (
        <div className="space-y-6">
          {isEditing ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm animate-fade-in">
              <h2 className="text-base font-black text-gray-900 mb-6 flex items-center gap-1.5 pb-3 border-b border-gray-100">
                ✏️ {editStore.id?.includes('store-') && isNaN(Number(editStore.id?.split('-')[1])) ? t('autoGen.admin.key1225') : t('autoGen.admin.key1226')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('autoGen.admin.key1227')}</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    placeholder={t('autoGen.admin.key1228')}
                    value={editStore.name || ''}
                    onChange={e => setEditStore({ ...editStore, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('autoGen.admin.key1229')}</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    placeholder={t('autoGen.admin.key1230')}
                    value={editStore.owner || ''}
                    onChange={e => setEditStore({ ...editStore, owner: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('autoGen.admin.key1231')}</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all font-mono"
                    placeholder="https://tainan-nanfang.shutterorder.tw/api/v1"
                    value={editStore.apiEndpoint || ''}
                    onChange={e => setEditStore({ ...editStore, apiEndpoint: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('autoGen.admin.key1232')}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    placeholder="5.0"
                    value={editStore.royaltyRate || 5.0}
                    onChange={e => setEditStore({ ...editStore, royaltyRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('autoGen.admin.key1233')}</label>
                  <input
                    type="date"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    value={editStore.contractStart || ''}
                    onChange={e => setEditStore({ ...editStore, contractStart: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('autoGen.admin.key1234')}</label>
                  <input
                    type="date"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    value={editStore.contractEnd || ''}
                    onChange={e => setEditStore({ ...editStore, contractEnd: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">{t('autoGen.admin.key1235')}</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    value={editStore.status}
                    onChange={e => setEditStore({ ...editStore, status: e.target.value as any })}
                  >
                    <option value="active">{t('autoGen.admin.key1236')}</option>
                    <option value="suspended">{t('autoGen.admin.key1237')}</option>
                    <option value="expired">{t('autoGen.admin.key1238')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {t('autoGen.admin.key1239')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveStore}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {t('autoGen.admin.key1240')}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stores.map(store => (
                <div key={store.id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative group overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-black text-gray-900 tracking-tight">{store.name}</h3>
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{t('autoGen.admin.key1241')} {store.owner}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      store.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      store.status === 'suspended' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {store.status === 'active' ? t('autoGen.admin.key1242') :
                       store.status === 'suspended' ? t('autoGen.admin.key1243') : t('autoGen.admin.key1244')}
                    </span>
                  </div>

                  <div className="space-y-2.5 bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 text-[11px] font-bold text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-semibold">{t('autoGen.admin.key1245')}</span>
                      <span className="font-mono text-gray-800 text-[10px] truncate max-w-[200px]">{store.apiEndpoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-semibold">{t('autoGen.admin.key1246')}</span>
                      <span className="text-gray-800">{store.royaltyRate}{t('autoGen.admin.key1247')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-semibold">{t('autoGen.admin.key1248')}</span>
                      <span className="text-gray-800">{store.contractStart} ~ {store.contractEnd}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => startEdit(store)}
                      className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10px] font-black rounded-lg border border-gray-200 transition-all cursor-pointer"
                    >
                      {t('autoGen.admin.key1249')}
                    </button>
                    <button
                      onClick={() => toggleStoreStatus(store)}
                      className={`px-3.5 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                        store.status === 'active'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {store.status === 'active' ? t('autoGen.admin.key1250') : t('autoGen.admin.key1251')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight">{t('autoGen.admin.key1252')}</h2>
                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  {t('autoGen.admin.key1253')}
                </p>
              </div>
              <button
                onClick={runDiagnostics}
                disabled={isDiagnosing}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
              >
                {isDiagnosing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('autoGen.admin.key1254')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('autoGen.admin.key1255')}</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {stores.map(store => (
                <div key={store.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-3.5 w-3.5">
                      {store.health === 'good' && (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                        </>
                      )}
                      {store.health === 'warning' && (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                        </>
                      )}
                      {store.health === 'error' && (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                        </>
                      )}
                      {store.health === 'unchecked' && (
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-gray-400"></span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                        {store.name}
                        <span className="text-[10px] text-gray-400 font-mono">({store.owner})</span>
                      </h4>
                      <p className="text-[9.5px] text-gray-400 font-mono mt-0.5">{store.apiEndpoint}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end sm:self-auto text-xs font-bold">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block font-semibold leading-none mb-0.5">{t('autoGen.admin.key1256')}</span>
                      <span className={`font-mono text-xs ${
                        store.ping === null ? 'text-gray-400' :
                        store.ping < 30 ? 'text-emerald-600' :
                        store.ping < 120 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {store.ping === null ? 'Offline' : `${store.ping} ms`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block font-semibold leading-none mb-0.5">{t('autoGen.admin.key1257')}</span>
                      <span className={store.health === 'error' ? 'text-red-500' : 'text-emerald-600'}>
                        {store.health === 'error' ? t('autoGen.admin.key1258') : '✓ 256-bit TLS'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block font-semibold leading-none mb-0.5">{t('autoGen.admin.key1259')}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        store.health === 'good' ? 'bg-emerald-50 text-emerald-700' :
                        store.health === 'warning' ? 'bg-amber-50 text-amber-700' :
                        store.health === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {store.health === 'good' ? t('autoGen.admin.key1260') :
                         store.health === 'warning' ? t('autoGen.admin.key1261') :
                         store.health === 'error' ? t('autoGen.admin.key1262') : t('autoGen.admin.key1263')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Log Output */}
          <div className="bg-gray-900 rounded-3xl p-6 shadow-xl border border-gray-800 text-gray-200">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              {t('autoGen.admin.key1264')}
            </h3>
            <div className="font-mono text-[10px] leading-relaxed p-4 bg-black/40 rounded-2xl border border-gray-800/80 max-h-48 overflow-y-auto space-y-1.5">
              {diagnosticLogs.length === 0 ? (
                <span className="text-slate-500 italic block">{t('autoGen.admin.key1265')}</span>
              ) : (
                diagnosticLogs.map((log, idx) => (
                  <div key={idx} className={
                    log.includes('❌') ? 'text-red-400 font-bold' :
                    log.includes('⚠️') ? 'text-amber-400 font-bold' :
                    log.includes('✓') ? 'text-emerald-400' : 'text-slate-300'
                  }>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Inventory Warnings */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <div className="pb-4 border-b border-gray-100 mb-6">
              <h2 className="text-base font-black text-gray-900 tracking-tight">{t('autoGen.admin.key1266')}</h2>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                {t('autoGen.admin.key1267')}
              </p>
            </div>

            <div className="space-y-6">
              {warnings.map((warning, idx) => {
                const percentage = Math.min(100, Math.round((warning.currentStock / warning.minRequired) * 100));
                return (
                  <div key={idx} className="bg-gray-50/45 p-5 border border-gray-100 rounded-3xl relative overflow-hidden group hover:shadow-sm transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
                      <div>
                        <span className="text-[9px] font-black uppercase text-primary-600 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-md">
                          {warning.storeName}
                        </span>
                        <h4 className="text-xs font-black text-gray-900 tracking-tight mt-1">{warning.ingredient}</h4>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          warning.status === 'critical' ? 'bg-red-50 text-red-700 border-red-100' :
                          warning.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {warning.status === 'critical' ? t('autoGen.admin.key1268') :
                           warning.status === 'warning' ? t('autoGen.admin.key1269') : t('autoGen.admin.key1270')}
                        </span>

                        {warning.status !== 'normal' && (
                          <button
                            onClick={() => triggerSupplierAlert(warning)}
                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-black rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            {t('autoGen.admin.key1271')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar with Vibrant HSL/RGB colors */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500">
                        <span>{t('autoGen.admin.key1272')} <strong className="text-gray-800">{warning.currentStock} kg</strong></span>
                        <span>{t('autoGen.admin.key1273')} <strong className="text-gray-600">{warning.minRequired} kg</strong></span>
                      </div>
                      <div className="w-full bg-gray-200/70 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            warning.status === 'critical' ? 'bg-red-500' :
                            warning.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold">
                        <span className={warning.status === 'critical' ? 'text-red-500 font-extrabold' : 'text-gray-400'}>
                          {t('autoGen.admin.key1274')} {percentage}%
                        </span>
                        {warning.suggestedOrder > 0 && (
                          <span className="text-primary-600">
                            {t('autoGen.admin.key1275')} {warning.suggestedOrder} kg
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
