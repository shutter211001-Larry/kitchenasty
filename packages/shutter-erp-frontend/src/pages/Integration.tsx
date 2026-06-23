import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, Workflow, Database, Calendar, ShoppingBag, 
  CheckCircle2, AlertOctagon, Save, Link2, 
  Unlink, TrendingUp, RefreshCw, AlertTriangle, Truck, 
  ArrowRight, Sparkles
} from 'lucide-react';
import { formatUnit } from '../lib/utils';
interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: {
    name: string;
  };
}

interface Recipe {
  id: string;
  name: string;
  yieldAmount: number;
  isProduct?: boolean;
  bakingLossRate?: number;
}

interface Mapping {
  menuItemId: string;
  recipeId: string;
  menuItemName: string;
  menuItemPrice: number;
  recipeName: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: {
    id: string;
    name: string;
    quantity: number;
  }[];
}

interface Reservation {
  id: string;
  partySize: number;
  date: string;
  time: string;
  status: string;
  customer?: {
    name: string;
  };
}

interface ForecastedIngredient {
  ingredientId: string;
  name: string;
  predictedDemand: number;
  currentStock: number;
  safetyStock: number;
  unit: string;
  shortage: boolean;
  shortageAmount: number;
}

const Integration = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'binding' | 'forecast' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionOk, setConnectionOk] = useState(false);
  
  // Data lists
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [forecastedIngredients, setForecastedIngredients] = useState<ForecastedIngredient[]>([]);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeForMenu, setSelectedRecipeForMenu] = useState<Record<string, string>>({});
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Inventory logs (deduction logs fetched from PizzaMaster backend)
  const [deductionLogs, setDeductionLogs] = useState<any[]>([]);

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const fetchSyncData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      // 1. Fetch Recipes from PizzaMaster
      const recipesRes = await axios.get('http://localhost:3000/api/recipes');
      setRecipes(recipesRes.data);

      // 2. Fetch Mappings from PizzaMaster
      const mappingsRes = await axios.get('http://localhost:3000/api/integration/mappings');
      setMappings(mappingsRes.data.data || []);

      // 3. Fetch Sync Data (Orders, MenuItems, Reservations) via PizzaMaster Integration Controller Proxy
      const proxyRes = await axios.get('http://localhost:3000/api/integration/shutter-data');
      const proxyData = proxyRes.data.data;
      setConnectionOk(proxyData.connectionOk);
      setMenuItems(proxyData.menuItems || []);
      setOrders(proxyData.orders || []);
      setReservations(proxyData.reservations || []);

      // 4. Fetch Forecast from PizzaMaster if connected
      if (proxyData.connectionOk) {
        const forecastRes = await axios.get('http://localhost:3000/api/integration/forecast');
        setForecastedIngredients(forecastRes.data.forecastedIngredients || []);
      }

      // 5. Fetch Inventory Logs (filter by '線上訂餐' to show ERP deductions)
      const logsRes = await axios.get('http://localhost:3000/api/inventory/logs');
      const filteredLogs = (logsRes.data || []).filter((log: any) => log.reason?.includes('線上訂餐'));
      setDeductionLogs(filteredLogs);

    } catch (error: any) {
      console.error('Failed to sync ERP data', error);
      triggerAlert('error', '與後台 API 通訊失敗，請確認 PizzaMaster 伺服器是否正常運行。');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSyncData();
  }, []);

  // Save binding mapping
  const handleSaveBinding = async (menuItem: MenuItem) => {
    const recipeId = selectedRecipeForMenu[menuItem.id];
    if (!recipeId) {
      triggerAlert('error', '請先選擇一個食譜再進行綁定！');
      return;
    }

    const recipe = recipes.find(r => r.id === recipeId);
    try {
      setRefreshing(true);
      await axios.post('http://localhost:3000/api/integration/mappings', {
        menuItemId: menuItem.id,
        recipeId: recipeId,
        menuItemName: menuItem.name,
        menuItemPrice: menuItem.price,
        recipeName: recipe?.name || ''
      });
      
      triggerAlert('success', `成功將「${menuItem.name}」綁定至食譜「${recipe?.name}」！`);
      fetchSyncData(true);
    } catch (error) {
      console.error('Failed to save binding', error);
      triggerAlert('error', '儲存綁定關係失敗');
    } finally {
      setRefreshing(false);
    }
  };

  // Remove binding mapping
  const handleRemoveBinding = async (menuItemId: string, menuItemName: string) => {
    if (!confirm(`確定要解除「${menuItemName}」的食譜綁定嗎？\n解除後，該商品的線上訂單將不再自動扣減中央廚房庫存。`)) return;
    try {
      setRefreshing(true);
      await axios.delete(`http://localhost:3000/api/integration/mappings/${menuItemId}`);
      triggerAlert('success', `已解除「${menuItemName}」的食譜綁定關係。`);
      fetchSyncData(true);
    } catch (error) {
      console.error('Failed to remove binding', error);
      triggerAlert('error', '解除綁定失敗');
    } finally {
      setRefreshing(false);
    }
  };

  // Alert Supplier Simulation
  const handleAlertSupplier = (ingredientName: string, amount: number, unit: string) => {
    alert(`【採購請求送出】\n已自動向預設供應商發送「${ingredientName}」的緊急採購單！\n預計補貨數量：${Math.ceil(amount * 1.5)} ${unit}（含安全備料）`);
    triggerAlert('success', `已送出「${ingredientName}」緊急採購通知！`);
  };

  // Filter MenuItems based on search
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const boundRatio = menuItems.length > 0 ? (mappings.length / menuItems.length) * 100 : 0;
  const totalUpcomingGuests = reservations.reduce((sum, r) => sum + (r.partySize || 0), 0);
  const shortageCount = forecastedIngredients.filter(i => i.shortage).length;

  return (
    <div className="flex flex-col gap-8">
      {/* Toast Alert */}
      {alertMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
          alertMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {alertMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertOctagon className="w-5 h-5 text-red-600" />}
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">中央廚房 ERP 整合系統</h2>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black tracking-wider uppercase shrink-0">
              Closed-Loop ERP
            </span>
          </div>
          <p className="text-muted-foreground mt-1">打通「產地配方 ➔ 中央廚房庫存 ➔ 門市預約 ➔ 線上訂餐」的供應鏈閉環生態圈</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {/* Connection Status Monitor */}
          <div className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold shadow-sm bg-white ${
            connectionOk ? 'border-emerald-100 text-emerald-700' : 'border-red-100 text-red-700'
          }`}>
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connectionOk ? 'bg-emerald-400' : 'bg-red-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                connectionOk ? 'bg-emerald-500' : 'bg-red-500'
              }`}></span>
            </span>
            <span>Front App: {connectionOk ? '線上連線中' : '連線中斷'}</span>
          </div>

          <button 
            onClick={() => fetchSyncData(true)} 
            disabled={refreshing}
            className="flex-none p-3.5 bg-white border border-border hover:bg-muted text-gray-700 rounded-xl transition-all duration-200 disabled:opacity-55 active:scale-95 shadow-sm cursor-pointer"
            title="同步最新數據"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Tabs Selection */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap shrink-0">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'overview' ? 'border-primary text-primary font-black' : 'border-transparent text-muted-foreground hover:text-gray-700'
          }`}
        >
          <Workflow className="w-4 h-4" />
          閉環整合看板
        </button>
        <button 
          onClick={() => setActiveTab('binding')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'binding' ? 'border-primary text-primary font-black' : 'border-transparent text-muted-foreground hover:text-gray-700'
          }`}
        >
          <Link2 className="w-4 h-4" />
          食譜與菜單綁定 ({mappings.length}/{menuItems.length})
        </button>
        <button 
          onClick={() => setActiveTab('forecast')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'forecast' ? 'border-primary text-primary font-black' : 'border-transparent text-muted-foreground hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          門市預約與食材預測 {shortageCount > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-black animate-pulse">{shortageCount}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-150 flex items-center gap-2 whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'logs' ? 'border-primary text-primary font-black' : 'border-transparent text-muted-foreground hover:text-gray-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          線上訂餐與扣減日誌
        </button>
      </div>

      {loading ? (
        <div className="py-32 text-center bg-white/50 border border-border rounded-3xl backdrop-blur-md">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-muted-foreground tracking-widest">中央廚房閉環數據載入中...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-8">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <Link2 className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">食譜綁定率</span>
                    <h3 className="text-2xl font-black text-gray-800 mt-0.5">{boundRatio.toFixed(0)}%</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">已綁定 {mappings.length} 項線上商品</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">同步線上訂單數</span>
                    <h3 className="text-2xl font-black text-gray-800 mt-0.5">{orders.length} 筆</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">即時觸發 ERP 庫存自動扣減</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">門市預約總人數</span>
                    <h3 className="text-2xl font-black text-gray-800 mt-0.5">{totalUpcomingGuests} 位</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">來自未來 {reservations.length} 筆門市預約</p>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border shadow-sm flex items-center gap-4 ${
                  shortageCount > 0 ? 'bg-red-50/50 border-red-200 text-red-900' : 'bg-white border-border'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    shortageCount > 0 ? 'bg-red-100' : 'bg-gray-50'
                  }`}>
                    <AlertTriangle className={`w-6 h-6 ${shortageCount > 0 ? 'text-red-600 animate-bounce' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">缺料食材警報</span>
                    <h3 className="text-2xl font-black mt-0.5">{shortageCount} 品項</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {shortageCount > 0 ? '庫存不足以支應未來預約需求！' : '目前中央廚房庫存充沛'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supply Chain Pipeline Visualization */}
              <div className="bg-white p-8 rounded-3xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-8">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-gray-800">極致供應鏈閉環數據流 pipeline</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-center">
                  {/* Step 1: Recipe R&D */}
                  <div className="bg-orange-50/40 border border-orange-100 p-5 rounded-2xl flex flex-col items-center text-center shadow-sm hover:scale-105 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white mb-3">
                      <Database className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-orange-800 font-extrabold uppercase tracking-wider mb-1">R&D Recipe</span>
                    <h4 className="text-sm font-bold text-gray-800">產地配方</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">已登錄 {recipes.length} 項披薩與麵體配方</p>
                  </div>

                  <div className="hidden lg:flex justify-center text-orange-300">
                    <ArrowRight className="w-8 h-8" />
                  </div>
                  <div className="lg:hidden flex justify-center text-orange-300 my-1 rotate-90 shrink-0">
                    <ArrowRight className="w-6 h-6" />
                  </div>

                  {/* Step 2: Inventory */}
                  <div className="bg-blue-50/40 border border-blue-100 p-5 rounded-2xl flex flex-col items-center text-center shadow-sm hover:scale-105 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white mb-3">
                      <Workflow className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-blue-800 font-extrabold uppercase tracking-wider mb-1">Central Kitchen</span>
                    <h4 className="text-sm font-bold text-gray-800">中央廚房庫存</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">即時進行進出庫與合約計價</p>
                  </div>

                  <div className="hidden lg:flex justify-center text-blue-300">
                    <ArrowRight className="w-8 h-8" />
                  </div>
                  <div className="lg:hidden flex justify-center text-blue-300 my-1 rotate-90 shrink-0">
                    <ArrowRight className="w-6 h-6" />
                  </div>

                  {/* Step 3: Reservations */}
                  <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl flex flex-col items-center text-center shadow-sm hover:scale-105 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-3">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-emerald-800 font-extrabold uppercase tracking-wider mb-1">Store Reservation</span>
                    <h4 className="text-sm font-bold text-gray-800">門市預約</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">即將迎來 {totalUpcomingGuests} 位貴賓用餐</p>
                  </div>

                  <div className="hidden lg:flex justify-center text-emerald-300">
                    <ArrowRight className="w-8 h-8" />
                  </div>
                  <div className="lg:hidden flex justify-center text-emerald-300 my-1 rotate-90 shrink-0">
                    <ArrowRight className="w-6 h-6" />
                  </div>

                  {/* Step 4: Online Orders */}
                  <div className="bg-purple-50/40 border border-purple-100 p-5 rounded-2xl flex flex-col items-center text-center shadow-sm hover:scale-105 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white mb-3">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-purple-800 font-extrabold uppercase tracking-wider mb-1">Online Ordering</span>
                    <h4 className="text-sm font-bold text-gray-800">線上接單扣減</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">出餐自動扣庫存，計入原物料耗用</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BINDING */}
          {activeTab === 'binding' && (
            <div className="flex flex-col gap-6">
              {/* Search Bar */}
              <div className="bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-border flex gap-4 items-center shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="輸入線上商品名稱或分類搜尋..." 
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Bindings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenuItems.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-3xl bg-white/50">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-semibold text-gray-500">找不到符合搜尋條件的線上商品</p>
                  </div>
                ) : (
                  filteredMenuItems.map(item => {
                    const bound = mappings.find(m => m.menuItemId === item.id);
                    
                    return (
                      <div key={item.id} className="bg-white rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between min-h-[220px] transition-all hover:shadow-md">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-600">
                              {item.category?.name || '無分類'}
                            </span>
                            <span className="text-sm font-black text-gray-800">
                              NT$ {item.price}
                            </span>
                          </div>

                          <h4 className="text-lg font-bold text-gray-800 mb-1">{item.name}</h4>
                          
                          {bound ? (
                            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                              <div className="min-w-0">
                                <span className="text-[10px] text-emerald-600 font-extrabold uppercase block tracking-wider">已綁定配方</span>
                                <span className="text-sm font-semibold text-emerald-800 truncate block mt-0.5">{bound.recipeName}</span>
                              </div>
                              <button 
                                onClick={() => handleRemoveBinding(item.id, item.name)}
                                className="p-2 hover:bg-red-50 text-emerald-700 hover:text-red-600 rounded-lg transition-colors shrink-0"
                                title="解除綁定"
                              >
                                <Unlink className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 p-3 bg-orange-50/50 border border-orange-100 rounded-xl">
                              <span className="text-[10px] text-orange-600 font-extrabold uppercase block tracking-wider mb-2">未綁定研發配方</span>
                              
                              <select 
                                className="w-full text-xs p-2 border border-orange-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-gray-700 font-medium"
                                value={selectedRecipeForMenu[item.id] || ''}
                                onChange={(e) => setSelectedRecipeForMenu({
                                  ...selectedRecipeForMenu,
                                  [item.id]: e.target.value
                                })}
                              >
                                <option value="">-- 請選擇 PizzaMaster 配方食譜 --</option>
                                {recipes.filter(r => r.isProduct !== false).map(r => (
                                  <option key={r.id} value={r.id}>{r.name} (產出：{r.yieldAmount}份)</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {!bound && (
                          <button
                            onClick={() => handleSaveBinding(item)}
                            className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all duration-200"
                          >
                            <Save className="w-4 h-4" />
                            儲存食譜配方綁定
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FORECAST */}
          {activeTab === 'forecast' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Upcoming Reservations Panel */}
              <div className="bg-white p-6 rounded-3xl border border-border shadow-sm h-fit">
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-gray-800">門市預約明細 ({reservations.length} 筆)</h3>
                </div>

                {reservations.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-2xl">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">接下來尚無已確認的門市預約</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                    {reservations.map(res => (
                      <div key={res.id} className="p-4 bg-muted/30 border border-border/50 rounded-2xl flex justify-between items-center hover:bg-muted/50 transition-colors">
                        <div>
                          <h4 className="text-sm font-black text-gray-800">{res.customer?.name || '匿名貴賓'}</h4>
                          <span className="text-[10px] text-muted-foreground block mt-1 font-semibold">
                            {res.date.split('T')[0]} @ {res.time}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black">
                            {res.partySize} 人
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Demand Forecasting Report */}
              <div className="bg-white p-6 rounded-3xl border border-border shadow-sm lg:col-span-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-gray-800">智慧食材消耗預估報告</h3>
                  </div>
                  
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-xs text-emerald-700 font-extrabold flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                    已依據線上點餐受歡迎權重進行校準
                  </span>
                </div>

                {forecastedIngredients.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-3xl">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-25" />
                    <p className="font-semibold text-gray-500">無法生成預測報告，請確認是否已在「第二分頁」綁定了食材與食譜</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-extrabold">
                          <th className="pb-3 text-gray-600">原物料名稱</th>
                          <th className="pb-3 text-gray-600">預估需求量</th>
                          <th className="pb-3 text-gray-600">中廚現有庫存</th>
                          <th className="pb-3 text-gray-600">預警狀態</th>
                          <th className="pb-3 text-gray-600 text-right">採購建議</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastedIngredients.map(ing => (
                          <tr key={ing.ingredientId} className="border-b border-border/40 text-sm hover:bg-muted/10 transition-colors">
                            <td className="py-4 font-bold text-gray-800">{ing.name}</td>
                            <td className="py-4 text-gray-700 font-semibold">{ing.predictedDemand.toFixed(1)} {ing.unit}</td>
                            <td className="py-4 text-gray-700 font-semibold">{ing.currentStock.toFixed(1)} {ing.unit}</td>
                            <td className="py-4">
                              {ing.shortage ? (
                                <span className="px-2.5 py-1 bg-red-50 border border-red-100 rounded-full text-[10px] text-red-600 font-black flex items-center gap-1 w-fit animate-pulse">
                                  <AlertCircleIcon />
                                  缺料NT$ {ing.shortageAmount.toFixed(1)} {ing.unit}
                                </span>
                              ) : ing.currentStock < ing.safetyStock ? (
                                <span className="px-2.5 py-1 bg-yellow-50 border border-yellow-100 rounded-full text-[10px] text-yellow-600 font-black flex items-center gap-1 w-fit">
                                  <WarningIcon />
                                  低於安全水位
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] text-emerald-600 font-black flex items-center gap-1 w-fit">
                                  <CheckIcon />
                                  庫存充沛
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-right">
                              {ing.shortage ? (
                                <button
                                  onClick={() => handleAlertSupplier(ing.name, ing.shortageAmount, ing.unit)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black shadow-sm shadow-red-200 transition-colors flex items-center gap-1 ml-auto"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  聯繫供應商
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground font-semibold">毋需動作</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LOGS */}
          {activeTab === 'logs' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Online Orders Live List */}
              <div className="bg-white p-6 rounded-3xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-gray-800">最新線上點餐 ({orders.length} 筆)</h3>
                </div>

                {orders.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-2xl">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">暫無任何線上訂餐紀錄</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {orders.map(order => (
                      <div key={order.id} className="p-4 bg-muted/30 border border-border/50 rounded-2xl hover:bg-muted/50 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-black text-gray-800">#{order.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            order.status === 'CONFIRMED' || order.status === 'DELIVERED' || order.status === 'PREPARING'
                              ? 'bg-emerald-50 text-emerald-600'
                              : order.status === 'CANCELLED'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-yellow-50 text-yellow-600'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 mt-3 border-t border-dashed border-border pt-2 text-xs font-medium text-gray-600">
                          {order.items?.map(item => (
                            <div key={item.id} className="flex justify-between">
                              <span>{item.name}</span>
                              <span className="font-bold text-gray-700">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 text-right text-xs text-muted-foreground font-semibold">
                          {order.createdAt.split('T')[0]} {order.createdAt.split('T')[1]?.substring(0,5) || ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stock Deduction Logs from PizzaMaster */}
              <div className="bg-white p-6 rounded-3xl border border-border shadow-sm lg:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <Database className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-gray-800">中央廚房庫存自動扣減日誌</h3>
                </div>

                {deductionLogs.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-3xl">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-25" />
                    <p className="font-semibold text-gray-500">尚無線上訂餐庫存扣減日誌</p>
                    <p className="text-xs text-muted-foreground mt-1.5">當您在 Shutter 點擊「確認訂單」且商品已綁定食譜時，系統會自動產生日誌</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-extrabold">
                          <th className="pb-3 text-gray-600">原料名稱</th>
                          <th className="pb-3 text-gray-600">異動量</th>
                          <th className="pb-3 text-gray-600">異動事由</th>
                          <th className="pb-3 text-gray-600 text-right">時間</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deductionLogs.map(log => (
                          <tr key={log.id} className="border-b border-border/40 text-sm hover:bg-muted/10 transition-colors">
                            <td className="py-3.5 font-bold text-gray-800">{log.ingredient?.name || '未知原料'}</td>
                            <td className="py-3.5 font-bold text-red-600">-{formatUnit(log.amount, log.ingredient?.unit || '', globalSettings).value} {formatUnit(log.amount, log.ingredient?.unit || '', globalSettings).unit}</td>
                            <td className="py-3.5 text-xs text-gray-600 font-semibold leading-relaxed max-w-[280px] truncate" title={log.reason}>
                              {log.reason}
                            </td>
                            <td className="py-3.5 text-right text-xs text-muted-foreground font-semibold">
                              {new Date(log.createdAt).toLocaleString('zh-TW', { hour12: false })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// SVG icons as small inline components
const AlertCircleIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default Integration;
