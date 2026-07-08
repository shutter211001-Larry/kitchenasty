import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { toast } from 'react-hot-toast';
import { Plus, Server, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
    locations: number;
    orders: number;
  };
}

export default function TenantList() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      // Note: Because saasfront API client automatically prefixes with /api
      // we can just call /platform-admin/tenants
      const res = await api.get<{ data: Tenant[] }>('/platform-admin/tenants');
      setTenants(res.data);
    } catch (error) {
      toast.error('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (tenant: Tenant) => {
    try {
      await api.patch<{ data: Tenant }>(`/platform-admin/tenants/${tenant.id}`, {
        isActive: !tenant.isActive
      });
      toast.success(tenant.isActive ? 'Tenant suspended' : 'Tenant activated');
      fetchTenants();
    } catch (error) {
      toast.error('Failed to update tenant status');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">載入租戶資料中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server className="w-6 h-6 text-indigo-500" />
            平台租戶管理
          </h1>
          <p className="text-gray-400 text-sm mt-1">管理所有 SaaS 實例、網域配置與啟用狀態。</p>
        </div>
        <button
          onClick={() => navigate('/tenants/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          建立新租戶
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <th className="px-6 py-4 font-semibold">租戶名稱</th>
              <th className="px-6 py-4 font-semibold">自訂網域</th>
              <th className="px-6 py-4 font-semibold">統計數據</th>
              <th className="px-6 py-4 font-semibold">狀態</th>
              <th className="px-6 py-4 font-semibold">加入日期</th>
              <th className="px-6 py-4 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-gray-300">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{t.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-indigo-400">{t.domain || '未設定'}</td>
                <td className="px-6 py-4">
                  <div className="text-xs space-y-1">
                    <p><span className="text-gray-500">使用者：</span> {t._count?.users || 0}</p>
                    <p><span className="text-gray-500">分店：</span> {t._count?.locations || 0}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${t.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {t.isActive ? '啟用中' : '已停權'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => toggleStatus(t)} className="text-gray-400 hover:text-white p-2">
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">目前沒有任何租戶資料，請點擊上方按鈕建立新租戶。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
