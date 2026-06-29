import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Utensils, 
  Package, 
  Users, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '../lib/utils';

const StatCard = ({ title, value, icon: Icon, trend, color, isAlert }: any) => (
  <div className={cn(
    "glass p-6 rounded-[2rem] border transition-all duration-300 group shadow-sm hover:shadow-xl hover:-translate-y-0.5",
    isAlert ? "border-red-200 bg-red-50/10" : "border-border bg-white"
  )}>
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl shrink-0 text-white shadow-md", color)}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", 
          trend.startsWith('+') ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">{title}</h3>
    <p className={cn(
      "text-3xl font-black mt-1.5 font-mono",
      isAlert ? "text-red-600" : "text-gray-800"
    )}>{value}</p>
  </div>
);

interface LowStockIng {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  safetyStock: number | null;
}

interface PriceUpdate {
  id: string;
  supplierName: string;
  ingredientName: string;
  packageSize: number;
  packageUnit: string;
  price: number;
  updatedAt: string;
}

interface DashboardStats {
  totalIngredients: number;
  totalRecipes: number;
  totalSuppliers: number;
  lowStockCount: number;
  lowStockIngredients: LowStockIng[];
  recentPriceUpdates?: PriceUpdate[];
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return '剛剛';
  } else if (diffMin < 60) {
    return `${diffMin} 分鐘前`;
  } else if (diffHr < 24) {
    return `${diffHr} 小時前`;
  } else if (diffDay === 1) {
    return '昨天';
  } else if (diffDay < 7) {
    return `${diffDay} 天前`;
  } else {
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }
};

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalIngredients: 0,
    totalRecipes: 0,
    totalSuppliers: 0,
    lowStockCount: 0,
    lowStockIngredients: [],
    recentPriceUpdates: []
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">早安，經營者老闆</h2>
          <p className="text-muted-foreground mt-1">這是您的智慧餐飲研發 ERP 的即時營運動態與庫存警示看板</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto shrink-0">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-border rounded-xl font-bold text-xs hover:bg-muted transition-colors shadow-sm w-full sm:w-auto cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            <span>列印備忘錄</span>
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="食譜配方總數" 
          value={stats.totalRecipes} 
          icon={Utensils} 
          trend="+4" 
          color="bg-orange-500"
        />
        <StatCard 
          title="食材原料項目" 
          value={stats.totalIngredients} 
          icon={Package} 
          color="bg-blue-500"
        />
        <StatCard 
          title="合作供應商" 
          value={stats.totalSuppliers} 
          icon={Users} 
          color="bg-purple-500"
        />
        <StatCard 
          title="安全水位警示" 
          value={`${stats.lowStockCount} 項缺料`} 
          icon={AlertTriangle} 
          isAlert={stats.lowStockCount > 0}
          color={stats.lowStockCount > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Hand: Safe Stock Alert Board */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-border shadow-sm flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <AlertTriangle className={cn("w-5 h-5", stats.lowStockCount > 0 ? "text-red-500 animate-bounce" : "text-emerald-500")} />
                庫存補貨警戒看板
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                當前庫存水位低於或等於安全水位之原物料清單，請優先安排採購。
              </p>
            </div>
            
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider font-mono shadow-sm",
              stats.lowStockCount > 0 ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
            )}>
              {stats.lowStockCount > 0 ? 'Warning' : 'Healthy'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-80 border border-border/80 rounded-2xl p-4 bg-muted/5">
            {loading ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-xs font-medium">檢索庫存水位中...</span>
              </div>
            ) : stats.lowStockCount === 0 ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 bg-emerald-50 p-2.5 rounded-full" />
                <div>
                  <p className="text-sm font-extrabold text-emerald-700">✨ 倉庫水位極度健康！</p>
                  <p className="text-[10px] text-muted-foreground mt-1">目前所有食材原料存量均高於安全警戒水位，無需辦理補貨。</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.lowStockIngredients.map((ing) => (
                  <div 
                    key={ing.id} 
                    className="flex justify-between items-center bg-white border border-border p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-extrabold text-xs text-gray-800">{ing.name}</span>
                        <span className="ml-2 px-2 py-0.5 bg-muted rounded text-[9px] font-bold text-muted-foreground">
                          {ing.category || '未分類'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground font-semibold">當前存量</p>
                        <p className="font-mono text-xs font-black text-red-500 mt-0.5">{ing.currentStock} {ing.unit}</p>
                      </div>
                      
                      <div className="text-right border-l border-border/80 pl-6">
                        <p className="text-[10px] text-muted-foreground font-semibold">安全水位</p>
                        <p className="font-mono text-xs font-black text-slate-500 mt-0.5">
                          {ing.safetyStock !== null ? `${ing.safetyStock} ${ing.unit}` : '未啟用'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Hand: Supplier Feed & Cost Monitor */}
        <div className="bg-white rounded-3xl p-8 border border-border shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="text-primary w-5 h-5" />
              成本波動動態
            </h3>
            <div className="flex flex-col gap-6 max-h-[320px] overflow-y-auto pr-2">
              {stats.recentPriceUpdates && stats.recentPriceUpdates.length > 0 ? (
                stats.recentPriceUpdates.slice(0, 10).map((up, idx) => (
                  <div key={up.id} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                      {String.fromCharCode(65 + (idx % 26))}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-gray-800">
                        {up.supplierName} 價格更新
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {`已更新 ${up.ingredientName}${
                          up.packageSize === 1 && (up.packageUnit.toLowerCase() === 'kg' || up.packageUnit.toLowerCase() === 'l')
                            ? ''
                            : ` ${up.packageSize}${up.packageUnit.toUpperCase()}`
                        } 報價: $${up.price}`}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1">
                        {formatRelativeTime(up.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">尚無價格更新動態</p>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-border bg-gradient-to-r from-primary/5 to-orange-500/5 rounded-2xl p-4 border border-primary/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-primary font-black uppercase tracking-wider">採購預防守護</p>
              <p className="text-xs font-bold text-gray-700 mt-0.5">配方單價防呆比價已啟用</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
