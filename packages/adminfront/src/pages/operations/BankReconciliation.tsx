import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageContent } from '../../components/layout/PageContent';
import { toast } from "react-hot-toast";

interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  total: number;
  createdAt: string;
  customer: { id: string; name: string; email: string; phone?: string | null } | null;
  guestName?: string | null;
  paymentStatus?: string | null;
  payments?: any[];
}

export default function BankReconciliation() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    // Fetch orders with BANK_TRANSFER and PENDING payment status
    api.get('orders?paymentMethod=BANK_TRANSFER&paymentStatus=PENDING')
      .then((data: any) => {
        setOrders(data.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  async function handleConfirmPayment(orderId: string) {
    if (!window.confirm(t('common.confirmAction') || '確認已收到匯款嗎？確認後將無法撤回。')) return;
    
    setConfirmingId(orderId);
    try {
      const res = await api.post(`orders/${orderId}/confirm-payment`, {});
      if (res.success) {
        toast.success('匯款確認成功');
        fetchOrders(); // Refresh the list
      } else {
        toast.error(res.error || '確認失敗');
      }
    } catch (err: any) {
      toast.error(err.message || '確認失敗');
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="pb-12">
      <PageHeader 
        title={t('nav.reconciliation') || '匯款對帳管理'} 
      />
      
      <PageContent>
        {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">
              待對帳訂單 <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs">{orders.length}</span>
            </h2>
            <button onClick={fetchOrders} className="text-sm text-primary-600 hover:text-primary-700">
              重新整理
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-sm">
                  <th className="p-4 font-medium">訂單號碼</th>
                  <th className="p-4 font-medium">顧客</th>
                  <th className="p-4 font-medium">金額</th>
                  <th className="p-4 font-medium">匯款後五碼</th>
                  <th className="p-4 font-medium">匯款日期</th>
                  <th className="p-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">載入中...</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">目前沒有待對帳的訂單</td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const pendingPayment = order.payments?.find(p => p.method === 'BANK_TRANSFER' && p.status === 'PENDING');
                    const last5 = pendingPayment?.metadata?.last5Digits;
                    const transferDate = pendingPayment?.metadata?.transferDate;

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <Link to={`/orders/${order.id}`} className="font-medium text-primary-600 hover:underline">
                            {order.orderNumber}
                          </Link>
                          <div className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString()}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-gray-900">{order.customer?.name || order.guestName || '訪客'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-gray-900">${order.total.toFixed(2)}</div>
                        </td>
                        <td className="p-4">
                          {last5 ? (
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{last5}</span>
                          ) : (
                            <span className="text-xs text-gray-400">尚未填寫</span>
                          )}
                        </td>
                        <td className="p-4">
                          {transferDate ? (
                            <span className="text-sm text-gray-700">{transferDate}</span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleConfirmPayment(order.id)}
                            disabled={confirmingId === order.id || !last5}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {confirmingId === order.id ? '處理中...' : '確認收款'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
