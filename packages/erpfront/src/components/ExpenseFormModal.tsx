import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { api } from '../lib/api';

interface Expense {
  id: string;
  amount: number;
  description: string;
  status: string;
  category?: string;
  accountingCode?: string;
  voucherNumber?: string;
  invoiceNumber?: string;
  vendorTaxId?: string;
  taxAmount?: number;
  isTaxInclusive?: boolean;
  payee?: string;
  paymentMethod?: string;
  transactionDate?: string;
}

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null;
  onSuccess: () => void;
}

export function ExpenseFormModal({ isOpen, onClose, expense, onSuccess }: ExpenseFormModalProps) {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    status: 'PENDING',
    category: '',
    accountingCode: '',
    voucherNumber: '',
    invoiceNumber: '',
    vendorTaxId: '',
    taxAmount: '',
    isTaxInclusive: false,
    payee: '',
    paymentMethod: 'CASH',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        description: expense.description || '',
        status: expense.status || 'PENDING',
        category: expense.category || '',
        accountingCode: expense.accountingCode || '',
        voucherNumber: expense.voucherNumber || '',
        invoiceNumber: expense.invoiceNumber || '',
        vendorTaxId: expense.vendorTaxId || '',
        taxAmount: expense.taxAmount?.toString() || '',
        isTaxInclusive: expense.isTaxInclusive || false,
        payee: expense.payee || '',
        paymentMethod: expense.paymentMethod || 'CASH',
        transactionDate: expense.transactionDate 
          ? new Date(expense.transactionDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData({
        amount: '',
        description: '',
        status: 'PENDING',
        category: '',
        accountingCode: '',
        voucherNumber: '',
        invoiceNumber: '',
        vendorTaxId: '',
        taxAmount: '',
        isTaxInclusive: false,
        payee: '',
        paymentMethod: 'CASH',
        transactionDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [expense, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        taxAmount: formData.taxAmount ? Number(formData.taxAmount) : undefined,
      };

      if (expense) {
        await api.put(`/expenses/${expense.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            {expense ? '編輯支出傳票' : '新增支出傳票'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
            {/* 核心資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">發生日期 *</label>
                <input
                  type="date"
                  required
                  value={formData.transactionDate}
                  onChange={e => setFormData({ ...formData, transactionDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">付款狀態 *</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="PENDING">未付款 (應付帳款)</option>
                  <option value="PAID">已付款</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">支出摘要/說明 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：六月份水電費、設備維修費用"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支出金額 (含稅總額) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">稅金</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.taxAmount}
                    onChange={e => setFormData({ ...formData, taxAmount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* 會計關聯資訊 */}
            <h3 className="font-bold text-gray-800 text-lg">會計對接資訊</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">會計科目代碼</label>
                <input
                  type="text"
                  placeholder="例如：6120"
                  value={formData.accountingCode}
                  onChange={e => setFormData({ ...formData, accountingCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">內部傳票號碼</label>
                <input
                  type="text"
                  placeholder="例如：V-202607-001"
                  value={formData.voucherNumber}
                  onChange={e => setFormData({ ...formData, voucherNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">發票號碼</label>
                <input
                  type="text"
                  placeholder="例如：AB12345678"
                  value={formData.invoiceNumber}
                  onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">廠商統編 / 稅籍編號</label>
                <input
                  type="text"
                  placeholder="例如：12345678"
                  value={formData.vendorTaxId}
                  onChange={e => setFormData({ ...formData, vendorTaxId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">收款人 / 廠商名稱</label>
                <input
                  type="text"
                  placeholder="廠商或請款人名稱"
                  value={formData.payee}
                  onChange={e => setFormData({ ...formData, payee: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">支付方式</label>
                <select
                  value={formData.paymentMethod}
                  onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="CASH">現金</option>
                  <option value="BANK_TRANSFER">銀行匯款</option>
                  <option value="CREDIT_CARD">信用卡</option>
                  <option value="CHECK">支票</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}
