import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
  const token = localStorage.getItem('token') || '';
  const [activeTab, setActiveTab] = useState<'stores' | 'diagnostics' | 'inventory'>('stores');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  
  // Store management state
  const [stores, setStores] = useState<FranchiseStore[]>([
    {
      id: 'store-1',
      name: '台北信義旗艦店',
      owner: '陳大文',
      status: 'active',
      royaltyRate: 5.0,
      apiEndpoint: 'https://taipei-xinyi.shutterorder.tw/api/v1',
      contractStart: '2025-01-01',
      contractEnd: '2028-12-31',
      health: 'good',
      ping: 15,
    },
    {
      id: 'store-2',
      name: '新竹竹北科技店',
      owner: '林小明',
      status: 'active',
      royaltyRate: 4.5,
      apiEndpoint: 'https://hsinchu-zhubei.shutterorder.tw/api/v1',
      contractStart: '2025-03-15',
      contractEnd: '2028-03-14',
      health: 'good',
      ping: 28,
    },
    {
      id: 'store-3',
      name: '台中一中商圈店',
      owner: '張美玲',
      status: 'active',
      royaltyRate: 5.0,
      apiEndpoint: 'https://taichung-yizhong.shutterorder.tw/api/v1',
      contractStart: '2025-05-20',
      contractEnd: '2027-05-19',
      health: 'warning',
      ping: 112,
    },
    {
      id: 'store-4',
      name: '高雄左營巨蛋店',
      owner: '黃志強',
      status: 'suspended',
      royaltyRate: 4.0,
      apiEndpoint: 'https://kaohsiung-zuoying.shutterorder.tw/api/v1',
      contractStart: '2024-06-01',
      contractEnd: '2026-05-31',
      health: 'error',
      ping: null,
    },
  ]);

  // Estimated inventory status warnings based on order deduction rates
  const [warnings, setWarnings] = useState<IngredientWarning[]>([
    {
      storeId: 'store-3',
      storeName: '台中一中商圈店',
      ingredient: '莫札瑞拉起司 (Mozzarella)',
      currentStock: 4.2,
      minRequired: 15.0,
      status: 'critical',
      suggestedOrder: 20.0,
    },
    {
      storeId: 'store-3',
      storeName: '台中一中商圈店',
      ingredient: '美式臘腸片 (Pepperoni)',
      currentStock: 3.1,
      minRequired: 8.0,
      status: 'critical',
      suggestedOrder: 10.0,
    },
    {
      storeId: 'store-2',
      storeName: '新竹竹北科技店',
      ingredient: '高筋小麥麵粉 (High-Protein Flour)',
      currentStock: 22.0,
      minRequired: 50.0,
      status: 'warning',
      suggestedOrder: 60.0,
    },
    {
      storeId: 'store-1',
      storeName: '台北信義旗艦店',
      ingredient: '秘製番茄披薩醬 (Tomato Sauce)',
      currentStock: 12.5,
      minRequired: 20.0,
      status: 'warning',
      suggestedOrder: 15.0,
    },
    {
      storeId: 'store-1',
      storeName: '台北信義旗艦店',
      ingredient: '特級初榨橄欖油 (Extra Virgin Olive Oil)',
      currentStock: 18.0,
      minRequired: 10.0,
      status: 'normal',
      suggestedOrder: 0,
    },
  ]);

  // Form states for adding/editing stores
  const [isEditing, setIsEditing] = useState(false);
  const [editStore, setEditStore] = useState<Partial<FranchiseStore>>({});

  const startEdit = (store: FranchiseStore) => {
    setEditStore(store);
    setIsEditing(true);
  };

  const startCreate = () => {
    setEditStore({
      id: `store-${Date.now()}`,
      name: '',
      owner: '',
      status: 'active',
      royaltyRate: 5.0,
      apiEndpoint: '',
      contractStart: new Date().toISOString().split('T')[0],
      contractEnd: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      health: 'unchecked',
      ping: null,
    });
    setIsEditing(true);
  };

  const handleSaveStore = () => {
    if (!editStore.name || !editStore.owner) {
      alert('請填寫完整分店名稱與加盟主姓名！');
      return;
    }
    
    const existing = stores.find(s => s.id === editStore.id);
    if (existing) {
      setStores(stores.map(s => s.id === editStore.id ? (editStore as FranchiseStore) : s));
    } else {
      setStores([...stores, editStore as FranchiseStore]);
    }
    
    setIsEditing(false);
    setSuccess('✓ 加盟分店合約資料已成功儲存！');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Run dynamic connectivity diagnosis simulation
  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagnosticLogs([]);
    
    const addLog = (msg: string) => {
      setDiagnosticLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    addLog('🚀 啟動連鎖加盟分店 API 健康診斷監控引擎...');
    await new Promise(r => setTimeout(r, 600));

    addLog('🔍 正在解析 4 家加盟店之遠端資料庫與 API 連線點...');
    await new Promise(r => setTimeout(r, 800));

    // Update Taipei health
    addLog('📡 正在 Ping 台北信義旗艦店 [https://taipei-xinyi.shutterorder.tw/api/v1]...');
    await new Promise(r => setTimeout(r, 500));
    setStores(prev => prev.map(s => s.id === 'store-1' ? { ...s, health: 'good', ping: Math.floor(10 + Math.random() * 8) } : s));
    addLog('✓ 台北信義旗艦店：連線成功！網路延遲 14ms，資料庫同步順暢 (SSL 憑證安全)。');

    // Update Hsinchu health
    addLog('📡 正在 Ping 新竹竹北科技店 [https://hsinchu-zhubei.shutterorder.tw/api/v1]...');
    await new Promise(r => setTimeout(r, 700));
    setStores(prev => prev.map(s => s.id === 'store-2' ? { ...s, health: 'good', ping: Math.floor(20 + Math.random() * 12) } : s));
    addLog('✓ 新竹竹北科技店：連線成功！網路延遲 26ms，無待同步交易訂單。');

    // Update Taichung health
    addLog('📡 正在 Ping 台中一中商圈店 [https://taichung-yizhong.shutterorder.tw/api/v1]...');
    await new Promise(r => setTimeout(r, 1000));
    setStores(prev => prev.map(s => s.id === 'store-3' ? { ...s, health: 'warning', ping: Math.floor(100 + Math.random() * 50) } : s));
    addLog('⚠️ 台中一中商圈店：網路出現抖動！Ping 延遲 132ms，部分商品庫存扣減出現短暫阻塞，建請密切注意。');

    // Update Kaohsiung health
    addLog('📡 正在 Ping 高雄左營巨蛋店 [https://kaohsiung-zuoying.shutterorder.tw/api/v1]...');
    await new Promise(r => setTimeout(r, 800));
    setStores(prev => prev.map(s => s.id === 'store-4' ? { ...s, health: 'error', ping: null } : s));
    addLog('❌ 高雄左營巨蛋店：API 連線超時！加盟店已被系統暫停，遠端 API 接頭已關閉，無法建立連線。');

    await new Promise(r => setTimeout(r, 400));
    addLog('🏁 健康檢測完成！100% 診斷完畢。');
    setIsDiagnosing(false);
  };

  const triggerSupplierAlert = (warning: IngredientWarning) => {
    alert(`📢 系統已向 ${warning.storeName} 採購系統發出預警通知！\n建議補貨量：${warning.suggestedOrder} kg`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
        <div>
          <Link to="/settings" className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1.5 mb-1">
            <span>&larr;</span> 返回系統設定
          </Link>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            🏢 連鎖加盟總部與分店管理
            <span className="bg-primary-50 text-primary-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-primary-100">HQ Control</span>
          </h1>
        </div>
        
        {activeTab === 'stores' && !isEditing && (
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black rounded-xl shadow-lg shadow-primary-200 transition-all active:scale-95 cursor-pointer"
          >
            + 新增加盟分店
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
          { id: 'stores', label: '🏬 加盟分店合約與資訊' },
          { id: 'diagnostics', label: '📡 API 連線與遠端診斷' },
          { id: 'inventory', label: '⚖️ 加盟店原料預警監控' }
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
                ✏️ {editStore.id?.includes('store-') && isNaN(Number(editStore.id?.split('-')[1])) ? '建立全新加盟店合約' : '編輯分店合約與設定'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">分店名稱</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    placeholder="例如: 台南南紡購物店"
                    value={editStore.name || ''}
                    onChange={e => setEditStore({ ...editStore, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">加盟業主姓名</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    placeholder="例如: 李小飛"
                    value={editStore.owner || ''}
                    onChange={e => setEditStore({ ...editStore, owner: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">遠端 ERP API 端點 URL</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all font-mono"
                    placeholder="https://tainan-nanfang.shutterorder.tw/api/v1"
                    value={editStore.apiEndpoint || ''}
                    onChange={e => setEditStore({ ...editStore, apiEndpoint: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">總部抽成比率 (Royalty Rate %)</label>
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
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">合約起始日期</label>
                  <input
                    type="date"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    value={editStore.contractStart || ''}
                    onChange={e => setEditStore({ ...editStore, contractStart: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">合約結束日期</label>
                  <input
                    type="date"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    value={editStore.contractEnd || ''}
                    onChange={e => setEditStore({ ...editStore, contractEnd: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">合約授權狀態</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-primary-100 focus:bg-white transition-all"
                    value={editStore.status}
                    onChange={e => setEditStore({ ...editStore, status: e.target.value as any })}
                  >
                    <option value="active">🟢 營運授權中 (Active)</option>
                    <option value="suspended">🟡 暫時停權中 (Suspended)</option>
                    <option value="expired">🔴 合約已到期 (Expired)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  取消變更
                </button>
                <button
                  type="button"
                  onClick={handleSaveStore}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  儲存合約
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
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">加盟業主: {store.owner}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      store.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      store.status === 'suspended' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {store.status === 'active' ? '授權營運中' :
                       store.status === 'suspended' ? '暫時停權中' : '合約已到期'}
                    </span>
                  </div>

                  <div className="space-y-2.5 bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 text-[11px] font-bold text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-semibold">API 端點:</span>
                      <span className="font-mono text-gray-800 text-[10px] truncate max-w-[200px]">{store.apiEndpoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-semibold">總部抽成比:</span>
                      <span className="text-gray-800">{store.royaltyRate}% 營業額</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-semibold">合約期限:</span>
                      <span className="text-gray-800">{store.contractStart} ~ {store.contractEnd}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => startEdit(store)}
                      className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10px] font-black rounded-lg border border-gray-200 transition-all cursor-pointer"
                    >
                      ✏️ 編輯合約設定
                    </button>
                    <button
                      onClick={() => {
                        const nextStatus = store.status === 'active' ? 'suspended' : 'active';
                        setStores(stores.map(s => s.id === store.id ? { ...s, status: nextStatus } : s));
                        setSuccess(`✓ 已切換 ${store.name} 營運權限！`);
                        setTimeout(() => setSuccess(''), 2000);
                      }}
                      className={`px-3.5 py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                        store.status === 'active'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {store.status === 'active' ? '⚠️ 暫停授權' : '🟢 啟用授權'}
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
                <h2 className="text-base font-black text-gray-900 tracking-tight">📡 遠端加盟分店 API 健康連線診斷面板</h2>
                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  自動檢測各店 POS/ERP 端點的連線延遲、SSL 安全防護與資料同步健康度。
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
                    <span>診斷掃描中...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 開始一鍵健康連線診斷</span>
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
                      <span className="text-[10px] text-gray-400 block font-semibold leading-none mb-0.5">網路延遲</span>
                      <span className={`font-mono text-xs ${
                        store.ping === null ? 'text-gray-400' :
                        store.ping < 30 ? 'text-emerald-600' :
                        store.ping < 120 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {store.ping === null ? 'Offline' : `${store.ping} ms`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block font-semibold leading-none mb-0.5">安全連線 (SSL)</span>
                      <span className={store.health === 'error' ? 'text-red-500' : 'text-emerald-600'}>
                        {store.health === 'error' ? '未授權/關閉' : '✓ 256-bit TLS'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block font-semibold leading-none mb-0.5">連線狀態</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        store.health === 'good' ? 'bg-emerald-50 text-emerald-700' :
                        store.health === 'warning' ? 'bg-amber-50 text-amber-700' :
                        store.health === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {store.health === 'good' ? '正常 (Active)' :
                         store.health === 'warning' ? '微幅波動' :
                         store.health === 'error' ? '故障中斷' : '待診斷'}
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
              📟 系統自動化連線診斷終端日誌 (Auto diagnostic outputs)
            </h3>
            <div className="font-mono text-[10px] leading-relaxed p-4 bg-black/40 rounded-2xl border border-gray-800/80 max-h-48 overflow-y-auto space-y-1.5">
              {diagnosticLogs.length === 0 ? (
                <span className="text-slate-500 italic block">點擊上方「開始一鍵健康連線診斷」即可輸出遠端日誌。</span>
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
              <h2 className="text-base font-black text-gray-900 tracking-tight">⚖️ 加盟店預估庫存短缺預警看板</h2>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                依據各加盟店每日回傳的訂單銷貨量（扣減食譜配方中對應原料重量），自動計算預估剩餘量。低於安全值即亮起警示紅燈。
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
                          {warning.status === 'critical' ? '❌ 極度短缺' :
                           warning.status === 'warning' ? '⚠️ 低於安全水位' : '🟢 存量充沛'}
                        </span>

                        {warning.status !== 'normal' && (
                          <button
                            onClick={() => triggerSupplierAlert(warning)}
                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-black rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            🔔 發出叫貨通知
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar with Vibrant HSL/RGB colors */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500">
                        <span>預估剩餘存量: <strong className="text-gray-800">{warning.currentStock} kg</strong></span>
                        <span>最低安全水位: <strong className="text-gray-600">{warning.minRequired} kg</strong></span>
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
                          存量比例: {percentage}%
                        </span>
                        {warning.suggestedOrder > 0 && (
                          <span className="text-primary-600">
                            💡 建議總部配發量: {warning.suggestedOrder} kg
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
