import React, { useState } from "react";
import axios from "axios";
import { X, ArrowDownRight, ArrowUpRight, Scale, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
interface Props {
  ingredient: any;
  type: "IN" | "OUT" | "ADJUST";
  onClose: () => void;
  onSuccess: () => void;
}
const StockAdjustmentModal: React.FC<Props> = ({
  ingredient,
  type,
  onClose,
  onSuccess
}) => {
  const {
    t
  } = useTranslation();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createExpense, setCreateExpense] = useState(true);
  const [supplierPriceId, setSupplierPriceId] = useState<string>("");
  const [manualCost, setManualCost] = useState<string>("");

  React.useEffect(() => {
    if (ingredient?.prices?.length > 0) {
      const defaultPrice = ingredient.prices.find((p: any) => p.isDefault);
      if (defaultPrice) {
        setSupplierPriceId(defaultPrice.id);
      } else {
        setSupplierPriceId(ingredient.prices[0].id);
      }
    }
  }, [ingredient]);

  React.useEffect(() => {
    if (type === "IN" && createExpense && amount) {
      const numAmount = Number(amount);
      if (!isNaN(numAmount) && ingredient?.prices) {
        if (supplierPriceId) {
          const selectedPrice = ingredient.prices.find((p: any) => p.id === supplierPriceId);
          if (selectedPrice) {
            const calculatedCost = numAmount * selectedPrice.unitPrice;
            setManualCost(Math.round(calculatedCost).toString());
          }
        }
      }
    }
  }, [amount, supplierPriceId, createExpense, type, ingredient]);

  // Auto-filled reasons suggestions based on action type
  const suggestions = {
    IN: [t("erp_222"), t("erp_223"), t("erp_224"), t("erp_225")],
    OUT: [t("erp_226"), t("erp_227"), t("erp_228"), t("erp_229")],
    ADJUST: [t("erp_230"), t("erp_231"), t("erp_232")]
  }[type];
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      setError(t("erp_233"));
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      if (type !== "ADJUST" || numAmount < 0) {
        setError(t("erp_234"));
        return;
      }
    }
    try {
      setLoading(true);
      setError(null);
      await axios.post("http://localhost:3000/api/inventory/log", {
        ingredientId: ingredient.id,
        type,
        amount: numAmount,
        reason: reason.trim() || suggestions[0],
        createExpense: type === "IN" ? createExpense : undefined,
        supplierPriceId: type === "IN" && createExpense && supplierPriceId ? supplierPriceId : undefined,
        manualCost: type === "IN" && createExpense && manualCost ? Number(manualCost) : undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || t("erp_235"));
    } finally {
      setLoading(false);
    }
  };
  const getTheme = () => {
    switch (type) {
      case "IN":
        return {
          title: t("erp_236"),
          color: "text-emerald-600 bg-emerald-50 border-emerald-100",
          btnBg: "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-500",
          icon: <ArrowUpRight className="w-6 h-6 text-emerald-600" />
        };
      case "OUT":
        return {
          title: t("erp_237"),
          color: "text-rose-600 bg-rose-50 border-rose-100",
          btnBg: "bg-rose-600 shadow-rose-600/20 hover:bg-rose-500",
          icon: <ArrowDownRight className="w-6 h-6 text-rose-600" />
        };
      case "ADJUST":
        return {
          title: t("erp_238"),
          color: "text-slate-600 bg-slate-50 border-slate-100",
          btnBg: "bg-slate-700 shadow-slate-700/20 hover:bg-slate-650",
          icon: <Scale className="w-6 h-6 text-slate-600" />
        };
    }
  };
  const theme = getTheme();
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <header className="p-8 pb-6 border-b border-border bg-muted/20 relative">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl border ${theme.color}`}>
                {theme.icon}
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800">
                  {theme.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("erp_239")}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full shadow-sm transition-all border border-transparent hover:border-border/50">
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-6">
            {/* Ingredient Info Box */}
            <div className="bg-muted/30 border border-border/40 p-5 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {t("erp_240")}
                </span>
                <h4 className="text-sm font-black text-gray-800 mt-0.5">
                  {ingredient.name}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t("erp_241")}
                  {ingredient.category || t("erp_242")}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {t("erp_243")}
                </span>
                <div className="text-base font-black text-primary mt-0.5">
                  {ingredient.currentStock}{" "}
                  <span className="text-xs font-bold text-gray-500">
                    {ingredient.unit}
                  </span>
                </div>
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-xs font-bold leading-normal">
                  {error}
                </span>
              </div>}

            {/* Amount input */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
                {type === "IN" ? t("erp_244") : type === "OUT" ? t("erp_245") : t("erp_246")}{" "}
                ({ingredient.unit})
              </label>
              <div className="relative">
                <input type="number" step="any" placeholder={type === "ADJUST" ? t("erp_247") : t("erp_248")} value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-muted/20 border border-border focus:border-primary/50 text-gray-800 rounded-2xl py-4 px-5 text-sm font-bold placeholder:text-muted-foreground/60 outline-none transition-all focus:ring-4 focus:ring-primary/5 focus:bg-white" required autoFocus />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">
                  {ingredient.unit}
                </span>
              </div>
            </div>

            {/* Quick Reason Suggestions */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
                {t("erp_249")}
              </label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => <button key={s} type="button" onClick={() => setReason(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${reason === s ? "bg-primary border-primary text-white shadow-sm shadow-primary/20 scale-105" : "bg-white border-border text-gray-600 hover:bg-muted/40"}`}>
                    {s}
                  </button>)}
              </div>
            </div>

            {/* Custom Reason Input */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
                {t("erp_250")}
              </label>
              <input type="text" placeholder={t("erp_251")} value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-muted/20 border border-border focus:border-primary/50 text-gray-800 rounded-2xl py-4 px-5 text-sm font-bold placeholder:text-muted-foreground/60 outline-none transition-all focus:ring-4 focus:ring-primary/5 focus:bg-white" />
            </div>

            {/* Auto Expense Checkbox and Supplier Options for IN */}
            {type === "IN" && (
              <div className="space-y-4 bg-muted/20 border border-border/50 rounded-2xl p-5 mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createExpense"
                    checked={createExpense}
                    onChange={(e) => setCreateExpense(e.target.checked)}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                  />
                  <label htmlFor="createExpense" className="text-sm font-bold text-gray-700 cursor-pointer">
                    自動建立應付帳款
                  </label>
                </div>
                
                {createExpense && ingredient?.prices && ingredient.prices.length > 0 && (
                  <div className="space-y-4 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
                        選擇供應商報價
                      </label>
                      <select 
                        value={supplierPriceId}
                        onChange={(e) => setSupplierPriceId(e.target.value)}
                        className="w-full bg-white border border-border focus:border-primary/50 text-gray-800 rounded-xl py-3 px-4 text-sm font-bold outline-none transition-all"
                      >
                        <option value="" disabled>請選擇供應商</option>
                        {ingredient.prices.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.supplier?.name || '未知供應商'} - ${p.price} / {p.packageSize}{p.packageUnit} (單價: ${Number(p.unitPrice).toFixed(2)}/{ingredient.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
                        進貨總金額 (可手動修改)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">$</span>
                        <input 
                          type="number" 
                          step="any"
                          value={manualCost}
                          onChange={(e) => setManualCost(e.target.value)}
                          className="w-full bg-white border border-border focus:border-primary/50 text-gray-800 rounded-xl py-3 pl-8 pr-4 text-sm font-bold outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {createExpense && (!ingredient?.prices || ingredient.prices.length === 0) && (
                   <div className="pt-2">
                     <p className="text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-xl border border-amber-100">
                       此食材目前沒有綁定任何供應商報價，系統將建立金額為 $0 的帳款，您可以直接在下方手動輸入總額。
                     </p>
                     <div className="space-y-2 mt-3">
                       <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
                         進貨總金額 (手動輸入)
                       </label>
                       <div className="relative">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">$</span>
                         <input 
                           type="number" 
                           step="any"
                           value={manualCost}
                           onChange={(e) => setManualCost(e.target.value)}
                           className="w-full bg-white border border-border focus:border-primary/50 text-gray-800 rounded-xl py-3 pl-8 pr-4 text-sm font-bold outline-none transition-all"
                         />
                       </div>
                     </div>
                   </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="p-8 border-t border-border bg-muted/20 flex justify-end gap-3.5">
            <button type="button" onClick={onClose} className="px-6 py-3.5 bg-white border border-border hover:bg-muted/30 text-gray-700 rounded-2xl font-black text-sm transition-all">
              {t("erp_71")}
            </button>
            <button type="submit" disabled={loading} className={`px-8 py-3.5 text-white rounded-2xl font-black text-sm shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none cursor-pointer ${theme.btnBg}`}>
              {loading ? t("erp_252") : t("erp_253")}
            </button>
          </footer>
        </form>
      </div>
    </div>;
};
export default StockAdjustmentModal;