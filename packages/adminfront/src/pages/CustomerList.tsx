import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface Customer {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  address?: string | null;
  lineUserId?: string | null;
  googleEmail?: string | null;
  isGuest: boolean;
  isEmployee?: boolean;
  loyaltyPoints: number;
  isWhitelisted: boolean;
  isBlacklisted: boolean;
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
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', loyaltyPoints: 0, isWhitelisted: false, isBlacklisted: false, isEmployee: false });
  const [editLoading, setEditLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoSubject, setPromoSubject] = useState('');
  const [promoContent, setPromoContent] = useState('');
  const [promoSending, setPromoSending] = useState(false);
  const [promoStatus, setPromoStatus] = useState('');

  const token = localStorage.getItem('token') || '';

  const fetchCustomers = useCallback(() => {
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

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      loyaltyPoints: customer.loyaltyPoints,
      isWhitelisted: customer.isWhitelisted,
      isBlacklisted: customer.isBlacklisted,
      isEmployee: customer.isEmployee || false,
    });
    setShowEditModal(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Update failed');
      setShowEditModal(false);
      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/customers/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setShowDeleteModal(false);
      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">LINE唯一碼</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">電話</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">類型</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">紅利點數</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">訂單數</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">狀態</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">註冊日期</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.email && customer.email.endsWith('@line.shutterorder.com') ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-green-600 font-bold text-[11px] bg-green-50 border border-green-200 px-2 py-0.5 rounded-full whitespace-nowrap">LINE 會員</span>
                          {customer.googleEmail && <span className="text-sm">{customer.googleEmail}</span>}
                        </div>
                      ) : (
                        customer.email ? customer.email : <span className="text-gray-400">從缺</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono max-w-[120px] truncate" title={customer.lineUserId || ''}>
                      {customer.lineUserId || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{customer.phone || '—'}</div>
                      {customer.address && (
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px] mt-0.5" title={customer.address}>
                          📍 {customer.address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 w-max">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-max ${customer.isGuest ? 'bg-gray-100 text-gray-600' : 'bg-primary-100 text-primary-700'}`}>
                          {customer.isGuest ? '訪客' : '會員'}
                        </span>
                        {customer.isEmployee && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold w-max animate-pulse">員工會員</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-orange-600">{customer.loyaltyPoints}</td>
                    <td className="px-4 py-3 text-gray-600">{customer._count.orders}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {customer.isWhitelisted && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">白名單</span>
                        )}
                        {customer.isBlacklisted && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">黑名單</span>
                        )}
                        {!customer.isWhitelisted && !customer.isBlacklisted && (
                          <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-bold">一般</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(customer.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(customer)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                          title="編輯"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setDeletingId(customer.id); setShowDeleteModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="刪除"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
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

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold">編輯會員資訊</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  required
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">住址</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">紅利點數</label>
                <input
                  required
                  type="number"
                  value={editForm.loyaltyPoints}
                  onChange={(e) => setEditForm({ ...editForm, loyaltyPoints: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isEmployee}
                    onChange={(e) => setEditForm({ ...editForm, isEmployee: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-indigo-700">設為員工會員 (下單可無視營業時間)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isWhitelisted}
                    onChange={(e) => setEditForm({ ...editForm, isWhitelisted: e.target.checked, isBlacklisted: e.target.checked ? false : editForm.isBlacklisted })}
                    className="w-4 h-4 accent-primary-600"
                  />
                  <span className="text-sm font-medium text-green-700">加入白名單 (排除防禦限制)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isBlacklisted}
                    onChange={(e) => setEditForm({ ...editForm, isBlacklisted: e.target.checked, isWhitelisted: e.target.checked ? false : editForm.isWhitelisted })}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-sm font-medium text-red-700">加入黑名單 (禁止下單)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {editLoading ? '儲存中...' : '儲存變更'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">確認刪除會員？</h2>
              <p className="text-gray-500 text-sm mb-6">此動作無法復原。該會員的所有訂單紀錄與紅利點數將一併移除。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? '刪除中...' : '確認刪除'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">郵件內容 (HTML 可內嵌)</label>
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
