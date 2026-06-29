import i18n from "../i18n";
import React from "react";
import {
  X,
  Clock,
  Utensils,
  PieChart,
  ChefHat,
  ChevronUp,
  ChevronDown,
  PackageOpen,
  Flame,
} from "lucide-react";
import NutritionRadar from "./NutritionRadar";
import { useTranslation } from "react-i18next";
interface Props {
  recipe: any;
  onClose: () => void;
}
const isPortionUnit = (unit: string) => {
  const { t } = useTranslation();
  if (!unit) return false;
  const portionUnits = [
    t("erp_15"),
    t("erp_68"),
    "pcs",
    "piece",
    t("erp_202"),
    t("erp_203"),
    t("erp_204"),
    t("erp_205"),
  ];
  return portionUnits.some((u) => unit.toLowerCase().includes(u));
};
const RecipeDetailModal = ({ recipe, onClose }: Props) => {
  const { t } = useTranslation();
  const [collapsedSteps, setCollapsedSteps] = React.useState<Set<string>>(
    new Set(),
  );
  if (!recipe) return null;
  const toggleStep = (stepId: string) => {
    const newSet = new Set(collapsedSteps);
    if (newSet.has(stepId)) newSet.delete(stepId);
    else newSet.add(stepId);
    setCollapsedSteps(newSet);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        <header className="p-8 pb-6 border-b border-border bg-muted/20 relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChefHat className="w-6 h-6 text-primary" />
                <h3 className="text-3xl font-black text-gray-800 tracking-tight">
                  {recipe.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {recipe.description || t("erp_206")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-full shadow-sm transition-all"
            >
              <X className="w-8 h-8 text-muted-foreground" />
            </button>
          </div>

          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-border shadow-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">
                {recipe.calories?.toFixed(0) || 0} kcal
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-border shadow-sm">
              <Utensils className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold">
                {t("erp_207")}
                {recipe.cost?.toFixed(1) || 0}
              </span>
            </div>
            {isPortionUnit(recipe.yieldUnit) && recipe.yieldAmount > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 shadow-sm font-bold text-sm">
                <ChefHat className="w-4 h-4 text-emerald-600" />
                <span>
                  {t("erp_208")}
                  {(recipe.cost / recipe.yieldAmount).toFixed(1)}/
                  {recipe.yieldUnit}
                </span>
              </div>
            )}
            {recipe.bakingLossRate > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-100 shadow-sm font-bold text-sm">
                <Flame className="w-4 h-4 text-orange-600 animate-pulse" />
                <span>
                  {t("erp_209")}
                  {recipe.bakingLossRate}%
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 flex gap-8">
          {/* Left Side: SOP */}
          <div className="flex-1 space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <LayoutList className="w-4 h-4" />
              {t("erp_210")}
            </h4>
            <div className="space-y-4">
              {(recipe.steps || []).map((step: any, index: number) => (
                <div
                  key={step.id}
                  className="relative pl-8 pb-6 border-l-2 border-primary/20 last:pb-0"
                >
                  <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                    {index + 1}
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-5 border border-border/50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-3 py-1 bg-white text-primary rounded-lg text-xs font-black uppercase shadow-sm">
                        {step.action}
                      </span>
                      {step.parameters && step.parameters.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {step.parameters.map((p: any, pIdx: number) => (
                            <div
                              key={pIdx}
                              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-white/50 px-2 py-0.5 rounded-full border border-border/50"
                            >
                              <Clock className="w-3 h-3" />
                              {p.value} {p.unit}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-sm text-gray-600 mb-4 font-medium">
                        {step.description}
                      </p>
                    )}

                    {/* Ingredients in this step (Collapsible) */}
                    {step.items && step.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                            {t("erp_211")}
                            {step.items.length})
                          </span>
                          <button
                            onClick={() => toggleStep(step.id)}
                            className="p-1 hover:bg-white rounded text-muted-foreground transition-all"
                          >
                            {collapsedSteps.has(step.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {!collapsedSteps.has(step.id) && (
                          <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                            {step.items.map((item: any) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center bg-white/60 p-2 px-3 rounded-xl border border-border/30 text-xs hover:border-primary/30 transition-all"
                              >
                                <span className="font-bold text-gray-700 flex items-center gap-2">
                                  {item.sourceStepId
                                    ? `步驟 ${recipe.steps.findIndex((s: any) => s.id === item.sourceStepId) + 1} (${item.sourceStep?.action || i18n.t("erp_212")})`
                                    : item.ingredient?.name ||
                                      item.subRecipe?.name ||
                                      i18n.t("erp_213")}
                                </span>
                                <span className="text-muted-foreground font-mono bg-white px-2 py-0.5 rounded shadow-sm border border-border/50">
                                  {item.portionQuantity
                                    ? `${item.portionQuantity} 份`
                                    : `${item.quantity} g`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Nutrition Analysis */}
          <div className="w-80 space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              {t("erp_214")}
            </h4>
            <NutritionRadar data={recipe} title={t("erp_215")} />

            <div className="bg-muted/20 rounded-[2rem] p-6 space-y-4 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-bold">
                  {t("erp_198")}
                </span>
                <span className="font-mono font-black">
                  {recipe.protein?.toFixed(1) || 0} g
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-bold">
                  {t("erp_199")}
                </span>
                <span className="font-mono font-black">
                  {recipe.fat?.toFixed(1) || 0} g
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pl-4 border-l-2 border-border/60">
                <span className="text-muted-foreground text-xs font-semibold">
                  {t("erp_216")}
                </span>
                <span className="font-mono text-xs font-bold">
                  {recipe.saturatedFat?.toFixed(1) || 0} g
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pl-4 border-l-2 border-border/60">
                <span className="text-muted-foreground text-xs font-semibold">
                  {t("erp_217")}
                </span>
                <span className="font-mono text-xs font-bold">
                  {recipe.transFat?.toFixed(1) || 0} g
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-bold">
                  {t("erp_218")}
                </span>
                <span className="font-mono font-black">
                  {recipe.carbohydrates?.toFixed(1) || 0} g
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pl-4 border-l-2 border-border/60">
                <span className="text-muted-foreground text-xs font-semibold">
                  {t("erp_219")}
                </span>
                <span className="font-mono text-xs font-bold">
                  {recipe.sugar?.toFixed(1) || 0} g
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-bold">
                  {t("erp_201")}
                </span>
                <span className="font-mono font-black">
                  {recipe.sodium?.toFixed(0) || 0} mg
                </span>
              </div>
            </div>

            {/* Total Ingredients Card */}
            {recipe.totalIngredients && recipe.totalIngredients.length > 0 && (
              <div className="bg-muted/20 rounded-[2rem] p-6 border border-border mt-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                  <PackageOpen className="w-4 h-4" />
                  {t("erp_220")}
                </h4>
                <div className="space-y-3">
                  {recipe.totalIngredients.map((ing: any) => (
                    <div
                      key={ing.id}
                      className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-bold text-gray-800">
                        {ing.name}
                      </span>
                      <span className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {ing.quantity.toFixed(1)} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="p-8 border-t border-border bg-muted/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-4 bg-gray-800 text-white rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            {t("erp_221")}
          </button>
        </footer>
      </div>
    </div>
  );
};

// Simplified LayoutList for inner use
const LayoutList = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
    <path d="M14 4h7" />
    <path d="M14 9h7" />
    <path d="M14 15h7" />
    <path d="M14 20h7" />
  </svg>
);
export default RecipeDetailModal;
