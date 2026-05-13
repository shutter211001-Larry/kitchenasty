import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';

interface NotificationConfig {
  enabled: boolean;
  message?: string;
}

const EVENT_LABELS: Record<string, string> = {
  PLACED: '新訂單建立 (下單成功)',
  CONFIRMED: '訂單已確認',
  PREPARING: '餐點製作中',
  READY: '餐點已就緒 (待取餐)',
  OUT_FOR_DELIVERY: '外送中',
  DELIVERED: '已送達',
  CANCELLED: '訂單已取消'
};

const DEFAULT_LINE_MESSAGES: Record<string, string> = {
  PLACED: '您好{使用者}，您的訂單{訂單編號}已成功建立！\n餐點內容：{餐點內容}\n取餐時間：{取餐時間/做好馬上取}',
  CONFIRMED: '您好{使用者}，您的訂單{訂單編號}已確認，我們將盡快為您準備。',
  PREPARING: '您的餐點正在製作中！',
  READY: '🎉 您好{使用者}，您的訂單{訂單編號}已準備就緒！歡迎前往取貨。',
  OUT_FOR_DELIVERY: '🚀 您的訂單{訂單編號}已由外送員取走，正在前往您的地址！',
  DELIVERED: '🍽️ 您的餐點已送達，祝您用餐愉快！',
  CANCELLED: '您的訂單{訂單編號}已被取消。如有任何疑問，請聯繫我們。'
};

export default function SettingsNotifications() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [emailNotifications, setEmailNotifications] = useState<Record<string, boolean>>({});
  const [lineNotifications, setLineNotifications] = useState<Record<string, NotificationConfig>>({});

  useEffect(() => {
    fetchSettings();
  }, [token]);

  async function fetchSettings() {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/settings');
      if (res.success && res.data) {
        const orderSettings = res.data.orderSettings || {};
        const lineSettings = res.data.lineSettings || {};
        
        setEmailNotifications(orderSettings.emailNotifications || {});
        setLineNotifications(lineSettings.notifications || {});
      }
    } catch (err) {
      setError('無法載入設定');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/settings', {
        orderSettings: { emailNotifications },
        lineSettings: { notifications: lineNotifications }
      });
      setSuccess('通知設定已儲存');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">&larr; 返回設定</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">通知發送設定</h1>
          <p className="text-sm text-gray-500 mt-1">統一管理電子郵件與 LINE 的自動通知觸發時機</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 gap-6">
        {/* Unified Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-gray-900 w-1/4">通知觸發事件</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-900 w-1/6 text-center">電子郵件</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-900 w-1/6 text-center">LINE 通知</th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-900">LINE 訊息內容範本</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(EVENT_LABELS).map(([event, label]) => (
                <tr key={event} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{event}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={emailNotifications[event] !== false}
                      onChange={(e) => setEmailNotifications({ ...emailNotifications, [event]: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={lineNotifications[event]?.enabled !== false}
                      onChange={(e) => setLineNotifications({
                        ...lineNotifications,
                        [event]: { ...(lineNotifications[event] || {}), enabled: e.target.checked }
                      })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative group">
                      <textarea
                        value={lineNotifications[event]?.message ?? DEFAULT_LINE_MESSAGES[event]}
                        onChange={(e) => setLineNotifications({
                          ...lineNotifications,
                          [event]: { ...(lineNotifications[event] || {}), message: e.target.value }
                        })}
                        rows={1}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden hover:resize-y min-h-[38px]"
                        placeholder="輸入 LINE 訊息內容..."
                      />
                      {(lineNotifications[event]?.message) && (
                        <button 
                          onClick={() => {
                            const newNotifs = { ...lineNotifications };
                            delete newNotifs[event].message;
                            setLineNotifications(newNotifs);
                          }}
                          className="absolute right-2 top-2 text-xs text-gray-400 hover:text-red-500 hidden group-hover:block"
                          title="恢復預設值"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3">
          <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-indigo-700">
            <p className="font-semibold">提示：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>電子郵件設定可在 <Link to="/settings/mail" className="underline font-medium">郵件設定</Link> 頁面調整發信伺服器。</li>
              <li>LINE 通知需先在 <Link to="/settings/line" className="underline font-medium">LINE 整合</Link> 頁面完成官方帳號對接。</li>
              <li>
                <strong>訊息範本可用參數：</strong>
                <code className="mx-1 px-1.5 py-0.5 bg-indigo-100 rounded text-indigo-800">{"{使用者}"}</code>, 
                <code className="mx-1 px-1.5 py-0.5 bg-indigo-100 rounded text-indigo-800">{"{訂單編號}"}</code>, 
                <code className="mx-1 px-1.5 py-0.5 bg-indigo-100 rounded text-indigo-800">{"{餐點內容}"}</code>, 
                <code className="mx-1 px-1.5 py-0.5 bg-indigo-100 rounded text-indigo-800">{"{取餐時間/做好馬上取}"}</code>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
