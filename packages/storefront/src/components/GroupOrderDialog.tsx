import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.js';
import { API_BASE } from '../lib/api.js';

export default function GroupOrderDialog() {
  const { t } = useTranslation();
  const { tableName, groupSessionId, groupPin, setGroupSession } = useCart();
  const [isOpen, setIsOpen] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      if (!data.success) throw new Error(data.error || t('groupOrder.errorStartFailed'));

      setGroupSession(data.data.id, data.data.pin);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (pinInput.length !== 4) {
      setError(t('groupOrder.error4Digits'));
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
      if (!data.success) throw new Error(data.error || t('groupOrder.errorInvalidCode'));

      setGroupSession(data.data.id, data.data.pin);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  if (!tableName || location.pathname === '/checkout') return null;

  return (
    <div className="fixed bottom-24 left-4 sm:bottom-6 sm:left-6 z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl rounded-2xl p-4 border border-gray-100 dark:border-gray-700 w-[240px] transition-all">
        {/* Header (Always Visible) */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 text-primary-600 rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-inner">
              🍽️
            </div>
            <div className="font-bold text-gray-900 dark:text-gray-100 flex flex-col">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{t('autoGen.store.key2')}</span>
              <span className="text-lg leading-none">{tableName}</span>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Content (Active Session) */}
        {groupSessionId && isOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-3 py-2 rounded-xl text-center shadow-inner border border-primary-100/50 dark:border-primary-800/50">
              <span className="text-[10px] opacity-80 block mb-0.5 font-medium">{t('groupOrder.groupOrderCode')}</span>
              <span className="text-xl font-black tracking-widest">{groupPin}</span>
            </div>
            <button 
              onClick={() => {
                if(window.confirm(t('groupOrder.confirmLeaveGroup'))) {
                  setGroupSession(null, null);
                }
              }}
              className="w-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold py-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition"
            >
              {t('groupOrder.leaveGroupOrder')}
            </button>
          </div>
        )}

        {/* Content (No Session, Expanded) */}
        {!groupSessionId && isOpen && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            {error && (
              <div className="p-2 bg-red-50 text-red-700 text-xs rounded-lg font-medium text-center">
                {error}
              </div>
            )}
            
            <button 
              onClick={handleStartNew}
              disabled={loading}
              className="w-full bg-primary-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-primary-700 transition shadow-md shadow-primary-500/20 disabled:opacity-50"
            >
              {t('groupOrder.generateGroupCode')}
            </button>
            
            {isJoining ? (
               <div className="flex gap-2">
                  <input 
                    value={pinInput} 
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center font-bold tracking-widest focus:ring-2 focus:ring-primary-500 outline-none text-sm" 
                    placeholder={t('groupOrder.enter4DigitCode')} 
                    maxLength={4}
                  />
                  <button 
                    onClick={handleJoin} 
                    disabled={loading || pinInput.length !== 4}
                    className="bg-gray-900 text-white px-4 rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap shadow-md"
                  >
                    {t('groupOrder.join')}
                  </button>
               </div>
            ) : (
               <button 
                 onClick={() => setIsJoining(true)} 
                 className="text-gray-500 text-xs font-medium hover:text-gray-700 transition pb-1"
               >
                 {t('groupOrder.orEnterCodeToJoin')}
               </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
