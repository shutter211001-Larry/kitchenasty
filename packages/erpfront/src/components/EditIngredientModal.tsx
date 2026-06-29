import i18n from "../i18n";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Save,
  AlertTriangle,
  Scale,
  Plus,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "../lib/utils";
import { AllergenManagerModal } from "./AllergenManagerModal";
import { useTranslation } from "react-i18next";
interface UnitConversion {
  id: string;
  fromUnit: string;
  toUnit: string;
  multiplier: number;
}
interface Allergen {
  id: string;
  name: string;
}
interface Supplier {
  id: string;
  name: string;
}
interface Ingredient {
  id?: string;
  name: string;
  category?: string;
  unit: string;
  currentStock: number;
  safetyStock?: number | null;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbohydrates?: number | null;
  sodium?: number | null;
  saturatedFat?: number | null;
  transFat?: number | null;
  sugar?: number | null;
  isAllergen?: boolean;
  allergenType?: string | null;
  unitConversions?: UnitConversion[];
  allergens?: Allergen[];
  prices?: any[];
  components?: string | null;
}
interface Props {
  ingredient: Ingredient | "new";
  onClose: () => void;
  onSuccess: () => void;
}
const EditIngredientModal = ({ ingredient, onClose, onSuccess }: Props) => {
  const { t } = useTranslation();
  const isCreate = ingredient === "new";
  const [activeTab, setActiveTab] = useState<
    "basic" | "nutrition" | "conversions" | "prices"
  >("basic");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [isAllergenMgrOpen, setIsAllergenMgrOpen] = useState(false);

  // Master lists
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allAllergens, setAllAllergens] = useState<Allergen[]>([]);

  // Form State
  const [formData, setFormData] = useState<Ingredient>({
    name: "",
    category: t("erp_75"),
    unit: "g",
    currentStock: 0,
    safetyStock: null,
    calories: null,
    protein: null,
    fat: null,
    carbohydrates: null,
    sodium: null,
    saturatedFat: null,
    transFat: null,
    sugar: null,
    isAllergen: false,
    allergenType: "",
    unitConversions: [],
    components: "",
  });

  // Purchase Package Price State
  const [priceInfo, setPriceInfo] = useState({
    packageSize: "",
    packageUnit: "kg",
    price: "",
    supplierId: "",
  });

  // Selected Allergen IDs
  const [allergenIds, setAllergenIds] = useState<string[]>([]);

  // Conversion Row State
  const [newFromUnit, setNewFromUnit] = useState("");
  const [newMultiplier, setNewMultiplier] = useState<number | "">("");
  const loadSuppliersAndAllergens = async () => {
    try {
      const [suppRes, allerRes] = await Promise.all([
        axios.get("http://localhost:3000/api/suppliers"),
        axios.get("http://localhost:3000/api/allergens"),
      ]);
      setSuppliers(suppRes.data);
      setAllAllergens(allerRes.data);
    } catch (error) {
      console.error("Failed to load suppliers or allergens", error);
    }
  };
  const fetchIngredientDetails = async () => {
    if (isCreate || !ingredient.id) return;
    try {
      setFetchLoading(true);
      const response = await axios.get(
        `http://localhost:3000/api/ingredients/${ingredient.id}`,
      );
      const data = response.data;
      setFormData({
        ...data,
        category: data.category || "",
        allergenType: data.allergenType || "",
        unitConversions: data.unitConversions || [],
      });

      // Load allergen tags relations
      if (data.allergens) {
        setAllergenIds(data.allergens.map((a: Allergen) => a.id));
      }

      // Load package pricing (ensure prices array is stored in formData)
      setFormData((prev) => ({
        ...prev,
        prices: data.prices || [],
      }));
      if (data.prices && data.prices.length > 0) {
        const defaultPrice =
          data.prices.find((p: any) => p.isDefault) || data.prices[0];
        setPriceInfo({
          packageSize: String(defaultPrice.packageSize),
          packageUnit: defaultPrice.packageUnit,
          price: String(defaultPrice.price),
          supplierId: defaultPrice.supplierId || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch full ingredient details", error);
    } finally {
      setFetchLoading(false);
    }
  };

  // Helper unit multiplier
  const getUnitMultiplier = (packageUnit: string, baseUnit: string): number => {
    const { t } = useTranslation();
    const pu = packageUnit.trim().toLowerCase();
    const bu = baseUnit.trim().toLowerCase();
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

  // Live Unit Cost calculator
  const calculateLiveUnitPrice = (): string | null => {
    const size = parseFloat(priceInfo.packageSize);
    const pVal = parseFloat(priceInfo.price);
    if (!isNaN(size) && !isNaN(pVal) && size > 0 && pVal > 0) {
      const multiplier = getUnitMultiplier(
        priceInfo.packageUnit,
        formData.unit,
      );
      const baseQty = size * multiplier;
      const unitPrice = pVal / baseQty;
      return `NT$ ${unitPrice.toFixed(4)} / ${formData.unit}`;
    }
    return null;
  };
  useEffect(() => {
    loadSuppliersAndAllergens();
  }, []);
  useEffect(() => {
    if (isCreate) {
      setFormData({
        name: "",
        category: i18n.t("erp_75"),
        unit: "g",
        currentStock: 0,
        safetyStock: null,
        calories: null,
        protein: null,
        fat: null,
        carbohydrates: null,
        sodium: null,
        saturatedFat: null,
        transFat: null,
        sugar: null,
        isAllergen: false,
        allergenType: "",
        unitConversions: [],
        components: "",
      });
      setPriceInfo({
        packageSize: "",
        packageUnit: "kg",
        price: "",
        supplierId: "",
      });
      setAllergenIds([]);
    } else {
      setFormData({
        ...ingredient,
        category: ingredient.category || "",
        allergenType: ingredient.allergenType || "",
        unitConversions: ingredient.unitConversions || [],
      });
      fetchIngredientDetails();
    }
  }, [ingredient]);

  // Handle unit updates and sync pricing package options
  const handleUnitChange = (newUnit: string) => {
    setFormData((prev) => ({
      ...prev,
      unit: newUnit,
    }));
    // Update default package units depending on the base unit
    if (newUnit === "g") {
      setPriceInfo((prev) => ({
        ...prev,
        packageUnit: "kg",
      }));
    } else if (newUnit === "ml") {
      setPriceInfo((prev) => ({
        ...prev,
        packageUnit: "L",
      }));
    } else {
      setPriceInfo((prev) => ({
        ...prev,
        packageUnit: i18n.t("erp_68"),
      }));
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: any = {
        name: formData.name,
        category: formData.category || null,
        unit: formData.unit,
        currentStock: Number(formData.currentStock) || 0,
        safetyStock:
          formData.safetyStock !== null && (formData.safetyStock as any) !== ""
            ? Number(formData.safetyStock)
            : null,
        calories: formData.calories != null ? Number(formData.calories) : null,
        protein: formData.protein != null ? Number(formData.protein) : null,
        fat: formData.fat != null ? Number(formData.fat) : null,
        carbohydrates:
          formData.carbohydrates != null
            ? Number(formData.carbohydrates)
            : null,
        sodium: formData.sodium != null ? Number(formData.sodium) : null,
        saturatedFat:
          formData.saturatedFat != null ? Number(formData.saturatedFat) : null,
        transFat: formData.transFat != null ? Number(formData.transFat) : null,
        sugar: formData.sugar != null ? Number(formData.sugar) : null,
        isAllergen: formData.isAllergen || false,
        allergenType: formData.isAllergen
          ? formData.allergenType || null
          : null,
        allergenIds: formData.isAllergen ? allergenIds : [],
        components: formData.components || null,
        priceInfo:
          priceInfo.packageSize && priceInfo.price
            ? {
                packageSize: Number(priceInfo.packageSize),
                packageUnit: priceInfo.packageUnit,
                price: Number(priceInfo.price),
                supplierId: priceInfo.supplierId || null,
              }
            : null,
      };
      if (isCreate) {
        await axios.post("http://localhost:3000/api/ingredients", payload);
      } else {
        await axios.patch(
          `http://localhost:3000/api/ingredients/${(ingredient as Ingredient).id}`,
          payload,
        );
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to save ingredient", error);
      const errMsg =
        error.response?.data?.details ||
        error.response?.data?.error ||
        error.message;
      alert(`儲存失敗: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async () => {
    const { t } = useTranslation();
    if (ingredient === "new" || !ingredient?.id) return;
    if (
      !window.confirm(
        `確定要刪除食材「${ingredient.name}」嗎？\n\n注意：此操作無法復原，且會一併刪除該食材的所有報價合約。`,
      )
    )
      return;
    try {
      setLoading(true);
      await axios.delete(
        `http://localhost:3000/api/ingredients/${ingredient.id}`,
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to delete ingredient", error);
      alert(error.response?.data?.error || t("erp_82"));
    } finally {
      setLoading(false);
    }
  };
  const handleAddConversion = async () => {
    const { t } = useTranslation();
    if (!newFromUnit || newMultiplier === "" || Number(newMultiplier) <= 0) {
      alert(t("erp_83"));
      return;
    }
    if (isCreate || !ingredient.id) return;
    const exists = (formData.unitConversions || []).some(
      (c: any) =>
        c.fromUnit.trim().toLowerCase() === newFromUnit.trim().toLowerCase(),
    );
    if (exists) {
      alert(t("erp_84"));
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post(
        `http://localhost:3000/api/ingredients/${ingredient.id}/conversions`,
        {
          fromUnit: newFromUnit,
          toUnit: formData.unit,
          multiplier: Number(newMultiplier),
        },
      );
      setFormData((prev) => ({
        ...prev,
        unitConversions: [...(prev.unitConversions || []), response.data],
      }));
      setNewFromUnit("");
      setNewMultiplier("");
    } catch (error) {
      console.error("Failed to add conversion", error);
      alert(t("erp_85"));
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteConversion = async (convId: string) => {
    const { t } = useTranslation();
    if (isCreate || !ingredient.id) return;
    if (!confirm(t("erp_86"))) return;
    try {
      setLoading(true);
      await axios.delete(
        `http://localhost:3000/api/ingredients/${ingredient.id}/conversions/${convId}`,
      );
      setFormData((prev) => ({
        ...prev,
        unitConversions: (prev.unitConversions || []).filter(
          (c) => c.id !== convId,
        ),
      }));
    } catch (error) {
      console.error("Failed to delete conversion", error);
      alert(t("erp_87"));
    } finally {
      setLoading(false);
    }
  };
  const handleAddQuote = async () => {
    const { t } = useTranslation();
    if (isCreate || !ingredient.id) return;
    if (!priceInfo.packageSize || !priceInfo.packageUnit || !priceInfo.price) {
      alert(t("erp_88"));
      return;
    }
    try {
      setLoading(true);
      await axios.post("http://localhost:3000/api/suppliers/price", {
        ingredientId: ingredient.id,
        supplierId: priceInfo.supplierId || null,
        packageSize: Number(priceInfo.packageSize),
        packageUnit: priceInfo.packageUnit,
        price: Number(priceInfo.price),
      });
      await fetchIngredientDetails();
      // Reset form
      setPriceInfo((prev) => ({
        ...prev,
        packageSize: "",
        price: "",
      }));
    } catch (error: any) {
      console.error("Failed to add quote", error);
      alert(error.response?.data?.error || t("erp_89"));
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteQuote = async (priceId: string) => {
    const { t } = useTranslation();
    if (!confirm(t("erp_90"))) return;
    try {
      setLoading(true);
      await axios.delete(
        `http://localhost:3000/api/suppliers/prices/${priceId}`,
      );
      await fetchIngredientDetails();
    } catch (error: any) {
      console.error("Failed to delete quote", error);
      alert(error.response?.data?.error || t("erp_91"));
    } finally {
      setLoading(false);
    }
  };
  const handleSetDefaultQuote = async (priceId: string) => {
    const { t } = useTranslation();
    try {
      setLoading(true);
      await axios.patch(
        `http://localhost:3000/api/suppliers/prices/${priceId}/default`,
      );
      await fetchIngredientDetails();
    } catch (error: any) {
      console.error("Failed to set default quote", error);
      alert(error.response?.data?.error || t("erp_92"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-gray-800">
              {isCreate ? t("erp_93") : `編輯 - ${formData.name}`}
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              {isCreate ? t("erp_94") : t("erp_95")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-border bg-muted/5">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={cn(
              "flex-1 py-3 text-xs font-bold border-b-2 transition-all",
              activeTab === "basic"
                ? "border-primary text-primary bg-white"
                : "border-transparent text-muted-foreground hover:text-gray-800",
            )}
          >
            {t("erp_96")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("nutrition")}
            className={cn(
              "flex-1 py-3 text-xs font-bold border-b-2 transition-all",
              activeTab === "nutrition"
                ? "border-primary text-primary bg-white"
                : "border-transparent text-muted-foreground hover:text-gray-800",
            )}
          >
            {t("erp_97")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("conversions")}
            className={cn(
              "flex-1 py-3 text-xs font-bold border-b-2 transition-all",
              activeTab === "conversions"
                ? "border-primary text-primary bg-white"
                : "border-transparent text-muted-foreground hover:text-gray-800",
            )}
          >
            {t("erp_98")}
          </button>
          {!isCreate && (
            <button
              type="button"
              onClick={() => setActiveTab("prices")}
              className={cn(
                "flex-1 py-3 text-xs font-bold border-b-2 transition-all",
                activeTab === "prices"
                  ? "border-primary text-primary bg-white"
                  : "border-transparent text-muted-foreground hover:text-gray-800",
              )}
            >
              {t("erp_99")}
            </button>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col"
        >
          {fetchLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground font-medium">
                {t("erp_10")}
              </span>
            </div>
          ) : (
            <div className="flex-1 space-y-4">
              {/* Tab 1: Basic Information & Stock */}
              {activeTab === "basic" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_100")}
                        <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            name: e.target.value,
                          })
                        }
                        required
                        placeholder={t("erp_101")}
                      />
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_102")}
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        value={formData.components || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            components: e.target.value,
                          })
                        }
                        placeholder={t("erp_103")}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_104")}
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            category: e.target.value,
                          })
                        }
                      >
                        <option value={t("erp_75")}>{t("erp_75")}</option>
                        <option value={t("erp_105")}>{t("erp_105")}</option>
                        <option value={t("erp_106")}>{t("erp_106")}</option>
                        <option value={t("erp_107")}>{t("erp_107")}</option>
                        <option value={t("erp_108")}>{t("erp_108")}</option>
                        <option value={t("erp_109")}>{t("erp_109")}</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_110")}
                        <span className="text-destructive">*</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        value={formData.unit}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        required
                      >
                        <option value="g">{t("erp_111")}</option>
                        <option value="ml">{t("erp_112")}</option>
                        <option value={t("erp_68")}>{t("erp_113")}</option>
                      </select>
                    </div>
                  </div>

                  {/* Pricing packaging section (Only shown during creation) */}
                  {isCreate && (
                    <div className="border-t border-border/60 my-2 pt-4 space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                        {t("erp_114")}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 border border-border rounded-2xl">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-700">
                            {t("erp_115")}
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder={t("erp_116")}
                            className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-sm text-right"
                            value={priceInfo.packageSize}
                            onChange={(e) =>
                              setPriceInfo({
                                ...priceInfo,
                                packageSize: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-700">
                            {t("erp_117")}
                          </label>
                          <select
                            className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                            value={priceInfo.packageUnit}
                            onChange={(e) =>
                              setPriceInfo({
                                ...priceInfo,
                                packageUnit: e.target.value,
                              })
                            }
                          >
                            {formData.unit === "g" ? (
                              <>
                                <option value="kg">{t("erp_118")}</option>
                                <option value="g">{t("erp_111")}</option>
                                <option value={t("erp_78")}>
                                  {t("erp_119")}
                                </option>
                              </>
                            ) : formData.unit === "ml" ? (
                              <>
                                <option value="L">{t("erp_120")}</option>
                                <option value="ml">{t("erp_112")}</option>
                              </>
                            ) : (
                              <option value={t("erp_68")}>
                                {t("erp_121")}
                              </option>
                            )}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-700">
                            {t("erp_122")}
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder={t("erp_123")}
                            className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-sm text-right"
                            value={priceInfo.price}
                            onChange={(e) =>
                              setPriceInfo({
                                ...priceInfo,
                                price: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-700">
                            {t("erp_124")}
                          </label>
                          <select
                            className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                            value={priceInfo.supplierId}
                            onChange={(e) =>
                              setPriceInfo({
                                ...priceInfo,
                                supplierId: e.target.value,
                              })
                            }
                          >
                            <option value="">{t("erp_125")}</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {calculateLiveUnitPrice() && (
                          <div className="col-span-2 mt-1 py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
                            <span className="text-[10px] text-emerald-600 font-bold">
                              {t("erp_126")}
                            </span>
                            <span className="text-xs font-black text-emerald-700 font-mono">
                              {calculateLiveUnitPrice()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border/60 my-2 pt-4 space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                      {t("erp_127")}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">
                          {t("erp_128")}
                          {formData.unit})
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-sm text-right"
                          value={formData.currentStock}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              currentStock: parseFloat(e.target.value) || 0,
                            })
                          }
                          required
                          disabled={!isCreate}
                        />
                        {!isCreate && (
                          <p className="text-[10px] text-muted-foreground">
                            {t("erp_129")}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">
                          {t("erp_130")}
                          {formData.unit})
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-sm text-right"
                          value={
                            formData.safetyStock !== null &&
                            formData.safetyStock !== undefined
                              ? formData.safetyStock
                              : ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData({
                              ...formData,
                              safetyStock:
                                val === "" ? null : parseFloat(val) || 0,
                            });
                          }}
                          placeholder={t("erp_131")}
                        />
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                          {t("erp_132")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Nutrition Information */}
              {activeTab === "nutrition" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 flex gap-2.5">
                    <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[11px] text-amber-800 leading-normal font-extrabold uppercase">
                        {t("erp_133")}
                      </p>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        {t("erp_134")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_135")}
                        <span className="text-destructive font-black">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t("erp_136")}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.calories ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            calories:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_137")}
                        <span className="text-destructive font-black">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t("erp_136")}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.sodium ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sodium:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_138")}
                        <span className="text-destructive font-black">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t("erp_136")}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.protein ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            protein:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_139")}
                        <span className="text-destructive font-black">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t("erp_136")}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.carbohydrates ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            carbohydrates:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_140")}
                        <span className="text-destructive font-black">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t("erp_136")}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.fat ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fat:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_141")}
                        <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t("erp_142")}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-mono text-sm text-right"
                        value={formData.saturatedFat ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            saturatedFat:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_143")}
                        <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t("erp_144")}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-mono text-sm text-right"
                        value={formData.transFat ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            transFat:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        {t("erp_145")}
                        <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t("erp_146")}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-mono text-sm text-right"
                        value={formData.sugar ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sugar:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Multi-select Allergens with Pills */}
                  <div className="border-t border-border/60 my-2 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isAllergen"
                          className="w-4 h-4 text-rose-500 bg-muted rounded border-border focus:ring-rose-500/20"
                          checked={formData.isAllergen || false}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isAllergen: e.target.checked,
                            })
                          }
                        />
                        <label
                          htmlFor="isAllergen"
                          className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                        >
                          {t("erp_147")}
                        </label>
                      </div>

                      {formData.isAllergen && (
                        <button
                          type="button"
                          onClick={() => setIsAllergenMgrOpen(true)}
                          className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-all"
                        >
                          {t("erp_148")}
                        </button>
                      )}
                    </div>

                    {formData.isAllergen && (
                      <div className="space-y-2 animate-in slide-in-from-top-1 duration-150">
                        <label className="text-[10px] font-bold text-gray-500 block">
                          {t("erp_149")}
                        </label>
                        {allAllergens.length === 0 ? (
                          <div className="text-[10px] text-muted-foreground italic py-4 text-center border border-dashed border-border rounded-xl">
                            {t("erp_150")}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 p-3 bg-muted/20 border border-border rounded-2xl">
                            {allAllergens.map((tag) => {
                              const selected = allergenIds.includes(tag.id);
                              return (
                                <button
                                  type="button"
                                  key={tag.id}
                                  onClick={() => {
                                    if (selected) {
                                      setAllergenIds((prev) =>
                                        prev.filter((id) => id !== tag.id),
                                      );
                                    } else {
                                      setAllergenIds((prev) => [
                                        ...prev,
                                        tag.id,
                                      ]);
                                    }
                                  }}
                                  className={cn(
                                    "px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-150 active:scale-95",
                                    selected
                                      ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                                      : "bg-white text-gray-600 border-border hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200",
                                  )}
                                >
                                  {tag.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Unit Conversions */}
              {activeTab === "conversions" && (
                <div className="space-y-4">
                  {isCreate ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-muted-foreground border border-dashed border-border rounded-2xl p-6 bg-muted/5">
                      <ShieldAlert className="w-10 h-10 mb-2.5 text-gray-400" />
                      <p className="text-xs font-bold text-gray-600">
                        {t("erp_151")}
                      </p>
                      <p className="text-[10px] mt-1">{t("erp_152")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex gap-2.5">
                        <Scale className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[11px] text-primary/80 leading-normal font-medium">
                          {t("erp_153")}
                          {formData.unit}
                          {t("erp_154")}
                          <strong>{formData.unit}</strong>
                          {t("erp_155")}
                        </p>
                      </div>

                      {/* Add new conversion row */}
                      <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-gray-700">
                          {t("erp_156")}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center bg-white border border-border rounded-xl px-3 py-1.5 gap-2 shadow-sm">
                            <span className="text-xs text-muted-foreground font-bold shrink-0">
                              1
                            </span>
                            <input
                              type="text"
                              placeholder={t("erp_157")}
                              className="w-full bg-transparent text-xs font-bold outline-none text-gray-800"
                              value={newFromUnit}
                              onChange={(e) => setNewFromUnit(e.target.value)}
                            />
                          </div>
                          <span className="text-xs font-black text-gray-400">
                            =
                          </span>
                          <div className="w-24 flex items-center bg-white border border-border rounded-xl px-3 py-1.5 gap-1 shadow-sm font-mono">
                            <input
                              type="number"
                              placeholder={t("erp_30")}
                              className="w-full bg-transparent text-xs font-bold outline-none text-right"
                              value={newMultiplier}
                              onChange={(e) =>
                                setNewMultiplier(
                                  e.target.value === ""
                                    ? ""
                                    : parseFloat(e.target.value),
                                )
                              }
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-600 bg-muted px-3 py-2 rounded-xl border border-border shrink-0 min-w-10 text-center">
                            {formData.unit}
                          </span>
                          <button
                            type="button"
                            onClick={handleAddConversion}
                            className="p-2.5 bg-primary text-white hover:opacity-90 rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Conversions List */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                          {t("erp_158")}
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(formData.unitConversions || []).length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic text-center py-6 border border-dashed border-border rounded-xl">
                              {t("erp_159")}
                              {formData.unit}
                              {t("erp_160")}
                            </p>
                          ) : (
                            (formData.unitConversions || []).map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center justify-between bg-white border border-border p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-0.5 bg-primary/10 rounded text-primary text-[10px] font-bold">
                                    {t("erp_161")}
                                  </div>
                                  <span className="text-xs font-bold text-gray-800">
                                    1 {c.fromUnit} ={" "}
                                    <span className="font-mono text-emerald-600">
                                      {c.multiplier}
                                    </span>{" "}
                                    {c.toUnit}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteConversion(c.id)}
                                  className="p-1 hover:text-destructive text-muted-foreground hover:bg-destructive/5 rounded transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Supplier Prices */}
              {activeTab === "prices" && !isCreate && (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex gap-2.5">
                    <Scale className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-primary/80 leading-normal font-medium">
                      {t("erp_162")}
                    </p>
                  </div>

                  {/* Existing Quotes */}
                  <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border">
                          <th className="px-4 py-3 font-bold text-[10px] text-muted-foreground uppercase">
                            {t("erp_163")}
                          </th>
                          <th className="px-4 py-3 font-bold text-[10px] text-muted-foreground uppercase">
                            {t("erp_164")}
                          </th>
                          <th className="px-4 py-3 font-bold text-[10px] text-muted-foreground uppercase text-right">
                            {t("erp_165")}
                          </th>
                          <th className="px-4 py-3 font-bold text-[10px] text-muted-foreground uppercase text-right">
                            {t("erp_166")}
                          </th>
                          <th className="px-4 py-3 font-bold text-[10px] text-muted-foreground uppercase text-right">
                            {t("erp_167")}
                          </th>
                          <th className="px-4 py-3 font-bold text-[10px] text-muted-foreground uppercase text-center">
                            {t("erp_168")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {formData.prices?.map((p: any) => (
                          <tr
                            key={p.id}
                            className="hover:bg-muted/10 transition-colors"
                          >
                            <td className="px-4 py-3 text-center">
                              {p.isDefault ? (
                                <span className="text-emerald-500 font-bold text-lg">
                                  ★
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultQuote(p.id)}
                                  className="text-gray-300 hover:text-emerald-500 transition-colors font-bold text-lg"
                                  title={i18n.t("erp_169")}
                                >
                                  ☆
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-gray-800">
                              {p.supplier?.name || i18n.t("erp_170")}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono font-bold text-gray-600 text-right">
                              {p.packageSize}{" "}
                              <span className="text-[10px] text-gray-400">
                                {p.packageUnit}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono font-bold text-gray-800 text-right">
                              {p.price.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-[10px] font-mono text-emerald-600 text-right">
                              {p.unitPrice.toFixed(4)} / {formData.unit}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteQuote(p.id)}
                                className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title={i18n.t("erp_171")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(!formData.prices || formData.prices.length === 0) && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-xs text-muted-foreground font-medium italic"
                            >
                              {t("erp_172")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add New Quote Form */}
                  <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-gray-700">
                      {t("erp_173")}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-gray-500">
                          {t("erp_174")}
                        </label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                          value={priceInfo.supplierId}
                          onChange={(e) =>
                            setPriceInfo({
                              ...priceInfo,
                              supplierId: e.target.value,
                            })
                          }
                        >
                          <option value="">{t("erp_175")}</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500">
                          {t("erp_176")}
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder={t("erp_177")}
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-mono text-xs text-right"
                          value={priceInfo.packageSize}
                          onChange={(e) =>
                            setPriceInfo({
                              ...priceInfo,
                              packageSize: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500">
                          {t("erp_117")}
                        </label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                          value={priceInfo.packageUnit}
                          onChange={(e) =>
                            setPriceInfo({
                              ...priceInfo,
                              packageUnit: e.target.value,
                            })
                          }
                        >
                          {formData.unit === "g" ? (
                            <>
                              <option value="kg">{t("erp_118")}</option>
                              <option value="g">{t("erp_111")}</option>
                              <option value={t("erp_78")}>
                                {t("erp_119")}
                              </option>
                            </>
                          ) : formData.unit === "ml" ? (
                            <>
                              <option value="L">{t("erp_120")}</option>
                              <option value="ml">{t("erp_112")}</option>
                            </>
                          ) : (
                            <option value={t("erp_68")}>{t("erp_121")}</option>
                          )}
                        </select>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-gray-500">
                          {t("erp_122")}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="any"
                            placeholder={t("erp_178")}
                            className="flex-1 px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-mono text-xs text-right"
                            value={priceInfo.price}
                            onChange={(e) =>
                              setPriceInfo({
                                ...priceInfo,
                                price: e.target.value,
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={handleAddQuote}
                            disabled={
                              loading ||
                              !priceInfo.packageSize ||
                              !priceInfo.packageUnit ||
                              !priceInfo.price
                            }
                            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t("erp_8")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sticky Form Footer Buttons inside the scroll viewport (or below) */}
          <div className="flex gap-3 pt-6 mt-auto border-t border-border shrink-0">
            {!isCreate && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || fetchLoading}
                className="flex-none px-5 py-2.5 border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center"
                title={t("erp_179")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl font-bold text-xs text-gray-600 hover:bg-muted transition-colors"
            >
              {t("erp_71")}
            </button>
            <button
              type="submit"
              disabled={loading || fetchLoading}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? t("erp_72") : isCreate ? t("erp_180") : t("erp_181")}
            </button>
          </div>
        </form>
      </div>

      {/* Allergen Manager Modal */}
      <AllergenManagerModal
        isOpen={isAllergenMgrOpen}
        onClose={() => setIsAllergenMgrOpen(false)}
        onRefreshAllergens={loadSuppliersAndAllergens}
      />
    </div>
  );
};
export default EditIngredientModal;
