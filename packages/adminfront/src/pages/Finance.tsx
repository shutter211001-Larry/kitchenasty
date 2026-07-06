import { useState, useEffect } from "react";

import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ShoppingCart,
  Calendar
} from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/layout/PageHeader";
import { PageContent } from "../components/layout/PageContent";

const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const getStartOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getEndOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

interface FinanceData {
  period: { start: string; end: string };
  revenue: number;
  expenses: number;
  payroll: {
    hourly: number;
    monthly: number;
    total: number;
  };
  grossProfit: number;
  netProfit: number;
}

export default function Finance() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Default to current month
  const [dateRange, setDateRange] = useState({
    start: formatDate(getStartOfMonth(new Date())),
    end: formatDate(getEndOfMonth(new Date())),
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get<FinanceData>(`/../shutter-erp/api/finance/pnl?startDate=${dateRange.start}&endDate=${dateRange.end}`);
      setData(res);
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (preset: 'today' | 'thisMonth' | 'lastMonth') => {
    const today = new Date();
    if (preset === 'today') {
      setDateRange({
        start: formatDate(today),
        end: formatDate(today)
      });
    } else if (preset === 'thisMonth') {
      setDateRange({
        start: formatDate(getStartOfMonth(today)),
        end: formatDate(getEndOfMonth(today))
      });
    } else if (preset === 'lastMonth') {
      const lastMonth = subDays(getStartOfMonth(today), 1);
      setDateRange({
        start: formatDate(getStartOfMonth(lastMonth)),
        end: formatDate(getEndOfMonth(lastMonth))
      });
    }
  };

  const ActionButtons = (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto bg-gray-50 p-2 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500 ml-2" />
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          className="text-sm border-none bg-transparent focus:ring-0 px-2 py-1 outline-none font-medium"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          className="text-sm border-none bg-transparent focus:ring-0 px-2 py-1 outline-none font-medium"
        />
      </div>
      <div className="flex gap-1 border-l border-gray-300 pl-2">
        <button onClick={() => handlePreset('thisMonth')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 text-primary-600 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">本月</button>
        <button onClick={() => handlePreset('lastMonth')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">上月</button>
      </div>
    </div>
  );

  return (
    <div className="pb-12">
      <PageHeader 
        title="損益表 (P&L)" 
        subtitle="檢視營業收入、成本與淨利"
        action={ActionButtons}
      />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : data ? (
        <PageContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="總營收" 
              amount={data.revenue} 
              icon={TrendingUp} 
              color="text-emerald-600"
              bg="bg-emerald-100"
            />
            <StatCard 
              title="進貨與雜支" 
              amount={data.expenses} 
              icon={ShoppingCart} 
              color="text-orange-600"
              bg="bg-orange-100"
            />
            <StatCard 
              title="薪資費用" 
              amount={data.payroll.total} 
              icon={Users} 
              color="text-blue-600"
              bg="bg-blue-100"
            />
            <StatCard 
              title="淨利潤" 
              amount={data.netProfit} 
              icon={DollarSign} 
              color={data.netProfit >= 0 ? "text-primary-600" : "text-red-600"}
              bg={data.netProfit >= 0 ? "bg-primary-100" : "bg-red-100"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PageContent>
              <h3 className="text-lg font-bold mb-4">財務結構</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">總營收</span>
                  <span className="font-bold">${data.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100 text-orange-600">
                  <span className="font-medium">- 進貨與其他支出</span>
                  <span className="font-bold">-${data.expenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100 font-bold bg-gray-50 px-3 rounded-lg">
                  <span>毛利 (Gross Profit)</span>
                  <span>${data.grossProfit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100 text-blue-600">
                  <span className="font-medium">- 總薪資費用</span>
                  <span className="font-bold">-${data.payroll.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-4 font-black text-lg bg-primary-50 px-3 rounded-lg">
                  <span className={data.netProfit >= 0 ? "text-primary-600" : "text-red-600"}>淨利 (Net Profit)</span>
                  <span className={data.netProfit >= 0 ? "text-primary-600" : "text-red-600"}>
                    ${data.netProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </PageContent>

            <PageContent>
              <h3 className="text-lg font-bold mb-4">薪資費用明細</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-gray-600 font-medium">月薪制員工</span>
                  </div>
                  <span className="font-bold">${data.payroll.monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-indigo-500" />
                    </div>
                    <span className="text-gray-600 font-medium">時薪制員工</span>
                  </div>
                  <span className="font-bold">${data.payroll.hourly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </PageContent>
          </div>
        </div>
        </PageContent>
      ) : null}
    </div>
  );
}

function StatCard({ title, amount, icon: Icon, color, bg }: { title: string, amount: number, icon: any, color: string, bg: string }) {
  return (
    <PageContent noPadding>
      <div className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 mb-1">{title}</p>
          <p className={`text-2xl font-black tracking-tight ${color === 'text-primary-600' ? 'text-gray-900' : ''} ${amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ${Math.round(amount).toLocaleString()}
          </p>
        </div>
      </div>
    </PageContent>
  );
}
