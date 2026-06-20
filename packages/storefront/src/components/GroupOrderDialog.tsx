import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import { API_BASE } from '../lib/api.js';

export default function GroupOrderDialog() {
  const { t } = useTranslation();
  const { tableName, groupSessionId, setGroupSession } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Open if there is a tableName but NO groupSessionId
    if (tableName && !groupSessionId) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [tableName, groupSessionId]);

  const getLocationId = async () => {
    const res = await fetch(`${API_BASE}/locations`);
    const data = await res.json();
    return data.data?.[0]?.id;
  };

  const handleStartNew = async () => {
    try {
      setLoading(true);
      setError('');
      const locId = await getLocationId();
      if (!locId) throw new Error('Location not found');

      const res = await fetch(`${API_BASE}/group-orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: locId, tableName })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '發起訂單失敗');

      setGroupSession(data.data.id, data.data.pin);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (pinInput.length !== 4) {
      setError('請輸入 4 碼代碼');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const locId = await getLocationId();
      if (!locId) throw new Error('Location not found');

      const res = await fetch(`${API_BASE}/group-orders/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: locId, tableName, pin: pinInput })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '代碼無效或同桌點餐已結束');

      setGroupSession(data.data.id, data.data.pin);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-8 space-y-6 transform transition-all">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
            🍽️
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">您目前位於桌號 {tableName}</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            同桌點餐可以讓同行友人一起加入訂單，大家能看到彼此的餐點，並在結帳時各自挑選自己的餐點結帳。
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800 font-medium text-center">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <button 
            onClick={handleStartNew}
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 text-lg"
          >
            發起新訂單 (產生代碼)
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 font-medium text-sm">或加入同行友人訂單</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          <div className="flex space-x-3">
            <input 
              type="text" 
              maxLength={4}
              placeholder="輸入 4 碼"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-xl font-black tracking-widest focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none shadow-inner"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
            />
            <button 
              onClick={handleJoin}
              disabled={loading || pinInput.length !== 4}
              className="px-6 bg-gray-900 text-white dark:bg-gray-600 rounded-xl font-bold shadow-lg hover:bg-gray-800 hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:bg-gray-900"
            >
              加入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
