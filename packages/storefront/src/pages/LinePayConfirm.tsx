import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/api.js';
import { useTranslation } from 'react-i18next';

export default function LinePayConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');
  
  const transactionId = searchParams.get('transactionId');
  const orderId = searchParams.get('orderId');
  const table = searchParams.get('table');
  const groupSessionId = searchParams.get('groupSessionId');

  const hasConfirmed = React.useRef(false);

  useEffect(() => {
    if (!transactionId || !orderId) {
      setStatus('error');
      setErrorMessage(t('common.error') || 'Missing parameters');
      return;
    }

    if (hasConfirmed.current) return;
    hasConfirmed.current = true;

    const confirmPayment = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/payments/linepay/confirm`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ transactionId, orderId }),
        });
        
        const data = await res.json();
        
        if (data.success) {
          setStatus('success');
          
          // Restore session storage for table and group context
          if (table) {
            sessionStorage.setItem('shutter-table-name', table);
          }
          if (groupSessionId) {
            sessionStorage.setItem('shutter-group-session', groupSessionId);
          }

          // Wait a brief moment to show success state before redirecting
          // If the backend returns the actual UUID in data.order.id, use it.
          // Otherwise fallback to orderId (which is orderNumber).
          const redirectId = data.order?.id || orderId;
          setTimeout(() => {
            navigate(`/orders/${redirectId}`);
          }, 1500);
        } else {
          throw new Error(data.error || 'Payment confirmation failed');
        }
      } catch (err: any) {
        console.error('Confirm error:', err);
        setStatus('error');
        setErrorMessage(err.message || t('common.error'));
      }
    };

    confirmPayment();
  }, [transactionId, orderId, navigate, t]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="surface-card rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <div className="space-y-4">
            <div className="inline-block relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-xl font-bold text-main">{t('autoGen.store.key87')}</h2>
            <p className="text-sub text-sm">{t('autoGen.store.key88')}</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-main">{t('autoGen.store.key89')}</h2>
            <p className="text-sub text-sm">{t('autoGen.store.key90')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-main">{t('autoGen.store.key91')}</h2>
            <p className="text-red-500 text-sm">{errorMessage}</p>
            <button 
              onClick={() => navigate('/checkout')}
              className="mt-4 btn-primary w-full"
            >
              {t('autoGen.store.key92')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
