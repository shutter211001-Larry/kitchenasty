import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface DashboardData {
  metrics: {
    ordersToday: number;
    revenueToday: number;
    ordersThisWeek: number;
    revenueThisWeek: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
    totalOrders: number;
    totalRevenue: number;
    activeItems: number;
    totalCustomers: number;
    pendingReservations: number;
    pendingReviews: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    orderType: string;
    createdAt: string;
    customer: { name: string } | null;
  }[];
  topItems: {
    menuItemId: string;
    name: string;
    totalQuantity: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-200 text-green-900',
  PICKED_UP: 'bg-green-200 text-green-900',
  CANCELLED: 'bg-red-100 text-red-800',
};

const API_BASE = 'http://localhost:3000';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('admin_token') || '';

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard');
        return res.json();
      })
      .then((result) => setData(result.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Orders Today', 'Revenue', 'Reservations', 'Active Items'].map((label) => (
            <div key={label} className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">--</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Orders Today', 'Revenue', 'Reservations', 'Active Items'].map((label) => (
            <div key={label} className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">--</p>
            </div>
          ))}
        </div>
        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mt-4">{error}</div>}
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Orders Today</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{m.ordersToday}</p>
          <p className="text-xs text-gray-400 mt-1">{m.ordersThisWeek} this week</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Revenue Today</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">${m.revenueToday.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">${m.revenueThisMonth.toFixed(2)} this month</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Pending Reservations</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{m.pendingReservations}</p>
          <p className="text-xs text-gray-400 mt-1">{m.totalCustomers} total customers</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Active Menu Items</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{m.activeItems}</p>
          <p className="text-xs text-gray-400 mt-1">{m.pendingReviews} reviews pending</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{m.totalOrders}</p>
          <p className="text-xs text-gray-500">Total Orders</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">${m.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Revenue</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{m.ordersThisMonth}</p>
          <p className="text-xs text-gray-500">Orders This Month</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">${m.revenueThisWeek.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Revenue This Week</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <Link to="/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded"
                >
                  <div>
                    <span className="font-mono text-xs font-medium text-gray-900">{order.orderNumber}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {order.customer?.name || 'Guest'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium">${order.total.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Selling Items</h3>
            <Link to="/menu/items" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View Menu
            </Link>
          </div>
          {data.topItems.length === 0 ? (
            <p className="text-gray-500 text-sm">No sales data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topItems.map((item, idx) => (
                <div key={item.menuItemId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-5">{idx + 1}</span>
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{item.totalQuantity} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
