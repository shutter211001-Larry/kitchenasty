import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SettingsReviews() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [requireOrder, setRequireOrder] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [minimumRating, setMinimumRating] = useState(1);

  useEffect(() => {
    fetch('/api/settings/review', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.enabled !== undefined) setEnabled(d.enabled);
          if (d.requireOrder !== undefined) setRequireOrder(d.requireOrder);
          if (d.autoApprove !== undefined) setAutoApprove(d.autoApprove);
          if (d.minimumRating !== undefined) setMinimumRating(d.minimumRating);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled, requireOrder, autoApprove, minimumRating }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('評價設定已更新');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : '儲存失敗');
      }
    } catch {
      setError('網路連線錯誤');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">&larr; 返回設定</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">評價設定</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
          <span className="text-sm font-medium text-gray-700">啟用顧客評價功能</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={requireOrder} onChange={(e) => setRequireOrder(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
          <span className="text-sm font-medium text-gray-700">僅限完成訂單的顧客可留言</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
          <span className="text-sm font-medium text-gray-700">自動核准新評價 (不需人工審核即可顯示)</span>
        </label>

        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">最低可留言星等 (1-5)</label>
          <input type="number" min={1} max={5} value={minimumRating} onChange={(e) => setMinimumRating(parseInt(e.target.value) || 1)} className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          <p className="mt-1 text-xs text-gray-500">限制顧客必須給予幾顆星以上才能提交評論</p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存所有變更'}
        </button>
      </div>
    </div>
  );
}
