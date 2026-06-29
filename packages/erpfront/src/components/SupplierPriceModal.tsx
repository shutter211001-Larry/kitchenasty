import i18n from "../i18n";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Plus,
  Trash2,
  Scale,
  DollarSign,
  PackageOpen,
  ListOrdered,
  Search,
  Edit,
  Save,
  Check,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: string;
}
interface Supplier {
  id: string;
  name: string;
}
interface SupplierPrice {
  id: string;
  ingredient: Ingredient;
  packageSize: number;
  packageUnit: string;
  price: number;
  unitPrice: number;
  isDefault?: boolean;
}
interface Props {
  supplier: Supplier;
  onClose: () => void;
}
export const SupplierPriceModal = ({ supplier, onClose }: Props) => {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<SupplierPrice[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [packageUnit, setPackageUnit] = useState("kg");
  const [price, setPrice] = useState("");

  // Auto-suggest State
  const [ingSearch, setIngSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Selected Ingredient Detail for unit restriction
  const selectedIngredient = ingredients.find(
    (i) => i.id === selectedIngredientId,
  );
  const fetchData = async () => {
    try {
      setLoading(true);
      const [pricesRes, ingRes] = await Promise.all([
        axios.get(`http://localhost:3000/api/suppliers/${supplier.id}/prices`),
        axios.get("http://localhost:3000/api/ingredients?take=500"), // fetch all ingredients
      ]);
      setPrices(pricesRes.data);
      setIngredients(ingRes.data);
    } catch (error) {
      console.error("Failed to load pricing or ingredients data", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [supplier.id]);

  // Restrict package units dynamically based on selected ingredient base unit
  useEffect(() => {
    if (selectedIngredient) {
      if (selectedIngredient.unit === "g") {
        setPackageUnit("kg");
      } else if (selectedIngredient.unit === "ml") {
        setPackageUnit("L");
      } else {
        setPackageUnit(i18n.t("erp_68"));
      }
    }
  }, [selectedIngredientId]);

  // Helper unit multiplier
  const getUnitMultiplier = (pUnit: string, bUnit: string): number => {
    const { t } = useTranslation();
    const pu = pUnit.trim().toLowerCase();
    const bu = bUnit.trim().toLowerCase();
    if (bu === "g") {
      if (pu === "kg" || pu === t("erp_76")) return 1000;
      if (pu === "g" || pu === t("erp_77")) return 1;
      if (pu === t("erp_78") || pu === t("erp_79")) return 600;
    }
    if (bu === "ml") {
      if (pu === "l" || pu === t("erp_80")) return 1000;
      if (pu === "ml" || pu === t("erp_81")) return 1;
    }
    return 1;
  };

  // Live Unit Cost Calculator
  const calculateLiveUnitPrice = (): string | null => {
    const sizeVal = parseFloat(packageSize);
    const priceVal = parseFloat(price);
    if (
      selectedIngredient &&
      !isNaN(sizeVal) &&
      !isNaN(priceVal) &&
      sizeVal > 0 &&
      priceVal >= 0
    ) {
      const multiplier = getUnitMultiplier(
        packageUnit,
        selectedIngredient.unit,
      );
      const baseQty = sizeVal * multiplier;
      const uPrice = priceVal / baseQty;
      return `NT$ ${uPrice.toFixed(4)} / ${selectedIngredient.unit}`;
    }
    return null;
  };
  const handleSubmitPrice = async (e: React.FormEvent) => {
    const { t } = useTranslation();
    e.preventDefault();
    if (!selectedIngredientId || !packageSize || !packageUnit || !price) {
      alert(t("erp_267"));
      return;
    }
    try {
      setSubmitLoading(true);
      await axios.post("http://localhost:3000/api/suppliers/price", {
        id: editingPriceId || undefined,
        ingredientId: selectedIngredientId,
        supplierId: supplier.id,
        packageSize: Number(packageSize),
        packageUnit,
        price: Number(price),
      });

      // Refresh pricing list
      const pricesRes = await axios.get(
        `http://localhost:3000/api/suppliers/${supplier.id}/prices`,
      );
      setPrices(pricesRes.data);

      // Reset form fields
      setEditingPriceId(null);
      setSelectedIngredientId("");
      setIngSearch("");
      setPackageSize("");
      setPrice("");
    } catch (error) {
      console.error("Failed to save supplier price quote", error);
      alert(editingPriceId ? t("erp_268") : t("erp_89"));
    } finally {
      setSubmitLoading(false);
    }
  };
  const handleEditPrice = (p: SupplierPrice) => {
    setEditingPriceId(p.id);
    setSelectedIngredientId(p.ingredient.id);
    setIngSearch(p.ingredient.name);
    setPackageSize(p.packageSize.toString());
    setPackageUnit(p.packageUnit);
    setPrice(p.price.toString());
  };
  const handleCancelEdit = () => {
    setEditingPriceId(null);
    setSelectedIngredientId("");
    setIngSearch("");
    setPackageSize("");
    setPrice("");
  };
  const handleSetDefault = async (priceId: string) => {
    const { t } = useTranslation();
    try {
      setLoading(true);
      await axios.patch(
        `http://localhost:3000/api/suppliers/prices/${priceId}/default`,
      );
      // Refresh pricing list
      const pricesRes = await axios.get(
        `http://localhost:3000/api/suppliers/${supplier.id}/prices`,
      );
      setPrices(pricesRes.data);
    } catch (error) {
      console.error("Failed to set default price quote", error);
      alert(t("erp_92"));
    } finally {
      setLoading(false);
    }
  };
  const handleDeletePrice = async (priceId: string) => {
    const { t } = useTranslation();
    try {
      setLoading(true);
      await axios.delete(
        `http://localhost:3000/api/suppliers/prices/${priceId}`,
      );
      setPrices((prev) => prev.filter((p) => p.id !== priceId));
      if (editingPriceId === priceId) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error("Failed to delete price quote", error);
      alert(t("erp_91"));
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsDropdownOpen(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-gray-800">
              {t("erp_269")}
              {supplier.name}
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              {t("erp_270")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
          {/* New Price Form Card */}
          <form
            onSubmit={handleSubmitPrice}
            className="bg-muted/30 border border-border rounded-2xl p-5 space-y-4 shrink-0"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                {editingPriceId ? t("erp_271") : t("erp_272")}
              </h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className="space-y-1 md:col-span-2 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="text-[10px] font-bold text-gray-600">
                  {t("erp_273")}
                </label>

                {!selectedIngredient ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t("erp_274")}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs"
                      value={ingSearch}
                      onChange={(e) => {
                        setIngSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                    />

                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-2xl shadow-xl max-h-52 overflow-y-auto z-50 divide-y divide-border">
                        {ingredients
                          .filter(
                            (ing) =>
                              ing.name
                                .toLowerCase()
                                .includes(ingSearch.toLowerCase()) ||
                              (ing.category &&
                                ing.category
                                  .toLowerCase()
                                  .includes(ingSearch.toLowerCase())),
                          )
                          .slice(0, 8)
                          .map((ing) => (
                            <div
                              key={ing.id}
                              onClick={() => {
                                setSelectedIngredientId(ing.id);
                                setIsDropdownOpen(false);
                              }}
                              className="px-3.5 py-2.5 hover:bg-primary/5 cursor-pointer flex justify-between items-center transition-colors group"
                            >
                              <div>
                                <p className="text-xs font-bold text-gray-800 group-hover:text-primary transition-colors">
                                  {ing.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                  {ing.category || i18n.t("erp_242")}
                                  {t("erp_275")}
                                  {ing.unit}
                                </p>
                              </div>
                              <span className="text-[9px] bg-muted group-hover:bg-primary/10 group-hover:text-primary text-gray-500 font-bold px-2 py-0.5 rounded transition-all">
                                {t("erp_276")}
                              </span>
                            </div>
                          ))}
                        {ingredients.filter(
                          (ing) =>
                            ing.name
                              .toLowerCase()
                              .includes(ingSearch.toLowerCase()) ||
                            (ing.category &&
                              ing.category
                                .toLowerCase()
                                .includes(ingSearch.toLowerCase())),
                        ).length === 0 && (
                          <div className="px-3.5 py-4 text-center text-xs font-bold text-gray-400">
                            {t("erp_277")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl animate-in zoom-in-95 duration-150">
                    <div>
                      <p className="text-xs font-black text-emerald-800">
                        {selectedIngredient.name}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        {selectedIngredient.category || t("erp_242")}
                        {t("erp_278")}
                        {selectedIngredient.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIngredientId("");
                        setIngSearch("");
                      }}
                      className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/50 rounded-full transition-all active:scale-90"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600">
                  {t("erp_279")}
                </label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-xs text-right"
                  placeholder={t("erp_116")}
                  value={packageSize}
                  onChange={(e) => setPackageSize(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600">
                  {t("erp_280")}
                </label>
                <select
                  className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs"
                  value={packageUnit}
                  onChange={(e) => setPackageUnit(e.target.value)}
                  required
                >
                  {selectedIngredient ? (
                    selectedIngredient.unit === "g" ? (
                      <>
                        <option value="kg">{t("erp_118")}</option>
                        <option value="g">{t("erp_111")}</option>
                        <option value={t("erp_78")}>{t("erp_119")}</option>
                      </>
                    ) : selectedIngredient.unit === "ml" ? (
                      <>
                        <option value="L">{t("erp_120")}</option>
                        <option value="ml">{t("erp_112")}</option>
                      </>
                    ) : (
                      <option value={t("erp_68")}>{t("erp_121")}</option>
                    )
                  ) : (
                    <>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value={t("erp_68")}>{t("erp_68")}</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-gray-600">
                  {t("erp_281")}
                </label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-xs text-right"
                  placeholder={t("erp_123")}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2 flex items-end gap-2">
                {editingPriceId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all font-bold text-xs shadow-sm active:scale-95"
                  >
                    {t("erp_282")}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitLoading || !selectedIngredientId}
                  className="flex-1 py-2 bg-primary text-white hover:opacity-90 rounded-xl transition-all font-bold text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                >
                  {editingPriceId ? (
                    <Save className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {editingPriceId ? t("erp_266") : t("erp_173")}
                </button>
              </div>
            </div>

            {calculateLiveUnitPrice() && (
              <div className="py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <Scale className="w-3 h-3 text-emerald-500" />
                  {t("erp_283")}
                </span>
                <span className="text-xs font-black text-emerald-700 font-mono">
                  {calculateLiveUnitPrice()}
                </span>
              </div>
            )}
          </form>

          {/* Pricing list section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-1.5 mb-3 shrink-0">
              <ListOrdered className="w-4 h-4 text-gray-400" />
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                {t("erp_284")}
              </h4>
            </div>

            <div className="flex-1 border border-border rounded-2xl overflow-hidden bg-white flex flex-col min-h-0">
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-xs font-medium">{t("erp_285")}</span>
                  </div>
                ) : prices.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2.5">
                    <PackageOpen className="w-10 h-10 text-gray-300 opacity-60" />
                    <p className="text-xs font-bold text-gray-400">
                      {t("erp_286")}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border sticky top-0 z-10">
                        <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground">
                          {t("erp_100")}
                        </th>
                        <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground">
                          {t("erp_104")}
                        </th>
                        <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground text-right">
                          {t("erp_165")}
                        </th>
                        <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground text-right">
                          {t("erp_287")}
                        </th>
                        <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground text-right">
                          {t("erp_288")}
                        </th>
                        <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">
                          {t("erp_289")}
                        </th>
                        <th className="px-4 py-3 font-bold text-[10px] uppercase text-muted-foreground text-center">
                          {t("erp_168")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {prices.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-muted/20 transition-colors text-xs"
                        >
                          <td className="px-4 py-3.5 font-bold text-gray-800">
                            {p.ingredient?.name}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground font-semibold">
                            <span className="px-2 py-0.5 bg-muted rounded text-[10px]">
                              {p.ingredient?.category || i18n.t("erp_242")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-700">
                            {p.packageSize} {p.packageUnit}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-extrabold text-primary">
                            NT$ {p.price}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-600">
                            NT$ {p.unitPrice?.toFixed(4)} / {p.ingredient?.unit}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {p.isDefault ? (
                              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold rounded-full border border-emerald-100 flex items-center gap-0.5 justify-center w-fit mx-auto shadow-sm">
                                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                {t("erp_290")}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(p.id)}
                                className="px-2.5 py-0.5 bg-gray-50 hover:bg-primary/10 hover:text-primary hover:border-primary/20 text-gray-500 text-[10px] font-bold rounded-full border border-gray-200 transition-all active:scale-95 shrink-0"
                              >
                                {t("erp_291")}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditPrice(p)}
                                className="p-1.5 hover:text-primary text-muted-foreground hover:bg-primary/5 rounded-lg transition-all active:scale-90"
                                title={i18n.t("erp_292")}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePrice(p.id)}
                                className="p-1.5 hover:text-destructive text-muted-foreground hover:bg-destructive/5 rounded-lg transition-all active:scale-90"
                                title={i18n.t("erp_293")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/20 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded-xl font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            {t("erp_221")}
          </button>
        </div>
      </div>
    </div>
  );
};
