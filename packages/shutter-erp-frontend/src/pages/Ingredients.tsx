import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Package, AlertCircle, Plus, Edit2, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import EditIngredientModal from '../components/EditIngredientModal';
import { AllergenManagerModal } from '../components/AllergenManagerModal';

interface Allergen {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  safetyStock: number | null;
  calories: number;
  isAllergen: boolean;
  allergenType?: string;
  allergens?: Allergen[];
  isInUse?: boolean; // 新增：是否被食譜使用
}

const Ingredients = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null | 'new'>(null);
  const [isAllergenMgrOpen, setIsAllergenMgrOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('所有分類');
  const [activeTab, setActiveTab] = useState<'IN_USE' | 'ALL'>('IN_USE');

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const categoryParam = activeCategory !== '所有分類' ? `&category=${activeCategory}` : '';
      const response = await axios.get(`http://localhost:3000/api/ingredients?search=${search}${categoryParam}`);
      setIngredients(response.data);
    } catch (error) {
      console.error('Failed to fetch ingredients', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIngredients();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, activeCategory]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">食材資料庫</h2>
          <p className="text-muted-foreground mt-1">管理店內原物料、採購規格、庫存水位與過敏原警示</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button 
            type="button"
            onClick={() => setIsAllergenMgrOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all active:scale-95 text-xs shrink-0 shadow-sm shadow-rose-100/50 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>過敏原管理</span>
          </button>
          <button 
            onClick={() => setSelectedIngredient('new')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增食材</span>
          </button>
        </div>
      </header>

      {/* Filters & Search */}
      <div className="bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-border flex flex-col sm:flex-row gap-4 items-stretch sm:items-center shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="搜尋食材名稱 (例如: 莫札瑞拉、麵粉)..." 
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-semibold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="bg-white border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-semibold w-full sm:w-auto cursor-pointer"
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
        >
          <option value="所有分類">所有分類</option>
          <option value="麵粉類">麵粉類</option>
          <option value="肉類">肉類</option>
          <option value="蔬菜類">蔬菜類</option>
          <option value="醬料類">醬料類</option>
          <option value="起司乳酪">起司乳酪</option>
          <option value="其他">其他</option>
        </select>
        
        {/* New Filter Tabs */}
        <div className="flex bg-muted/50 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('IN_USE')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === 'IN_USE' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-gray-800"
            )}
          >
            需控管 (使用中)
            <span className="ml-1.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[10px]">
              {ingredients.filter(i => i.isInUse).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === 'ALL' ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-gray-800"
            )}
          >
            全部/未啟用
            <span className="ml-1.5 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-md text-[10px]">
              {ingredients.length}
            </span>
          </button>
        </div>
      </div>

      {/* Ingredients List */}
      <div className="bg-white rounded-3xl overflow-hidden border border-border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider text-muted-foreground">名稱</th>
                <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider text-muted-foreground">分類</th>
                <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider text-muted-foreground">當前庫存</th>
                <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">熱量 (kcal/100g)</th>
                <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider text-muted-foreground">過敏原標籤</th>
                <th className="px-8 py-5 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <span className="text-sm font-medium">正在檢索資料庫...</span>
                    </div>
                  </td>
                </tr>
              ) : ingredients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">找不到符合的食材</p>
                  </td>
                </tr>
              ) : (
                ingredients.filter(ing => activeTab === 'ALL' || ing.isInUse).map((ing) => (
                  <tr key={ing.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 flex items-center gap-2">
                            {ing.name}
                            {!ing.isInUse && <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">未被食譜使用</span>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                        {ing.category || '未分類'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-bold",
                            ing.safetyStock === null ? "text-gray-700" : (ing.currentStock <= ing.safetyStock ? "text-destructive" : "text-emerald-600")
                          )}>
                            {ing.currentStock} {ing.unit}
                          </span>
                          {ing.safetyStock !== null && ing.currentStock <= ing.safetyStock && (
                            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          安全警戒: {ing.safetyStock !== null ? `${ing.safetyStock} ${ing.unit}` : '未啟用'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-mono text-center text-gray-600">{ing.calories?.toFixed(1) || '-'}</td>
                    <td className="px-8 py-5">
                      {ing.isAllergen ? (
                        <div className="flex flex-wrap gap-1">
                          {ing.allergens && ing.allergens.length > 0 ? (
                            ing.allergens.map((a) => (
                              <span key={a.id} className="px-2.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-extrabold rounded-full border border-rose-100 shadow-sm animate-in fade-in duration-200">
                                {a.name}
                              </span>
                            ))
                          ) : (
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-extrabold rounded-full border border-rose-100 shadow-sm">
                              {ing.allergenType || '含有過敏原'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">無</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => setSelectedIngredient(ing)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-primary/10 rounded-lg transition-all text-muted-foreground hover:text-primary font-bold text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        編輯
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIngredient && (
        <EditIngredientModal 
          ingredient={selectedIngredient}
          onClose={() => setSelectedIngredient(null)}
          onSuccess={fetchIngredients}
        />
      )}

      {/* Allergen Tag Management Modal */}
      <AllergenManagerModal 
        isOpen={isAllergenMgrOpen}
        onClose={() => setIsAllergenMgrOpen(false)}
        onRefreshAllergens={fetchIngredients}
      />
    </div>
  );
};

export default Ingredients;
