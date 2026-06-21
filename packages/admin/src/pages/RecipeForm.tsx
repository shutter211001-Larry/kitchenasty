import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function RecipeForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cookingMethod, setCookingMethod] = useState('');
  
  // 原料清單
  const [ingredients, setIngredients] = useState<any[]>([]);
  // 產出流向 (主產品、副產品、廢棄物)
  const [outputs, setOutputs] = useState<any[]>([
    { type: 'PRIMARY', name: '主產品', yield: '', unit: 'g', nutritionFacts: null }
  ]);

  const [saving, setSaving] = useState(false);
  const [aiCalculating, setAiCalculating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      fetchRecipe();
    }
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const res = await fetch(`/shutter-erp/api/recipes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name || '');
        setDescription(data.description || '');
        // For simplicity, cookingMethod can be mapped to description or a custom field if we had one
        // In the schema, we didn't add cookingMethod explicitly to Shutter ERP's Recipe, but we can put it in description or just use it for the prompt.
        
        // Populate inputs from recipe items
        if (data.items) {
          const ing = data.items.map((item: any) => ({
            name: item.ingredient?.name || `Ingredient ${item.ingredientId}`,
            quantity: item.quantity,
            unit: item.unit
          }));
          setIngredients(ing);
        }

        if (data.outputs && data.outputs.length > 0) {
          setOutputs(data.outputs);
        }
      }
    } catch (err) {
      setError('無法載入食譜資料');
    }
  };

  const calculateAiNutrition = async () => {
    setAiCalculating(true);
    setError('');
    try {
      const res = await fetch('/shutter-erp/api/recipes/ai-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          cookingMethod,
          outputs
        })
      });

      if (!res.ok) throw new Error('AI 計算失敗');
      
      const data = await res.json();
      
      // Update the outputs with the returned nutrition facts
      const updatedOutputs = [...outputs];
      if (data.outputs && Array.isArray(data.outputs)) {
        data.outputs.forEach((aiOut: any) => {
          if (updatedOutputs[aiOut.index]) {
            updatedOutputs[aiOut.index].nutritionFacts = aiOut.nutrition;
          }
        });
        setOutputs(updatedOutputs);
        alert('AI 計算完成！\n' + (data.explanation || ''));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiCalculating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = isEdit ? `/shutter-erp/api/recipes/${id}` : '/shutter-erp/api/recipes';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        name,
        description,
        yieldAmount: 1,
        yieldUnit: '份',
        // items: ingredients mapping to recipeItems (simplified for demo)
        steps: [
          {
            action: cookingMethod || '混合',
            order: 0,
            items: ingredients.map(ing => ({
              ingredientId: ing.ingredientId || null, // Assuming you have a way to pick ingredient ID
              quantity: parseFloat(ing.quantity) || 0,
              unit: ing.unit
            }))
          }
        ],
        outputs: outputs.map(o => ({
          ...o,
          yield: parseFloat(o.yield) || 0
        }))
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('儲存失敗');
      navigate('/recipes');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: 'g' }]);
  };

  const addOutput = () => {
    setOutputs([...outputs, { type: 'BYPRODUCT', name: '', yield: '', unit: 'g', nutritionFacts: null }]);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/recipes" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '編輯食譜' : '新增食譜'}
        </h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">基本資訊</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">食譜名稱</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">烹調方式 (供 AI 參考)</label>
              <input
                type="text"
                placeholder="例如：滷、炸、熬湯"
                value={cookingMethod}
                onChange={e => setCookingMethod(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">描述說明</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">投入原料 (Inputs)</h2>
            <button type="button" onClick={addIngredient} className="text-sm text-primary-600 hover:text-primary-700">+ 新增原料</button>
          </div>
          <div className="space-y-3">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-3">
                <input
                  type="text"
                  placeholder="原料名稱"
                  value={ing.name}
                  onChange={e => {
                    const newIngs = [...ingredients];
                    newIngs[idx].name = e.target.value;
                    setIngredients(newIngs);
                  }}
                  className="flex-1 border-gray-300 rounded-lg shadow-sm"
                />
                <input
                  type="number"
                  placeholder="數量"
                  value={ing.quantity}
                  onChange={e => {
                    const newIngs = [...ingredients];
                    newIngs[idx].quantity = e.target.value;
                    setIngredients(newIngs);
                  }}
                  className="w-24 border-gray-300 rounded-lg shadow-sm"
                />
                <input
                  type="text"
                  placeholder="單位"
                  value={ing.unit}
                  onChange={e => {
                    const newIngs = [...ingredients];
                    newIngs[idx].unit = e.target.value;
                    setIngredients(newIngs);
                  }}
                  className="w-20 border-gray-300 rounded-lg shadow-sm"
                />
                <button type="button" onClick={() => {
                  const newIngs = [...ingredients];
                  newIngs.splice(idx, 1);
                  setIngredients(newIngs);
                }} className="text-red-500 hover:text-red-700">刪除</button>
              </div>
            ))}
            {ingredients.length === 0 && <p className="text-sm text-gray-500">目前沒有原料</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">多重產出流向 (Outputs)</h2>
            <div className="space-x-3">
              <button type="button" onClick={calculateAiNutrition} disabled={aiCalculating} className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50">
                {aiCalculating ? '✨ 計算中...' : '✨ AI 計算營養標示'}
              </button>
              <button type="button" onClick={addOutput} className="text-sm text-primary-600 hover:text-primary-700">+ 新增產出</button>
            </div>
          </div>
          <div className="space-y-6">
            {outputs.map((out, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex gap-3 mb-3">
                  <select
                    value={out.type}
                    onChange={e => {
                      const newOuts = [...outputs];
                      newOuts[idx].type = e.target.value;
                      setOutputs(newOuts);
                    }}
                    className="w-32 border-gray-300 rounded-lg shadow-sm"
                  >
                    <option value="PRIMARY">主產品</option>
                    <option value="BYPRODUCT">副產品</option>
                    <option value="WASTE">耗損/廢棄物</option>
                  </select>
                  <input
                    type="text"
                    placeholder="產出名稱 (例如: 滷肉、老滷汁)"
                    value={out.name}
                    onChange={e => {
                      const newOuts = [...outputs];
                      newOuts[idx].name = e.target.value;
                      setOutputs(newOuts);
                    }}
                    className="flex-1 border-gray-300 rounded-lg shadow-sm"
                  />
                  <input
                    type="number"
                    placeholder="產出重量"
                    value={out.yield}
                    onChange={e => {
                      const newOuts = [...outputs];
                      newOuts[idx].yield = e.target.value;
                      setOutputs(newOuts);
                    }}
                    className="w-24 border-gray-300 rounded-lg shadow-sm"
                  />
                  <input
                    type="text"
                    placeholder="單位"
                    value={out.unit}
                    onChange={e => {
                      const newOuts = [...outputs];
                      newOuts[idx].unit = e.target.value;
                      setOutputs(newOuts);
                    }}
                    className="w-20 border-gray-300 rounded-lg shadow-sm"
                  />
                  <button type="button" onClick={() => {
                    const newOuts = [...outputs];
                    newOuts.splice(idx, 1);
                    setOutputs(newOuts);
                  }} className="text-red-500 hover:text-red-700">刪除</button>
                </div>
                
                {out.nutritionFacts && out.type !== 'WASTE' && (
                  <div className="mt-3 text-sm bg-white p-3 rounded border border-gray-200">
                    <p className="font-medium text-gray-700 mb-2">AI 估算營養標示 (每 100{out.unit}):</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-gray-600">
                      <div>熱量: {out.nutritionFacts.calories} kcal</div>
                      <div>蛋白質: {out.nutritionFacts.protein} g</div>
                      <div>脂肪: {out.nutritionFacts.fat} g</div>
                      <div>碳水: {out.nutritionFacts.carbohydrates} g</div>
                      <div>糖: {out.nutritionFacts.sugar} g</div>
                      <div>鈉: {out.nutritionFacts.sodium} mg</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Link
            to="/recipes"
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? '儲存中...' : (isEdit ? '更新食譜' : '建立食譜')}
          </button>
        </div>
      </form>
    </div>
  );
}
