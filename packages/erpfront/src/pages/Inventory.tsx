import i18n from "../i18n";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Package,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  History,
  AlertTriangle,
  CheckCircle,
  RotateCw,
} from "lucide-react";
import StockAdjustmentModal from "../components/StockAdjustmentModal";
import { useAuth } from "../context/AuthContext";
import { formatUnit } from "../lib/utils";
import { useTranslation } from "react-i18next";
const Inventory: React.FC = () => {
  const { t } = useTranslation();
  const {} = useAuth();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [activeTab, setActiveTab] = useState<"IN_USE" | "ALL">("IN_USE");

  // Modal states
  const [activeModal, setActiveModal] = useState<{
    ingredient: any;
    type: "IN" | "OUT" | "ADJUST";
  } | null>(null);
  const fetchData = async () => {
    try {
      setLoading(true);
      const [ingredientsRes, logsRes, settingsRes] = await Promise.all([
        axios.get("http://localhost:3000/api/ingredients"),
        axios.get("http://localhost:3000/api/inventory/logs"),
        axios.get("http://localhost:3000/api/settings"),
      ]);
      setIngredients(ingredientsRes.data);
      setLogs(logsRes.data);
      setGlobalSettings(settingsRes.data);
    } catch (error) {
      console.error("Failed to fetch inventory data", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  // Compute metrics
  const totalItems = ingredients.length;
  const lowStockItems = ingredients.filter(
    (i) =>
      i.safetyStock !== null &&
      i.safetyStock > 0 &&
      i.currentStock < i.safetyStock,
  ).length;
  const todayTransactions = logs.filter((log) => {
    const logDate = new Date(log.createdAt).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  }).length;

  // Categories list
  const categories = [
    "ALL",
    ...Array.from(new Set(ingredients.map((i) => i.category).filter(Boolean))),
  ];

  // Filtering
  const filteredIngredients = ingredients.filter((i) => {
    const matchesSearch =
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.category &&
        i.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === "ALL" || i.category === selectedCategory;
    const matchesLowStock =
      !onlyLowStock ||
      (i.safetyStock !== null &&
        i.safetyStock > 0 &&
        i.currentStock < i.safetyStock);
    const matchesInUse = activeTab === "ALL" || i.isInUse;
    return matchesSearch && matchesCategory && matchesLowStock && matchesInUse;
  });
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">
              {t("erp_415")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("erp_416")}</p>
        </div>
        <button
          onClick={fetchData}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-border hover:bg-muted/30 rounded-2xl text-xs font-black shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{t("erp_417")}</span>
        </button>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-white border border-border p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t("erp_418")}
            </span>
            <div className="text-3xl font-black text-gray-800">
              {totalItems}{" "}
              <span className="text-xs text-muted-foreground font-bold">
                {t("erp_419")}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div
          className={`p-6 rounded-[2rem] shadow-sm border flex items-center justify-between transition-all duration-300 ${lowStockItems > 0 ? "bg-red-50/50 border-red-100/80 animate-pulse" : "bg-white border-border"}`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t("erp_420")}
            </span>
            <div
              className={`text-3xl font-black ${lowStockItems > 0 ? "text-red-600" : "text-gray-800"}`}
            >
              {lowStockItems}{" "}
              <span className="text-xs font-bold text-muted-foreground">
                {t("erp_421")}
              </span>
            </div>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${lowStockItems > 0 ? "bg-red-100 text-red-600" : "bg-orange-50 text-orange-500"}`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-border p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t("erp_422")}
            </span>
            <div className="text-3xl font-black text-gray-800">
              {todayTransactions}{" "}
              <span className="text-xs text-muted-foreground font-bold">
                {t("erp_423")}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ingredients Stock Grid - Left (2 Columns width) */}
        <div className="lg:col-span-2 space-y-6 bg-white border border-border rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-gray-800">{t("erp_424")}</h3>
            <span className="text-xs font-black text-muted-foreground">
              {t("erp_425")}
              {filteredIngredients.length}
              {t("erp_426")}
            </span>
          </div>

          {/* Search and filter tools */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t("erp_427")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-muted/20 border border-border focus:border-primary/50 text-gray-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold placeholder:text-muted-foreground/60 outline-none transition-all focus:ring-4 focus:ring-primary/5 focus:bg-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex bg-muted/50 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setActiveTab("IN_USE")}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "IN_USE" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-gray-800"}`}
                >
                  {t("erp_324")}
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[10px]">
                    {ingredients.filter((i) => i.isInUse).length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "ALL" ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-gray-800"}`}
                >
                  {t("erp_428")}
                  <span className="ml-1.5 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-md text-[10px]">
                    {ingredients.length}
                  </span>
                </button>
              </div>

              <button
                onClick={() => setOnlyLowStock(!onlyLowStock)}
                className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-black border transition-all cursor-pointer ${onlyLowStock ? "bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/20" : "bg-white border-border text-gray-600 hover:bg-muted/40"}`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t("erp_429")}</span>
              </button>
            </div>
          </div>

          {/* Category Filter Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-4 py-2 rounded-xl text-xs font-black border shrink-0 transition-all cursor-pointer ${selectedCategory === c ? "bg-gray-800 border-gray-800 text-white" : "bg-white border-border text-gray-500 hover:bg-muted/40"}`}
              >
                {c === "ALL" ? i18n.t("erp_430") : c}
              </button>
            ))}
          </div>

          {/* Stock List Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <RotateCw className="w-8 h-8 animate-spin mb-3 text-primary" />
              <span className="text-xs font-bold">{t("erp_431")}</span>
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border">
              <Package className="w-10 h-10 mb-3 text-gray-300" />
              <span className="text-xs font-black">{t("erp_432")}</span>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredIngredients.map((item) => {
                const { t } = useTranslation();
                const isLowStock =
                  item.safetyStock !== null &&
                  item.safetyStock > 0 &&
                  item.currentStock < item.safetyStock;
                return (
                  <div
                    key={item.id}
                    className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:bg-muted/10 px-2 rounded-xl transition-all"
                  >
                    {/* Left: Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-gray-800 flex items-center gap-2">
                          {item.name}
                          {!item.isInUse && (
                            <span className="text-[9px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {t("erp_331")}
                            </span>
                          )}
                        </h4>
                        {item.category && (
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-lg text-[9px] font-black uppercase">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                        <span>
                          {t("erp_433")}
                          {
                            formatUnit(
                              item.safetyStock || 0,
                              item.unit,
                              globalSettings,
                            ).value
                          }{" "}
                          {
                            formatUnit(
                              item.safetyStock || 0,
                              item.unit,
                              globalSettings,
                            ).unit
                          }
                        </span>
                        <span>·</span>
                        {isLowStock ? (
                          <span className="flex items-center gap-0.5 text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 shadow-sm animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {t("erp_429")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm">
                            <CheckCircle className="w-2.5 h-2.5" />
                            {t("erp_434")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Current stock */}
                    <div className="md:text-right">
                      <span className="text-[9px] uppercase font-black text-muted-foreground tracking-wider block">
                        {t("erp_435")}
                      </span>
                      <span
                        className={`text-base font-black ${isLowStock ? "text-red-600" : "text-gray-800"}`}
                      >
                        {
                          formatUnit(
                            item.currentStock,
                            item.unit,
                            globalSettings,
                          ).value
                        }{" "}
                        <span className="text-xs font-bold text-gray-400">
                          {
                            formatUnit(
                              item.currentStock,
                              item.unit,
                              globalSettings,
                            ).unit
                          }
                        </span>
                      </span>
                    </div>

                    {/* Right: Quick Stock operations */}
                    <div className="flex gap-2 shrink-0 w-full md:w-auto">
                      <button
                        onClick={() =>
                          setActiveModal({
                            ingredient: item,
                            type: "IN",
                          })
                        }
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-emerald-55 border border-emerald-100 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{t("erp_436")}</span>
                      </button>
                      <button
                        onClick={() =>
                          setActiveModal({
                            ingredient: item,
                            type: "OUT",
                          })
                        }
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-rose-55 border border-rose-100 hover:bg-rose-600 hover:text-white text-rose-700 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>{t("erp_437")}</span>
                      </button>
                      <button
                        onClick={() =>
                          setActiveModal({
                            ingredient: item,
                            type: "ADJUST",
                          })
                        }
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-700 hover:text-white text-slate-700 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>{t("erp_438")}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock Transaction logs Ledger - Right (1 Column width) */}
        <div className="space-y-6 bg-white border border-border rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              {t("erp_439")}
            </h3>
            <span className="text-[10px] font-black text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded-md">
              Ledger
            </span>
          </div>

          {/* Logs timeline */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <RotateCw className="w-6 h-6 animate-spin mb-2 text-primary" />
              <span className="text-[10px] font-bold">{t("erp_440")}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-center">
              <History className="w-8 h-8 mb-2.5 text-gray-300" />
              <span className="text-xs font-bold leading-normal">
                {t("erp_441")}
              </span>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {logs.slice(0, 50).map((log) => {
                const getLogBadge = () => {
                  const { t } = useTranslation();
                  switch (log.type) {
                    case "IN":
                      return (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[8px] font-black uppercase">
                          {t("erp_436")}
                        </span>
                      );
                    case "OUT":
                      return (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[8px] font-black uppercase">
                          {t("erp_437")}
                        </span>
                      );
                    case "ADJUST":
                      return (
                        <span className="px-1.5 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded text-[8px] font-black uppercase">
                          {t("erp_442")}
                        </span>
                      );
                  }
                };
                return (
                  <div
                    key={log.id}
                    className="p-4 bg-muted/20 border border-border/40 hover:border-primary/25 rounded-2xl shadow-sm transition-all text-xs space-y-2"
                  >
                    {/* Timestamp & Type */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {getLogBadge()}
                    </div>

                    {/* Ingredient name & Quantity */}
                    <div className="flex justify-between items-center">
                      <span className="font-black text-gray-800 truncate max-w-[120px]">
                        {log.ingredient?.name || i18n.t("erp_443")}
                      </span>
                      <span
                        className={`font-mono font-black ${log.type === "IN" ? "text-emerald-600" : log.type === "OUT" ? "text-rose-600" : "text-slate-700"}`}
                      >
                        {log.type === "IN"
                          ? "+"
                          : log.type === "OUT"
                            ? "-"
                            : ""}
                        {
                          formatUnit(
                            log.amount,
                            log.ingredient?.unit || "",
                            globalSettings,
                          ).value
                        }{" "}
                        <span className="text-[10px] font-bold text-gray-400">
                          {
                            formatUnit(
                              log.amount,
                              log.ingredient?.unit || "",
                              globalSettings,
                            ).unit
                          }
                        </span>
                      </span>
                    </div>

                    {/* Reason */}
                    {log.reason && (
                      <p className="text-[10px] text-gray-500 font-semibold bg-white/60 p-1.5 px-2.5 rounded-lg border border-border/30">
                        {log.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Render Active Modal */}
      {activeModal && (
        <StockAdjustmentModal
          ingredient={activeModal.ingredient}
          type={activeModal.type}
          onClose={() => setActiveModal(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};
export default Inventory;
