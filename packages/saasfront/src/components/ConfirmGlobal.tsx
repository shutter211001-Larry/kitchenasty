import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { registerConfirmListener, resolveConfirm } from '../lib/confirm';

export function ConfirmGlobal() {
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${options.isDanger || options.message.includes('刪除') ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white mb-2">{options.title || '請確認'}</h3>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{options.message}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
          <button onClick={() => { resolveConfirm(false); setIsOpen(false); }} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">{options.cancelText || '取消'}</button>
          <button onClick={() => { resolveConfirm(true); setIsOpen(false); }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${options.isDanger || options.message.includes('刪除') ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{options.confirmText || '確認'}</button>
        </div>
      </div>
    </div>
  );
}