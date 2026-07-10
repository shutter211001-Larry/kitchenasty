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
}

export default function TenantList() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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
      toast.error('Failed to fetch tenants');
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
      toast.success(tenant.isActive ? 'Tenant suspended' : 'Tenant activated');
      fetchTenants();
    } catch (error) {
      toast.error('Failed to update tenant status');
    }
  };

  const toggleErpAccess = async (tenant: Tenant) => {
    try {
      await api.patch<{ data: Tenant }>(`/platform-admin/tenants/${tenant.id}`, {
        hasErpAccess: !tenant.hasErpAccess
      });
      toast.success(tenant.hasErpAccess ? 'ERP access disabled' : 'ERP access enabled');
      fetchTenants();
    } catch (error) {
      toast.error('Failed to update ERP access');
    }
  };

  const updateDomain = async (tenant: Tenant) => {
    setOpenMenuId(null);
    const newDomain = window.prompt('Enter new custom domain (e.g. test.localhost)', tenant.domain || '');
    if (newDomain !== null) {
      try {
        await api.patch(`/platform-admin/tenants/${tenant.id}`, { domain: newDomain.toLowerCase().trim() || null });
        toast.success('Domain updated successfully');
        fetchTenants();
      } catch (error: any) {
        toast.error(error.message || 'Failed to update domain');
      }
    }
  };

  const updateExpiration = async (tenant: Tenant) => {
    setOpenMenuId(null);
    const newDate = window.prompt('Enter new expiration date (YYYY-MM-DD), leave blank for no limit', tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt).toISOString().split('T')[0] : '');
    if (newDate !== null) {
      try {
        await api.patch(`/platform-admin/tenants/${tenant.id}`, { subscriptionEndsAt: newDate || null });
        toast.success('Expiration date updated');
        fetchTenants();
      } catch (e) {
        toast.error('Invalid date format or failed to update');
      }
    }
  };

  const deleteTenant = async (tenant: Tenant) => {
    setOpenMenuId(null);
    const confirmName = window.prompt(`[Danger] This will permanently delete "${tenant.name}" and all associated data!\nType the full tenant name to confirm:`);
    
    if (confirmName === null) return;
    
    if (confirmName !== tenant.name) {
      return toast.error('Name mismatch, deletion cancelled');
    }

    const loadingToast = toast.loading('Deleting tenant and all data...');
    try {
      await api.delete(`/platform-admin/tenants/${tenant.id}`);
      toast.success('Tenant permanently deleted', { id: loadingToast });
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Deletion failed', { id: loadingToast });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading tenants...</div>;
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
            Tenant Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage SaaS instances, domains, and subscriptions.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (!window.confirm('Reset demo tenant data? This deletes and recreates all demo data.')) return;
              const loadingToast = toast.loading('Starting demo reset...');
              try {
                await api.post('/platform-admin/tenants/reset-demo', {});
                toast.success('Demo reset initiated.', { id: loadingToast });
                setTimeout(fetchTenants, 5000);
              } catch (error) {
                toast.error('Reset failed.', { id: loadingToast });
              }
            }}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700"
          >
            Reset Demo Data
          </button>
          <button
            onClick={() => navigate('/tenants/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Tenant
          </button>
        </div>
      </div>

      {/* Top Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Total Tenants</p>
          <h3 className="text-2xl font-semibold text-white">{tenants.length}</h3>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Active Subscriptions</p>
          <h3 className="text-2xl font-semibold text-white">{activeTenants}</h3>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Pending Renewals</p>
          <h3 className="text-2xl font-semibold text-white">{pendingRenewals}</h3>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-sm" ref={dropdownRef}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-900/50 border-b border-gray-800 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Tenant</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Metrics & Access</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 text-gray-300">
              {tenants.map((t) => {
                let statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
                let statusText = "Active";
                
                if (!t.isActive) {
                  statusColor = "text-red-400 border-red-500/20 bg-red-500/10";
                  statusText = "Suspended";
                } else if (t.subscriptionEndsAt) {
                  const endsAt = new Date(t.subscriptionEndsAt);
                  if (endsAt < now) {
                    statusColor = "text-red-400 border-red-500/20 bg-red-500/10";
                    statusText = "Expired";
                  } else if (endsAt <= thirtyDaysFromNow) {
                    statusColor = "text-amber-400 border-amber-500/20 bg-amber-500/10";
                    statusText = "Expiring Soon";
                  }
                }

                return (
                  <tr key={t.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-medium border border-gray-700">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{t.name}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{t.domain || 'No custom domain'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusColor}`}>
                        {statusText}
                      </span>
                      {t.subscriptionEndsAt && (
                        <p className="text-xs text-gray-500 mt-1.5">
                          Expires: {new Date(t.subscriptionEndsAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="text-xs text-gray-400">
                          Users: {t._count?.users || 0} <span className="mx-1 text-gray-600">|</span> Locations: {t._count?.locations || 0}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleErpAccess(t)}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${t.hasErpAccess ? 'bg-indigo-500' : 'bg-gray-700'}`}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${t.hasErpAccess ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                          </button>
                          <span className="text-xs text-gray-500">ERP Module</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            const baseUrl = import.meta.env.VITE_ADMIN_URL_PUBLIC || 'http://localhost:5173';
                            window.open(`${baseUrl}?set_tenant_id=${t.id}`, '_blank');
                          }}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-xs font-medium transition-colors border border-gray-700"
                        >
                          Open Admin
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                            className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          {openMenuId === t.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-10 py-1">
                              <button
                                onClick={() => navigate(`/tenants/${t.id}/integrations`, { state: { tenantName: t.name } })}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                              >
                                <Key className="w-3.5 h-3.5" />
                                Integrations
                              </button>
                              <button
                                onClick={() => updateDomain(t)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                              >
                                <Globe className="w-3.5 h-3.5" />
                                Edit Domain
                              </button>
                              <button
                                onClick={() => updateExpiration(t)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Edit Expiration
                              </button>
                              <button
                                onClick={() => toggleStatus(t)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                              >
                                <Server className="w-3.5 h-3.5" />
                                Toggle Status
                              </button>
                              <div className="h-px bg-gray-700 my-1"></div>
                              <button
                                onClick={() => deleteTenant(t)}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Tenant
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No tenants found. Click "New Tenant" to create one.
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
