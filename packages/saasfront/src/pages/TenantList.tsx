import React, { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api.js';
import { toast } from 'react-hot-toast';
import { Plus, Server, Edit, Trash2, Key, Globe, ExternalLink, MoreHorizontal } from 'lucide-react';
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTenants();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    setOpenMenuId(null);
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

  const updateDomain = async (tenant: Tenant) => {
    setOpenMenuId(null);
    const newDomain = window.prompt('請輸入新的自訂網域 (例如 test.localhost)', tenant.domain || '');
    if (newDomain !== null) {
      try {
        await api.patch(`/platform-admin/tenants/${tenant.id}`, { domain: newDomain.toLowerCase().trim() || null });
        toast.success('網域更新成功');
        fetchTenants();
      } catch (error: any) {
        toast.error(error.message || '無法更新網域');
      }
    }
  };

  const updateExpiration = async (tenant: Tenant) => {
    setOpenMenuId(null);
    const newDate = window.prompt('請輸入新的到期日 (YYYY-MM-DD)，留空則無期限', tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt).toISOString().split('T')[0] : '');
    if (newDate !== null) {
      try {
        await api.patch(`/platform-admin/tenants/${tenant.id}`, { subscriptionEndsAt: newDate || null });
        toast.success('到期日更新成功');
        fetchTenants();
      } catch (e) {
        toast.error('日期格式無效或更新失敗');
      }
    }
  };

  const deleteTenant = async (tenant: Tenant) => {
    setOpenMenuId(null);
    const confirmName = window.prompt(`[危險] 這將永久刪除 "${tenant.name}" 及其所有相關資料！\n請輸入完整的租戶名稱以確認：`);
    
    if (confirmName === null) return;
    
    if (confirmName !== tenant.name) {
      return toast.error('名稱不符，取消刪除');
    }

    const loadingToast = toast.loading('正在刪除租戶與所有資料...');
    try {
      await api.delete(`/platform-admin/tenants/${tenant.id}`);
      toast.success('租戶已永久刪除', { id: loadingToast });
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || '刪除失敗', { id: loadingToast });
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
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (!window.confirm('確定要重設示範資料嗎？這將刪除並重新建立所有示範資料。')) return;
              const loadingToast = toast.loading('開始重設示範資料...');
              try {
                await api.post('/platform-admin/tenants/reset-demo', {});
                toast.success('已啟動示範資料重設程序。', { id: loadingToast });
                setTimeout(fetchTenants, 5000);
              } catch (error) {
                toast.error('重設失敗。', { id: loadingToast });
              }
            }}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700"
          >
            重設示範資料
          </button>
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
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-visible shadow-sm" ref={dropdownRef}>
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
                      className="hover:bg-gray-800/30 transition-colors group cursor-pointer"
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
                              window.open(`${protocol}://admin.${t.domain}`, '_blank');
                            } else {
                              const baseUrl = import.meta.env.VITE_ADMIN_URL_PUBLIC || 'http://localhost:5173';
                              window.open(`${baseUrl}?set_tenant_id=${t.id}`, '_blank');
                            }
                          }}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-xs font-medium transition-colors border border-gray-700"
                        >
                          開啟後台
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); }}
                            className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          {openMenuId === t.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/tenants/${t.id}/integrations`, { state: { tenantName: t.name } }); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                              >
                                <Key className="w-3.5 h-3.5" />
                                第三方整合
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateDomain(t); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                              >
                                <Globe className="w-3.5 h-3.5" />
                                編輯網域
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateExpiration(t); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                編輯到期日
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleStatus(t); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                              >
                                <Server className="w-3.5 h-3.5" />
                                切換狀態
                              </button>
                              <div className="h-px bg-gray-700 my-1"></div>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteTenant(t); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                刪除租戶
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    </tr>
                    {expandedTenantId === t.id && (
                      <tr className="bg-gray-800/40 border-b border-gray-800/50">
                        <td colSpan={5} className="px-6 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-300 px-2">
                            <div>
                              <h4 className="font-semibold text-white mb-3 pb-2 border-b border-gray-700">購買者基本資料</h4>
                              <div className="space-y-2">
                                <p><span className="text-gray-500 inline-block w-20">姓名：</span> {t.users?.[0]?.name || '未提供'}</p>
                                <p><span className="text-gray-500 inline-block w-20">信箱：</span> {t.users?.[0]?.email || '未提供'}</p>
                                <p><span className="text-gray-500 inline-block w-20">電話：</span> {t.users?.[0]?.phone || '未提供'}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-white mb-3 pb-2 border-b border-gray-700">租約與模組狀態</h4>
                              <div className="space-y-2">
                                <p>
                                  <span className="text-gray-500 inline-block w-24">租約狀態：</span> 
                                  {t.isActive ? <span className="text-emerald-400 font-medium">啟用中</span> : <span className="text-red-400 font-medium">已停權</span>}
                                </p>
                                <p>
                                  <span className="text-gray-500 inline-block w-24">到期日：</span> 
                                  {t.subscriptionEndsAt ? new Date(t.subscriptionEndsAt).toLocaleDateString() : '無期限'}
                                </p>
                                <p>
                                  <span className="text-gray-500 inline-block w-24">各模組生效：</span> 
                                  ERP模組 ({t.hasErpAccess ? <span className="text-emerald-400 font-medium">已啟用</span> : <span className="text-gray-500 font-medium">未啟用</span>})
                                </p>
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
