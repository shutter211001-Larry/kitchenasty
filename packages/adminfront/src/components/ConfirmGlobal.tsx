import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { registerConfirmListener, resolveConfirm } from '../lib/confirm';
import { useTranslation } from "react-i18next";

export function ConfirmGlobal() {
    const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<any>(null);

  useEffect(() => {
    registerConfirmListener((opts) => {
      setOptions(opts);
      setIsOpen(true);
    });
  }, []);

  if (!isOpen || !options) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${options.isDanger ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{options.title || (t('confirmGlobal.95ab59') || '請確認')}</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{options.message}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button onClick={() => { resolveConfirm(false); setIsOpen(false); }} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-300">{options.cancelText || (t('confirmGlobal.625fb2') || '取消')}</button>
          <button onClick={() => { resolveConfirm(true); setIsOpen(false); }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 ${options.isDanger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}>{options.confirmText || (t('confirmGlobal.30749e') || '確認')}</button>
        </div>
      </div>
    </div>
  );
}