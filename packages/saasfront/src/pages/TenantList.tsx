import React, { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api.js';
import { toast } from 'react-hot-toast';
import { Plus, Server, Edit, Trash2, Key, Globe, Check, X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  hasErpAccess: boolean;
  subscriptionEndsAt: string | null;
  createdAt: string;
  _count?: {
    users: number;
    locations: number;
    orders: number;
  };
  users?: {
    name: string;
    email: string;
    phone: string | null;
  }[];
}

export default function TenantList() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
  
  // Inline editing states
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [domainValue, setDomainValue] = useState('');
  
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expValue, setExpValue] = useState('');
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const [confirmReset, setConfirmReset] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await api.get<{ data: Tenant[] }>('/platform-admin/tenants');
      setTenants(res.data);
    } catch (error) {
      toast.error('無法獲取租戶列表');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (tenant: Tenant) => {
    try {
      await api.patch<{ data: Tenant }>(`/platform-admin/tenants/${tenant.id}`, {
        isActive: !tenant.isActive
      });
      toast.success(tenant.isActive ? '租戶已停權' : '租戶已啟用');
      fetchTenants();
    } catch (error) {
      toast.error('無法更新租戶狀態');
    }
  };

  const toggleErpAccess = async (tenant: Tenant) => {
    try {
      await api.patch<{ data: Tenant }>(`/platform-admin/tenants/${tenant.id}`, {
        hasErpAccess: !tenant.hasErpAccess
      });
      toast.success(tenant.hasErpAccess ? 'ERP 存取已停用' : 'ERP 存取已啟用');
      fetchTenants();
    } catch (error) {
      toast.error('無法更新 ERP 存取權限');
    }
  };

  const saveDomain = async (tenant: Tenant) => {
    try {
      await api.patch(`/platform-admin/tenants/${tenant.id}`, { domain: domainValue.toLowerCase().trim() || null });
      toast.success('網域更新成功');
      setEditingDomainId(null);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || '無法更新網域');
    }
  };

  const saveExpiration = async (tenant: Tenant) => {
    try {
      await api.patch(`/platform-admin/tenants/${tenant.id}`, { subscriptionEndsAt: expValue || null });
      toast.success('到期日更新成功');
      setEditingExpId(null);
      fetchTenants();
    } catch (e) {
      toast.error('日期格式無效或更新失敗');
    }
  };

  const confirmDeleteTenant = async (tenant: Tenant) => {
    if (deleteConfirmName !== tenant.name) {
      return toast.error('名稱不符，取消刪除');
    }
    const loadingToast = toast.loading('正在刪除租戶與所有資料...');
    try {
      await api.delete(`/platform-admin/tenants/${tenant.id}`);
      toast.success('租戶已永久刪除', { id: loadingToast });
      setDeletingId(null);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || '刪除失敗', { id: loadingToast });
    }
  };

  const handleResetDemo = async () => {
    const loadingToast = toast.loading('開始重設示範資料...');
    try {
      await api.post('/platform-admin/tenants/reset-demo', {});
      toast.success('已啟動示範資料重設程序。', { id: loadingToast });
      setConfirmReset(false);
      setTimeout(fetchTenants, 5000);
    } catch (error) {
      toast.error('重設失敗。', { id: loadingToast });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">正在載入租戶...</div>;
  }

  // Dashboard Stats
  const activeTenants = tenants.filter(t => t.isActive).length;
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);
  
  const pendingRenewals = tenants.filter(t => {
    if (!t.subscriptionEndsAt) return false;
    const endsAt = new Date(t.subscriptionEndsAt);
    return endsAt > now && endsAt <= thirtyDaysFromNow;
  }).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <Server className="w-6 h-6 text-indigo-400" />
            租戶管理
          </h1>
          <p className="text-gray-400 text-sm mt-1">管理 SaaS 實例、網域與訂閱。</p>
        </div>
        <div className="flex gap-3 items-center">
          {confirmReset ? (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/50 px-3 py-1.5 rounded-lg">
              <span className="text-sm text-red-400 font-medium mr-2">確定重設？</span>
              <button onClick={handleResetDemo} className="p-1 hover:bg-red-500/20 text-red-400 rounded">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setConfirmReset(false)} className="p-1 hover:bg-gray-700 text-gray-400 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              重設示範資料
            </button>
          )}
          
          <button
            onClick={() => navigate('/tenants/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增租戶
          </button>
        </div>
      </div>

      {/* Top Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">總租戶數</p>
          <h3 className="text-2xl font-semibold text-white">{tenants.length}</h3>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">有效訂閱數</p>
          <h3 className="text-2xl font-semibold text-white">{activeTenants}</h3>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">待續約數</p>
          <h3 className="text-2xl font-semibold text-white">{pendingRenewals}</h3>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-visible shadow-sm">
        <div className="w-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-900/50 border-b border-gray-800 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">租戶</th>
                <th className="px-6 py-4 font-medium">狀態</th>
                <th className="px-6 py-4 font-medium">指標與權限</th>
                <th className="px-6 py-4 font-medium">建立日期</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 text-gray-300">
              {tenants.map((t) => {
                let statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
                let statusText = "啟用中";
                
                if (!t.isActive) {
                  statusColor = "text-red-400 border-red-500/20 bg-red-500/10";
                  statusText = "已停權";
                } else if (t.subscriptionEndsAt) {
                  const endsAt = new Date(t.subscriptionEndsAt);
                  if (endsAt < now) {
                    statusColor = "text-red-400 border-red-500/20 bg-red-500/10";
                    statusText = "已到期";
                  } else if (endsAt <= thirtyDaysFromNow) {
                    statusColor = "text-amber-400 border-amber-500/20 bg-amber-500/10";
                    statusText = "即將到期";
                  }
                }

                return (
                  <React.Fragment key={t.id}>
                    <tr 
                      className={`hover:bg-gray-800/30 transition-colors group cursor-pointer ${expandedTenantId === t.id ? 'bg-gray-800/20' : ''}`}
                      onClick={() => setExpandedTenantId(expandedTenantId === t.id ? null : t.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-medium border border-gray-700">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{t.name}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{t.domain || '無自訂網域'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusColor}`}>
                          {statusText}
                        </span>
                        {t.subscriptionEndsAt && (
                          <p className="text-xs text-gray-500 mt-1.5">
                            到期日：{new Date(t.subscriptionEndsAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-gray-400">
                            使用者: {t._count?.users || 0} <span className="mx-1 text-gray-600">|</span> 門市: {t._count?.locations || 0}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleErpAccess(t); }}
                              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${t.hasErpAccess ? 'bg-indigo-500' : 'bg-gray-700'}`}
                            >
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${t.hasErpAccess ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                            </button>
                            <span className="text-xs text-gray-500">ERP 模組</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
                              
                              if (t.domain && !isLocal) {
                                const protocol = t.domain.includes('localhost') ? 'http' : 'https';
                                let adminHost = `admin.${t.domain}`;
                                if (t.domain.endsWith('.shutterorder.pro')) {
                                  const subdomain = t.domain.replace('.shutterorder.pro', '');
                                  adminHost = `${subdomain}.admin.shutterorder.pro`;
                                }
                                window.open(`${protocol}://${adminHost}`, '_blank');
                              } else {
                                const baseUrl = import.meta.env.VITE_ADMIN_URL_PUBLIC || 'http://localhost:5173';
                                window.open(`${baseUrl}?set_tenant_id=${t.id}`, '_blank');
                              }
                            }}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-xs font-medium transition-colors border border-gray-700"
                          >
                            開啟後台
                          </button>
                          <span className="text-xs text-indigo-400 ml-2">
                            {expandedTenantId === t.id ? '收合' : '設定'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Detail / Edit Row */}
                    {expandedTenantId === t.id && (
                      <tr className="bg-gray-800/40 border-b border-gray-800/50 shadow-inner">
                        <td colSpan={5} className="px-6 py-6 cursor-default">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-sm text-gray-300 px-2">
                            
                            {/* Column 1: Basic Info */}
                            <div>
                              <h4 className="font-semibold text-white mb-4 pb-2 border-b border-gray-700 flex items-center gap-2">
                                購買者基本資料
                              </h4>
                              <div className="space-y-3">
                                <p className="flex"><span className="text-gray-500 w-16 shrink-0">姓名：</span> <span className="text-gray-200">{t.users?.[0]?.name || '未提供'}</span></p>
                                <p className="flex"><span className="text-gray-500 w-16 shrink-0">信箱：</span> <span className="text-gray-200">{t.users?.[0]?.email || '未提供'}</span></p>
                                <p className="flex"><span className="text-gray-500 w-16 shrink-0">電話：</span> <span className="text-gray-200">{t.users?.[0]?.phone || '未提供'}</span></p>
                              </div>
                            </div>

                            {/* Column 2: Advanced Settings */}
                            <div>
                              <h4 className="font-semibold text-white mb-4 pb-2 border-b border-gray-700 flex items-center gap-2">
                                租約與進階設定
                              </h4>
                              <div className="space-y-4">
                                {/* Domain Setting */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-500">自訂網域：</span>
                                    {editingDomainId !== t.id && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingDomainId(t.id); setDomainValue(t.domain || ''); }}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                      >
                                        <Edit className="w-3 h-3" /> 編輯
                                      </button>
                                    )}
                                  </div>
                                  {editingDomainId === t.id ? (
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="text" 
                                        value={domainValue}
                                        onChange={(e) => setDomainValue(e.target.value)}
                                        placeholder="例如 test.localhost"
                                        className="bg-gray-900 border border-gray-700 text-white text-sm rounded-md px-2 py-1 flex-1 focus:outline-none focus:border-indigo-500"
                                      />
                                      <button onClick={() => saveDomain(t)} className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded"><Check className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => setEditingDomainId(null)} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                  ) : (
                                    <p className="text-gray-200 font-mono bg-gray-900/50 px-2 py-1 rounded border border-gray-800">
                                      {t.domain || '尚未設定'}
                                    </p>
                                  )}
                                </div>

                                {/* Expiration Setting */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-500">到期日：</span>
                                    {editingExpId !== t.id && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingExpId(t.id); setExpValue(t.subscriptionEndsAt ? new Date(t.subscriptionEndsAt).toISOString().split('T')[0] : ''); }}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                      >
                                        <Edit className="w-3 h-3" /> 編輯
                                      </button>
                                    )}
                                  </div>
                                  {editingExpId === t.id ? (
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="date" 
                                        value={expValue}
                                        onChange={(e) => setExpValue(e.target.value)}
                                        className="bg-gray-900 border border-gray-700 text-white text-sm rounded-md px-2 py-1 flex-1 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                                      />
                                      <button onClick={() => saveExpiration(t)} className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded"><Check className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => setEditingExpId(null)} className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                  ) : (
                                    <p className="text-gray-200 bg-gray-900/50 px-2 py-1 rounded border border-gray-800">
                                      {t.subscriptionEndsAt ? new Date(t.subscriptionEndsAt).toLocaleDateString() : '無期限'}
                                    </p>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => navigate(`/tenants/${t.id}/integrations`, { state: { tenantName: t.name } })}
                                  className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                                >
                                  <Key className="w-4 h-4 text-indigo-400" />
                                  設定第三方整合 (LINE / 支付 / 發票)
                                </button>
                              </div>
                            </div>

                            {/* Column 3: Danger Zone */}
                            <div>
                              <h4 className="font-semibold text-red-400 mb-4 pb-2 border-b border-red-900/30 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> 危險操作
                              </h4>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                                  <div>
                                    <p className="text-white font-medium">租約狀態</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{t.isActive ? '目前允許登入與營運' : '已禁止所有存取'}</p>
                                  </div>
                                  <button
                                    onClick={() => toggleStatus(t)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${t.isActive ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                                  >
                                    {t.isActive ? '停權此租戶' : '恢復啟用'}
                                  </button>
                                </div>

                                {deletingId === t.id ? (
                                  <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg space-y-3">
                                    <p className="text-xs text-red-400">請輸入名稱 <span className="font-bold text-white select-all">{t.name}</span> 以確認刪除：</p>
                                    <input 
                                      type="text" 
                                      value={deleteConfirmName}
                                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                                      placeholder={t.name}
                                      className="w-full bg-gray-900 border border-red-500/50 text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-red-400"
                                    />
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => confirmDeleteTenant(t)}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded font-medium transition-colors"
                                      >
                                        確認刪除
                                      </button>
                                      <button 
                                        onClick={() => { setDeletingId(null); setDeleteConfirmName(''); }}
                                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1.5 rounded font-medium transition-colors"
                                      >
                                        取消
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setDeletingId(t.id); setDeleteConfirmName(''); }}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    刪除租戶與所有資料
                                  </button>
                                )}
                              </div>
                            </div>
                            
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    找不到任何租戶。點擊「新增租戶」來建立一個。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
