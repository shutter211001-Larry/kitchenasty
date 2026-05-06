import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isGuest: boolean;
  loyaltyPoints: number;
  createdAt: string;
  _count: { orders: number; reservations: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isGuestFilter, setIsGuestFilter] = useState('');
  
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoSubject, setPromoSubject] = useState('');
  const [promoContent, setPromoContent] = useState('');
  const [promoSending, setPromoSending] = useState(false);
  const [promoStatus, setPromoStatus] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (isGuestFilter) params.set('isGuest', isGuestFilter);

    fetch(`/api/customers?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load customers');
        return res.json();
      })
      .then((data) => {
        setCustomers(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, search, isGuestFilter, token]);

  async function handleSendPromo(e: React.FormEvent) {
    e.preventDefault();
    setPromoSending(true);
    setPromoStatus('');
    try {
      const res = await fetch('/api/customers/promo-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: promoSubject,
          content: promoContent
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setPromoStatus('success');
      setPromoSubject('');
      setPromoContent('');
      setTimeout(() => setShowPromoModal(false), 2000);
    } catch (err: any) {
      setPromoStatus('error');
      setError(err.message);
    } finally {
      setPromoSending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">會員管理 (Customers)</h1>
        <button
          onClick={() => setShowPromoModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          📢 發送促銷信
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="搜尋姓名、電子郵件或電話..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-64"
        />
        <select
          value={isGuestFilter}
          onChange={(e) => { setIsGuestFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          <option value="">所有類型</option>
          <option value="false">正式會員</option>
          <option value="true">訪客 (Guest)</option>
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {!loading && !error && customers.length === 0 && (
        <p className="text-gray-500 text-center py-12">找不到任何會員。</p>
      )}

      {!loading && customers.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">姓名</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">電子郵件</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">電話</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">類型</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">紅利點數</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">訂單數</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">註冊日期</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.email}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${customer.isGuest ? 'bg-gray-100 text-gray-600' : 'bg-primary-100 text-primary-700'}`}>
                        {customer.isGuest ? '訪客' : '會員'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-orange-600">{customer.loyaltyPoints}</td>
                    <td className="px-4 py-3 text-gray-600">{customer._count.orders}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(customer.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                上一頁
              </button>
              <span className="text-sm text-gray-600">
                第 {pagination.page} 頁，共 {pagination.totalPages} 頁
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}

      {/* Promotional Email Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-primary-600 text-white">
              <h2 className="text-lg font-bold">發送促銷信</h2>
              <button onClick={() => setShowPromoModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSendPromo} className="p-6">
              <p className="text-sm text-gray-500 mb-4">此信件將發送給所有正式會員 (排除訪客)。</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">郵件主旨</label>
                <input
                  required
                  type="text"
                  value={promoSubject}
                  onChange={(e) => setPromoSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="例如: 週末特惠 8 折優惠中!"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">郵件內容 (HTML 可)</label>
                <textarea
                  required
                  rows={6}
                  value={promoContent}
                  onChange={(e) => setPromoContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="輸入信件內容..."
                />
              </div>

              {promoStatus === 'success' && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">信件已成功發送!</div>
              )}
              {promoStatus === 'error' && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">發送失敗，請稍後再試。</div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={promoSending || promoStatus === 'success'}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {promoSending ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 發送中...</>
                  ) : '立即發送'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
