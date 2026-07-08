import React, { useEffect, useState } from 'react';
import { Server, Users, Activity, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { useNavigate } from 'react-router-dom';

interface Tenant {
  id: string;
  name: string;
  isActive: boolean;
  _count?: {
    users: number;
    locations: number;
    orders: number;
  };
}

export default function Dashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await api.get<{ data: Tenant[] }>('/platform-admin/tenants');
      setTenants(res.data);
    } catch (error) {
      console.error('Failed to load tenants', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      Loading Platform Metrics...
    </div>;
  }

  const activeTenants = tenants.filter(t => t.isActive).length;
  const totalUsers = tenants.reduce((acc, t) => acc + (t._count?.users || 0), 0);
  const totalOrders = tenants.reduce((acc, t) => acc + (t._count?.orders || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-indigo-500/20"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">Platform Overview</h1>
          <p className="text-gray-400">Welcome to the SaaS Super Admin Panel. Monitor system health and tenant usage below.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl relative overflow-hidden hover:border-indigo-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-6 text-indigo-500/20"><Server className="w-16 h-16" /></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-400">Total Tenants</p>
            <p className="text-4xl font-bold text-white mt-2">{tenants.length}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl relative overflow-hidden hover:border-emerald-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-6 text-emerald-500/20"><Activity className="w-16 h-16" /></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-400">Active Tenants</p>
            <p className="text-4xl font-bold text-white mt-2">{activeTenants}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl relative overflow-hidden hover:border-blue-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-6 text-blue-500/20"><Users className="w-16 h-16" /></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-400">Total Users</p>
            <p className="text-4xl font-bold text-white mt-2">{totalUsers}</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl relative overflow-hidden hover:border-purple-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-6 text-purple-500/20"><ShieldCheck className="w-16 h-16" /></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-400">Platform Orders</p>
            <p className="text-4xl font-bold text-white mt-2">{totalOrders.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Recent Tenants Preview */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            Recent Tenants
          </h2>
          <button 
            onClick={() => navigate('/tenants')}
            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="p-0">
          {tenants.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No tenants found in the system.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {tenants.slice(0, 5).map(tenant => (
                <div key={tenant.id} className="flex justify-between items-center p-6 hover:bg-gray-800/30 transition-colors">
                  <div>
                    <h3 className="font-semibold text-white">{tenant.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">ID: {tenant.id}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{tenant._count?.users || 0}</p>
                      <p className="text-xs text-gray-500">Users</p>
                    </div>
                    <span className={\px-3 py-1 rounded-full text-xs font-medium border \\}>
                      {tenant.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
