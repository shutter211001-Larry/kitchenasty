import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface Ingredient {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: number;
  safetyStock: number | null;
  isInUse: boolean;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrates: number | null;
}

export default function IngredientList() {
  const { t } = useTranslation();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'IN_USE' | 'ALL'>('IN_USE');

  // Modal states for editing an ingredient stock & nutrition quickly
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Ingredient>>({});

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const res = await api.get<Ingredient[]>('/../shutter-erp/api/ingredients');
      setIngredients(res || []);
    } catch (err: any) {
      setError(err.message || '無法載入食材資料');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditForm({
      currentStock: ing.currentStock,
      safetyStock: ing.safetyStock,
      calories: ing.calories,
      protein: ing.protein,
      fat: ing.fat,
      carbohydrates: ing.carbohydrates
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    try {
      await api.put(`/../shutter-erp/api/ingredients/${id}`, editForm);
      setEditingId(null);
      fetchIngredients();
    } catch (err: any) {
      alert(`更新失敗: ${err.message}`);
    }
  };

  const filteredIngredients = ingredients.filter(ing => {
    if (activeTab === 'IN_USE') return ing.isInUse;
    return true; // ALL
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500">載入食材資料中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🥬 {t('nav.ingredients', '原物料/食材管理')}</h1>
          <p className="text-sm text-gray-500 mt-1">管理底層食材與半成品的庫存及營養標示。</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-max">
        <button
          onClick={() => setActiveTab('IN_USE')}
          className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'IN_USE'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          需控管庫存 (使用中)
          <span className="ml-2 bg-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full text-xs">
            {ingredients.filter(i => i.isInUse).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'ALL'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          全部/未啟用食材
          <span className="ml-2 bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs">
            {ingredients.length}
          </span>
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">食材名稱</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">目前庫存 (Current Stock)</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">安全水位 (Safety)</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">營養標示 (每100g/ml)</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredIngredients.map(ing => (
              <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {ing.name}
                    {!ing.isInUse && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">未被食譜使用</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">分類: {ing.category || '未分類'} | 單位: {ing.unit}</div>
                </td>
                
                {/* Stock Controls */}
                <td className="px-6 py-4">
                  {editingId === ing.id ? (
                    <input
                      type="number"
                      value={editForm.currentStock ?? ''}
                      onChange={e => setEditForm({ ...editForm, currentStock: parseFloat(e.target.value) || 0 })}
                      className="w-20 border-gray-300 rounded shadow-sm text-sm"
                    />
                  ) : (
                    <span className={`font-bold ${ing.safetyStock && ing.currentStock <= ing.safetyStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {ing.currentStock} {ing.unit}
                    </span>
                  )}
                </td>

                {/* Safety Stock */}
                <td className="px-6 py-4">
                  {editingId === ing.id ? (
                    <input
                      type="number"
                      value={editForm.safetyStock ?? ''}
                      onChange={e => setEditForm({ ...editForm, safetyStock: parseFloat(e.target.value) || 0 })}
                      className="w-20 border-gray-300 rounded shadow-sm text-sm"
                    />
                  ) : (
                    <span className="text-gray-500">{ing.safetyStock || '-'}</span>
                  )}
                </td>

                {/* Nutrition */}
                <td className="px-6 py-4">
                  {editingId === ing.id ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><label className="text-gray-500 mr-1">熱量</label><input type="number" value={editForm.calories ?? ''} onChange={e => setEditForm({...editForm, calories: parseFloat(e.target.value)||0})} className="w-14 p-1 border rounded" /></div>
                      <div><label className="text-gray-500 mr-1">蛋白</label><input type="number" value={editForm.protein ?? ''} onChange={e => setEditForm({...editForm, protein: parseFloat(e.target.value)||0})} className="w-14 p-1 border rounded" /></div>
                      <div><label className="text-gray-500 mr-1">脂肪</label><input type="number" value={editForm.fat ?? ''} onChange={e => setEditForm({...editForm, fat: parseFloat(e.target.value)||0})} className="w-14 p-1 border rounded" /></div>
                      <div><label className="text-gray-500 mr-1">碳水</label><input type="number" value={editForm.carbohydrates ?? ''} onChange={e => setEditForm({...editForm, carbohydrates: parseFloat(e.target.value)||0})} className="w-14 p-1 border rounded" /></div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {ing.calories != null ? (
                        <>
                          <span>熱量: {ing.calories}kcal</span> | <span>蛋白: {ing.protein}g</span><br />
                          <span>脂肪: {ing.fat}g</span> | <span>碳水: {ing.carbohydrates}g</span>
                        </>
                      ) : (
                        <span className="italic text-gray-400">尚無資料</span>
                      )}
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  {editingId === ing.id ? (
                    <div className="space-x-2">
                      <button onClick={() => saveEdit(ing.id)} className="text-green-600 hover:text-green-900 font-medium text-sm">儲存</button>
                      <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-900 font-medium text-sm">取消</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(ing)} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">
                      編輯
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredIngredients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {activeTab === 'IN_USE' ? '目前沒有任何被食譜使用中的食材。' : '目前尚無食材資料。'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
