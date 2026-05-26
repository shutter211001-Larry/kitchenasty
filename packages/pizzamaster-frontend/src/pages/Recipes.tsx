import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChefHat, Plus, Search, Utensils, Clock, Trash2, PieChart, TrendingUp, Pizza } from 'lucide-react';
import CreateRecipeModal from '../components/CreateRecipeModal';
import RecipeDetailModal from '../components/RecipeDetailModal';
import { cn } from '../lib/utils';

const isPortionUnit = (unit: string) => {
  if (!unit) return false;
  const portionUnits = ['份', '個', 'pcs', 'piece', '隻', '盤', '盒', '罐'];
  return portionUnits.some(u => unit.toLowerCase().includes(u));
};

const Recipes = () => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/recipes');
      setRecipes(response.data);
    } catch (error) {
      console.error('Failed to fetch recipes', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    try {
      const response = await axios.get(`http://localhost:3000/api/recipes/${recipeId}`);
      setEditingRecipe(response.data);
    } catch (error) {
      console.error('Failed to fetch full recipe', error);
      alert('無法取得食譜詳細資料');
    }
  };

  const handleView = async (recipeId: string) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/recipes/${recipeId}`);
      setSelectedRecipe(response.data);
    } catch (error) {
      console.error('Failed to fetch recipe detail', error);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const mainRecipes = recipes.filter(r => !r.isSubRecipe);
  const subRecipes = recipes.filter(r => r.isSubRecipe);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">食譜管理</h2>
          <p className="text-muted-foreground mt-1">建立產品食譜、計算成本與營養標示</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>建立新食譜</span>
        </button>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-col lg:flex-row gap-8 items-start relative min-h-[70vh]">
        
        {/* Left Side: Main Products (成品食譜) */}
        <div className="flex-1 space-y-6 w-full">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Pizza className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-black text-gray-800">成品食譜 ({mainRecipes.length})</h3>
            </div>
            <span className="text-xs font-bold text-muted-foreground">主產品披薩與獨立販售商品</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center text-muted-foreground">載入中...</div>
            ) : mainRecipes.length === 0 ? (
              <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-[2rem] bg-white/50">
                <Utensils className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold">尚無成品食譜</p>
                <p className="text-xs text-muted-foreground mt-1">點擊右上角「建立新食譜」開始。</p>
              </div>
            ) : (
              mainRecipes.map((r) => (
                <div 
                  key={r.id} 
                  onClick={() => handleView(r.id)}
                  className="bg-white rounded-[2rem] border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
                >
                  <div className="h-36 bg-gradient-to-br from-orange-100 to-primary/20 flex items-center justify-center relative overflow-hidden">
                    <Utensils className="w-14 h-14 text-primary/40 group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-primary">
                      已計算成本
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-black text-gray-800 truncate max-w-[160px]">{r.name}</h3>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-bold text-muted-foreground">
                        產出: {r.yieldAmount} {r.yieldUnit}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">{r.description || '暫無描述'}</p>
                    
                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                      <div>
                        <p className="text-[9px] uppercase font-black text-muted-foreground tracking-wider mb-0.5">預估成本</p>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-primary">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span className="text-base font-black">${r.cost?.toFixed(1) || '0'}</span>
                          </div>
                          {isPortionUnit(r.yieldUnit) && r.yieldAmount > 0 && (
                            <span className="text-[9px] font-black text-emerald-700 mt-1 bg-emerald-50 px-1.5 py-0.5 rounded-md w-max border border-emerald-100 shadow-sm">
                              單個 ${(r.cost / r.yieldAmount).toFixed(1)}/{r.yieldUnit}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-black text-muted-foreground tracking-wider mb-0.5">熱量 (份)</p>
                        <span className="text-base font-black text-gray-700">{Math.round(r.calories) || '0'} kcal</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex justify-between items-center">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button 
                      onClick={(e) => handleEdit(e, r.id)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      編輯食譜
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Collapsible Semi-Finished products sidebar (半成品) */}
        <div className={cn(
          "bg-white border border-border rounded-[2rem] shadow-sm transition-all duration-300 shrink-0 flex flex-col overflow-hidden lg:h-[72vh] w-full",
          sidebarExpanded ? "lg:w-80 h-[72vh]" : "lg:w-16 h-16 lg:h-[72vh]"
        )}>
          {/* Header */}
          <div className={cn(
            "p-5 border-b border-border flex items-center justify-between bg-muted/20 select-none",
            sidebarExpanded ? "flex-row" : "flex-col gap-4 py-6"
          )}>
            <div className={cn("flex items-center gap-2", sidebarExpanded ? "" : "flex-col")}>
              <ChefHat className={cn("text-primary", sidebarExpanded ? "w-5 h-5" : "w-6 h-6")} />
              {sidebarExpanded ? (
                <div>
                  <h4 className="text-xs font-black text-gray-800">半成品食譜 ({subRecipes.length})</h4>
                  <p className="text-[9px] text-muted-foreground mt-0.5">用於其他食譜的麵團/醬汁</p>
                </div>
              ) : (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full">
                  {subRecipes.length}
                </span>
              )}
            </div>
            
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-1.5 hover:bg-white rounded-lg shadow-sm border border-border/40 transition-all text-muted-foreground hover:text-primary shrink-0"
              title={sidebarExpanded ? "收合側邊欄" : "展開側邊欄"}
            >
              {sidebarExpanded ? (
                <span className="text-[10px] font-bold flex items-center gap-1">
                  <span className="hidden lg:inline">收合 →</span>
                  <span className="lg:hidden">收合 ↑</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold flex items-center gap-1">
                  <span className="hidden lg:inline">← 展開</span>
                  <span className="lg:hidden">展開 ↓</span>
                </span>
              )}
            </button>
          </div>

          {/* List content */}
          {sidebarExpanded ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loading ? (
                <div className="py-10 text-center text-xs text-muted-foreground">載入中...</div>
              ) : subRecipes.length === 0 ? (
                <div className="py-12 border border-dashed border-border rounded-2xl text-center text-muted-foreground flex flex-col items-center justify-center p-4 bg-muted/5">
                  <Utensils className="w-8 h-8 opacity-25 mb-2" />
                  <p className="text-xs font-bold">尚無半成品食譜</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                    建立食譜時勾選「標記為半成品」，即可收合至此處。
                  </p>
                </div>
              ) : (
                subRecipes.map(r => (
                  <div 
                    key={r.id}
                    onClick={() => handleView(r.id)}
                    className="p-4 bg-muted/20 border border-border hover:border-primary/30 rounded-2xl shadow-sm hover:shadow transition-all group cursor-pointer flex justify-between items-center"
                  >
                    <div className="space-y-1 flex-1 min-w-0 pr-2">
                      <h5 className="text-xs font-black text-gray-800 truncate">{r.name}</h5>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground font-semibold">
                        <span>產出: {r.yieldAmount}{r.yieldUnit}</span>
                        <span>·</span>
                        <span className="text-primary font-bold">成本: ${r.cost?.toFixed(1) || '0'}</span>
                        {isPortionUnit(r.yieldUnit) && r.yieldAmount > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
                              單個: ${(r.cost / r.yieldAmount).toFixed(1)}/{r.yieldUnit}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleEdit(e, r.id)}
                      className="px-2.5 py-1 bg-white border border-border text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold shadow-sm transition-all shrink-0"
                    >
                      編輯
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Collapsed view mini list
            <div className="flex-1 flex flex-col items-center justify-start py-6 gap-4 overflow-y-auto w-full px-2">
              {!loading && subRecipes.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleView(r.id)}
                  title={`${r.name} (成本: $${r.cost?.toFixed(1) || '0'})`}
                  className="w-10 h-10 bg-muted/50 hover:bg-primary/10 border border-border rounded-full flex items-center justify-center text-[10px] font-black text-gray-700 hover:text-primary transition-all shrink-0 shadow-sm"
                >
                  {r.name.slice(0, 2)}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {(showCreateModal || editingRecipe) && (
        <CreateRecipeModal 
          initialData={editingRecipe}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRecipe(null);
          }}
          onSuccess={fetchRecipes}
        />
      )}

      {selectedRecipe && (
        <RecipeDetailModal 
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
};

export default Recipes;
