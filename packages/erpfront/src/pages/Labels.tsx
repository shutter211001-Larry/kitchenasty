import i18n from "../i18n";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Printer,
  Settings2,
  Layers,
  Database,
  RotateCcw,
  Sparkles,
  Flame,
  Award,
  Save,
  ChefHat,
  Utensils,
  ChevronDown,
  ChevronUp,
  Sliders,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n";
interface IngredientItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}
interface Recipe {
  id: string;
  name: string;
  description: string;
  yieldAmount: number;
  yieldUnit: string;
  cost: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  sodium: number;
  saturatedFat: number;
  transFat: number;
  sugar: number;
  totalWeight: number;
  totalIngredients: IngredientItem[];
  isProduct?: boolean;
  bakingLossRate?: number;
}
export const Labels = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [expandedIngredients, setExpandedIngredients] = useState<
    Record<string, boolean>
  >({});
  const { t } = useTranslation();
  const [printLanguage, setPrintLanguage] = useState<string>("en"); // Target dual language

  const parseIngredientReferences = (text: string) => {
    const regex = /\{([^,}]+)(?:,\s*name\s*:\s*(?:"([^"]*)"|'([^']*)'))?\}/g;
    const references: {
      raw: string;
      ingredientName: string;
      customName?: string;
    }[] = [];
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text || "")) !== null) {
      references.push({
        raw: match[0],
        ingredientName: match[1].trim(),
        customName: (match[2] || match[3] || "").trim() || undefined,
      });
    }
    return references;
  };
  const getIngredientComponents = (name: string): string | null => {
    const recipeIng = loadedRecipe?.totalIngredients?.find(
      (i: any) => i.name === name,
    );
    if (recipeIng && recipeIng.components) {
      return recipeIng.components;
    }
    const masterIng = allIngredients.find((i: any) => i.name === name);
    if (masterIng && masterIng.components) {
      return masterIng.components;
    }
    return null;
  };
  const [enableDualLanguage, setEnableDualLanguage] = useState<boolean>(false);
  const getFormattedIngredientsText = (): string => {
    let formatted = ingredientsText || "";
    const references = parseIngredientReferences(ingredientsText);
    references.forEach((ref) => {
      const displayName = ref.customName || ref.ingredientName;
      const isExpanded = !!expandedIngredients[ref.raw];
      const comps = getIngredientComponents(ref.ingredientName);
      let replacement = displayName;
      if (enableDualLanguage) {
        const translatedName = t(ref.ingredientName, {
          lng: printLanguage,
          fallbackLng: "zh-TW",
        });
        if (translatedName && translatedName !== ref.ingredientName) {
          replacement = `${displayName} (${translatedName})`;
        }
      }
      if (isExpanded && comps) {
        const formattedComps = comps
          .split(/[,，、\s]+/)
          .filter(Boolean)
          .join("、");
        replacement = `${replacement}(${formattedComps})`;
      }
      formatted = formatted.replaceAll(ref.raw, replacement);
    });
    return formatted;
  };

  // Layout Size Options
  type LabelSize = "100x100" | "80x80" | "100x150" | "70x50";
  const [labelSize, setLabelSize] = useState<LabelSize>("100x100");

  // Group Collapse Accordion States
  const [activeAccordion, setActiveAccordion] = useState<
    "A" | "B" | "C" | "D" | "E" | "F" | "L" | null
  >("A");

  // Group Font Scales (Multiplier from 0.6 to 2.0)
  const [groupFontScales, setGroupFontScales] = useState<
    Record<"A" | "B" | "C" | "D" | "E" | "F", number>
  >({
    A: 1.0,
    B: 1.0,
    C: 1.0,
    D: 1.0,
    E: 1.0,
    F: 1.0,
  });
  const updateGroupFontScale = (
    key: "A" | "B" | "C" | "D" | "E" | "F",
    value: number,
  ) => {
    setGroupFontScales((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Barcode Explanation dynamic text
  const [barcodeExplanation, setBarcodeExplanation] = useState<string>(
    t("erp_444"),
  );

  // Copy and Paste Layout configuration utilities
  const [targetRecipeIdToCopyTo, setTargetRecipeIdToCopyTo] =
    useState<string>("");
  const [copyingLayoutToRecipe, setCopyingLayoutToRecipe] =
    useState<boolean>(false);

  // Warning Label for Non-Ready-To-Eat
  const [showNotReadyToEat, setShowNotReadyToEat] = useState<boolean>(true);
  const [notReadyToEatText, setNotReadyToEatText] = useState<string>(
    t("erp_445"),
  );

  // Nutrition Precision and Max Length Configs
  const [nutritionConfigs, setNutritionConfigs] = useState<
    Record<
      string,
      {
        decimals: number;
        maxLength: number;
      }
    >
  >({
    calories: {
      decimals: -1,
      maxLength: 8,
    },
    protein: {
      decimals: 1,
      maxLength: 8,
    },
    fat: {
      decimals: 1,
      maxLength: 8,
    },
    saturatedFat: {
      decimals: 1,
      maxLength: 8,
    },
    transFat: {
      decimals: 1,
      maxLength: 8,
    },
    carbs: {
      decimals: 1,
      maxLength: 8,
    },
    sugar: {
      decimals: 1,
      maxLength: 8,
    },
    sodium: {
      decimals: -1,
      maxLength: 8,
    },
  });
  const updateNutritionConfig = (
    key: string,
    updates: Partial<{
      decimals: number;
      maxLength: number;
    }>,
  ) => {
    setNutritionConfigs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...updates,
      },
    }));
  };

  // Custom Line Segments
  interface CustomLine {
    id: string;
    type: "horizontal" | "vertical";
    left: number;
    top: number;
    length: number;
    thickness: string;
    style: "solid" | "dashed" | "dotted" | "double";
    color: string;
  }
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);
  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const [resizingLineId, setResizingLineId] = useState<string | null>(null);
  const [dragLineStartPos, setDragLineStartPos] = useState({
    x: 0,
    y: 0,
  });
  const [dragLineStartLayout, setDragLineStartLayout] = useState({
    left: 0,
    top: 0,
    length: 0,
  });
  const handleAddLine = () => {
    const newLine: CustomLine = {
      id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "horizontal",
      left: 25,
      top: 50,
      length: 50,
      thickness: "1pt",
      style: "solid",
      color: "#000000",
    };
    setCustomLines((prev) => [...prev, newLine]);
  };
  const handleDeleteLine = (id: string) => {
    setCustomLines((prev) => prev.filter((l) => l.id !== id));
  };
  const handleUpdateLine = (id: string, updates: Partial<CustomLine>) => {
    setCustomLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              ...updates,
            }
          : l,
      ),
    );
  };
  const handleLineDragStart = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const line = customLines.find((l) => l.id === id);
    if (!line) return;
    setDraggingLineId(id);
    setDragLineStartPos({
      x: e.clientX,
      y: e.clientY,
    });
    setDragLineStartLayout({
      left: line.left,
      top: line.top,
      length: line.length,
    });
  };
  const handleLineResizeStart = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const line = customLines.find((l) => l.id === id);
    if (!line) return;
    setResizingLineId(id);
    setDragLineStartPos({
      x: e.clientX,
      y: e.clientY,
    });
    setDragLineStartLayout({
      left: line.left,
      top: line.top,
      length: line.length,
    });
  };
  useEffect(() => {
    const handleLineMouseMove = (e: MouseEvent) => {
      if (!draggingLineId && !resizingLineId) return;
      const labelEl = document.getElementById("printable-label");
      if (!labelEl) return;
      const rect = labelEl.getBoundingClientRect();
      const deltaX = e.clientX - dragLineStartPos.x;
      const deltaY = e.clientY - dragLineStartPos.y;
      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;
      setCustomLines((prevLines) => {
        const lineId = draggingLineId || resizingLineId;
        const targetLine = prevLines.find((l) => l.id === lineId);
        if (!targetLine) return prevLines;
        const start = dragLineStartLayout;
        return prevLines.map((line) => {
          if (line.id !== lineId) return line;
          if (draggingLineId) {
            let newLeft = Math.round((start.left + deltaXPercent) / 2) * 2;
            let newTop = Math.round((start.top + deltaYPercent) / 2) * 2;
            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (line.type === "horizontal") {
              if (newLeft + line.length > 100) newLeft = 100 - line.length;
            } else {
              if (newLeft > 100) newLeft = 100;
            }
            if (line.type === "vertical") {
              if (newTop + line.length > 100) newTop = 100 - line.length;
            } else {
              if (newTop > 100) newTop = 100;
            }
            return {
              ...line,
              left: newLeft,
              top: newTop,
            };
          } else if (resizingLineId) {
            let newLength =
              line.type === "horizontal"
                ? Math.round((start.length + deltaXPercent) / 2) * 2
                : Math.round((start.length + deltaYPercent) / 2) * 2;
            if (newLength < 2) newLength = 2;
            if (line.type === "horizontal") {
              if (line.left + newLength > 100) newLength = 100 - line.left;
            } else {
              if (line.top + newLength > 100) newLength = 100 - line.top;
            }
            return {
              ...line,
              length: newLength,
            };
          }
          return line;
        });
      });
    };
    const handleLineMouseUp = () => {
      if (draggingLineId || resizingLineId) {
        setDraggingLineId(null);
        setResizingLineId(null);
      }
    };
    if (draggingLineId || resizingLineId) {
      window.addEventListener("mousemove", handleLineMouseMove);
      window.addEventListener("mouseup", handleLineMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleLineMouseMove);
      window.removeEventListener("mouseup", handleLineMouseUp);
    };
  }, [draggingLineId, resizingLineId, dragLineStartPos, dragLineStartLayout]);

  // Drag-and-Resize Custom Positioning Layout Mode
  const [useCustomLayout, setUseCustomLayout] = useState<boolean>(false);
  interface GroupLayout {
    left: number;
    top: number;
    width: number;
    height: number;
  }
  interface LabelLayout {
    A: GroupLayout;
    B: GroupLayout;
    C: GroupLayout;
    D: GroupLayout;
    E: GroupLayout;
    F: GroupLayout;
  }
  const DEFAULT_LAYOUTS: Record<
    "100x100" | "80x80" | "100x150" | "70x50",
    LabelLayout
  > = {
    "100x100": {
      A: {
        left: 2,
        top: 48,
        width: 48,
        height: 34,
      },
      B: {
        left: 2,
        top: 2,
        width: 96,
        height: 14,
      },
      F: {
        left: 2,
        top: 16,
        width: 50,
        height: 30,
      },
      C: {
        left: 52,
        top: 48,
        width: 46,
        height: 34,
      },
      D: {
        left: 2,
        top: 84,
        width: 96,
        height: 14,
      },
      E: {
        left: 54,
        top: 16,
        width: 44,
        height: 30,
      },
    },
    "80x80": {
      A: {
        left: 2,
        top: 48,
        width: 48,
        height: 34,
      },
      B: {
        left: 2,
        top: 2,
        width: 96,
        height: 14,
      },
      F: {
        left: 2,
        top: 16,
        width: 50,
        height: 30,
      },
      C: {
        left: 52,
        top: 48,
        width: 46,
        height: 34,
      },
      D: {
        left: 2,
        top: 84,
        width: 96,
        height: 14,
      },
      E: {
        left: 54,
        top: 16,
        width: 44,
        height: 30,
      },
    },
    "100x150": {
      B: {
        left: 2,
        top: 2,
        width: 96,
        height: 12,
      },
      F: {
        left: 2,
        top: 14,
        width: 96,
        height: 16,
      },
      E: {
        left: 2,
        top: 32,
        width: 96,
        height: 32,
      },
      C: {
        left: 2,
        top: 66,
        width: 96,
        height: 20,
      },
      A: {
        left: 2,
        top: 88,
        width: 96,
        height: 28,
      },
      D: {
        left: 2,
        top: 118,
        width: 96,
        height: 30,
      },
    },
    "70x50": {
      B: {
        left: 2,
        top: 2,
        width: 96,
        height: 18,
      },
      F: {
        left: 2,
        top: 20,
        width: 96,
        height: 30,
      },
      E: {
        left: 2,
        top: 52,
        width: 96,
        height: 22,
      },
      C: {
        left: 2,
        top: 76,
        width: 96,
        height: 12,
      },
      A: {
        left: 2,
        top: 90,
        width: 96,
        height: 4,
      },
      D: {
        left: 2,
        top: 96,
        width: 96,
        height: 2,
      },
    },
  };
  const [groupLayouts, setGroupLayouts] = useState<LabelLayout>(
    DEFAULT_LAYOUTS["100x100"],
  );

  // Update layout defaults when labelSize changes
  useEffect(() => {
    const saved = localStorage.getItem(`group_layouts_${labelSize}`);
    const defaults = DEFAULT_LAYOUTS[labelSize] || DEFAULT_LAYOUTS["100x100"];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGroupLayouts({
          ...defaults,
          ...parsed,
        });
      } catch (e) {
        setGroupLayouts(defaults);
      }
    } else {
      setGroupLayouts(defaults);
    }
  }, [labelSize]);

  // Drag and Resize Mouse Listeners
  const [draggingGroup, setDraggingGroup] = useState<
    "A" | "B" | "C" | "D" | "E" | "F" | null
  >(null);
  const [resizingGroup, setResizingGroup] = useState<
    "A" | "B" | "C" | "D" | "E" | "F" | null
  >(null);
  const [dragStartPos, setDragStartPos] = useState({
    x: 0,
    y: 0,
  });
  const [dragStartLayout, setDragStartLayout] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingGroup && !resizingGroup) return;
      const labelEl = document.getElementById("printable-label");
      if (!labelEl) return;
      const rect = labelEl.getBoundingClientRect();
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;
      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;
      setGroupLayouts((prev) => {
        const currentLayouts = {
          ...prev,
        };
        const group = draggingGroup || resizingGroup;
        if (!group) return prev;
        const start = dragStartLayout;
        if (draggingGroup) {
          let newLeft = Math.round((start.left + deltaXPercent) / 2) * 2;
          let newTop = Math.round((start.top + deltaYPercent) / 2) * 2;
          if (newLeft < 0) newLeft = 0;
          if (newTop < 0) newTop = 0;
          if (newLeft + start.width > 100) newLeft = 100 - start.width;
          if (newTop + start.height > 100) newTop = 100 - start.height;
          currentLayouts[group] = {
            ...currentLayouts[group],
            left: newLeft,
            top: newTop,
          };
        } else if (resizingGroup) {
          let newWidth = Math.round((start.width + deltaXPercent) / 2) * 2;
          let newHeight = Math.round((start.height + deltaYPercent) / 2) * 2;
          if (newWidth < 10) newWidth = 10;
          if (newHeight < 6) newHeight = 6;
          if (start.left + newWidth > 100) newWidth = 100 - start.left;
          if (start.top + newHeight > 100) newHeight = 100 - start.top;
          currentLayouts[group] = {
            ...currentLayouts[group],
            width: newWidth,
            height: newHeight,
          };
        }
        return currentLayouts;
      });
    };
    const handleMouseUp = () => {
      if (draggingGroup || resizingGroup) {
        setGroupLayouts((current) => {
          localStorage.setItem(
            `group_layouts_${labelSize}`,
            JSON.stringify(current),
          );
          return current;
        });
        setDraggingGroup(null);
        setResizingGroup(null);
      }
    };
    if (draggingGroup || resizingGroup) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingGroup, resizingGroup, dragStartPos, dragStartLayout, labelSize]);

  // Continuous Spacing Options (Label Gap in mm)
  const [labelGap, setLabelGap] = useState<number>(3);
  const [includeGapInPrint, setIncludeGapInPrint] = useState<boolean>(true);
  const [previewContinuous, setPreviewContinuous] = useState<boolean>(true);
  const [labelBorderRadius, setLabelBorderRadius] = useState<number>(4);
  const [gapAlignment, setGapAlignment] = useState<"top" | "center" | "bottom">(
    "bottom",
  );

  // Toggle options (Checkboxes for adaptive columns)
  const [showBranding, setShowBranding] = useState(true);
  const [showProductZh, setShowProductZh] = useState(true);
  const [showProductEn, setShowProductEn] = useState(true);
  const [showIngredients, setShowIngredients] = useState(true);
  const [showNetWeight, setShowNetWeight] = useState(true);
  const [showStorage, setShowStorage] = useState(true);
  const [showExpiry, setShowExpiry] = useState(true);
  const [showResponsible, setShowResponsible] = useState(true);
  const [showReheating, setShowReheating] = useState(true);
  const [showAirFryer, setShowAirFryer] = useState(true);
  const [showOven, setShowOven] = useState(true);
  const [showPan, setShowPan] = useState(true);
  const [showNutrition, setShowNutrition] = useState(true);
  const [showAllergens, setShowAllergens] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);

  // Field values
  const [productZh, setProductZh] = useState(t("erp_446"));
  const [productEn, setProductEn] = useState("PEPPERONI PIZZA");
  const [ingredientsText, setIngredientsText] = useState(t("erp_447"));
  const [netWeight, setNetWeight] = useState(t("erp_448"));
  const [storageCondition, setStorageCondition] = useState(t("erp_449"));
  const [shelfLife, setShelfLife] = useState(t("erp_450"));
  const [expiryOption, setExpiryOption] = useState<"printed" | "date">(
    "printed",
  ); // 'printed' -> 標示於封口, 'date' -> 特定日期
  const [expiryDate, setExpiryDate] = useState("2027/05/20");

  // Customizable Brand Names
  const [brandNameZh, setBrandNameZh] = useState(t("erp_451"));
  const [brandNameEn, setBrandNameEn] = useState("PREMIUM FOOD LAB");

  // Custom Logo Options
  const [logoType, setLogoType] = useState<"icon" | "upload" | "text">("icon");
  const [selectedIconName, setSelectedIconName] = useState<string>("ChefHat");
  const [uploadedLogo, setUploadedLogo] = useState<string>(""); // Base64 image data-url

  // Responsible Party Info
  const [companyName, setCompanyName] = useState(t("erp_452"));
  const [companyPhone, setCompanyPhone] = useState("02-2345-6789");
  const [companyAddress, setCompanyAddress] = useState(t("erp_453"));
  const [originCountry, setOriginCountry] = useState(t("erp_454"));

  // Individual corporate detail display toggles
  const [showAddress, setShowAddress] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [showManufacturer, setShowManufacturer] = useState(true);

  // Allergen Statement
  const [allergenWarning, setAllergenWarning] = useState(t("erp_455"));

  // Reheating Instructions
  const [airFryerSteps, setAirFryerSteps] = useState(t("erp_456"));
  const [ovenSteps, setOvenSteps] = useState(t("erp_457"));
  const [panSteps, setPanSteps] = useState(t("erp_458"));

  // Reheating Instructions Font Sizes
  const [reheatingMainTitleSize, setReheatingMainTitleSize] = useState(7.5);
  const [reheatingSubTitleSize, setReheatingSubTitleSize] = useState(7.2);
  const [reheatingContentSize, setReheatingContentSize] = useState(6.2);

  // Reheating Instructions Custom Titles
  const [reheatingMainTitle, setReheatingMainTitle] = useState(t("erp_459"));
  const [airFryerTitle, setAirFryerTitle] = useState(t("erp_460"));
  const [ovenTitle, setOvenTitle] = useState(t("erp_461"));
  const [panTitle, setPanTitle] = useState(t("erp_462"));

  // Recipe portion scaling states
  const [loadedRecipe, setLoadedRecipe] = useState<any | null>(null);
  const [portionScale, setPortionScale] = useState(1.0);

  // Nutrition Facts (per 100g)
  const [portionSize, setPortionSize] = useState("100"); // 每一份量克數
  const [portionsPerPkg, setPortionsPerPkg] = useState("2.4"); // 本包裝含幾份

  const [calories, setCalories] = useState("265");
  const [protein, setProtein] = useState("12.5");
  const [fat, setFat] = useState("8.4");
  const [saturatedFat, setSaturatedFat] = useState("3.2");
  const [transFat, setTransFat] = useState("0");
  const [carbs, setCarbs] = useState("35.2");
  const [sugar, setSugar] = useState("1.8");
  const [sodium, setSodium] = useState("480");

  // Barcode / QR Code content
  const [barcodeText, setBarcodeText] = useState(
    "https://smartkitchen-erp.com/recipe",
  );

  // Load recipes list
  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3000/api/recipes");
      setRecipes(response.data);
    } catch (error) {
      console.error("Failed to load recipes", error);
    } finally {
      setLoading(false);
    }
  };

  // Load ingredients list
  const fetchIngredients = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/ingredients");
      setAllIngredients(response.data);
    } catch (error) {
      console.error("Failed to load ingredients", error);
    }
  };
  useEffect(() => {
    fetchRecipes();
    fetchIngredients();

    // Load saved label settings if they exist
    const saved = localStorage.getItem("pizzamaster_label_settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.labelSize) setLabelSize(settings.labelSize);
        if (settings.labelGap !== undefined) setLabelGap(settings.labelGap);
        if (settings.includeGapInPrint !== undefined)
          setIncludeGapInPrint(settings.includeGapInPrint);
        if (settings.previewContinuous !== undefined)
          setPreviewContinuous(settings.previewContinuous);
        if (settings.labelBorderRadius !== undefined)
          setLabelBorderRadius(settings.labelBorderRadius);
        if (settings.gapAlignment !== undefined)
          setGapAlignment(settings.gapAlignment);
        if (settings.showBranding !== undefined)
          setShowBranding(settings.showBranding);
        if (settings.showProductZh !== undefined)
          setShowProductZh(settings.showProductZh);
        if (settings.showProductEn !== undefined)
          setShowProductEn(settings.showProductEn);
        if (settings.showIngredients !== undefined)
          setShowIngredients(settings.showIngredients);
        if (settings.showNetWeight !== undefined)
          setShowNetWeight(settings.showNetWeight);
        if (settings.showStorage !== undefined)
          setShowStorage(settings.showStorage);
        if (settings.showExpiry !== undefined)
          setShowExpiry(settings.showExpiry);
        if (settings.showResponsible !== undefined)
          setShowResponsible(settings.showResponsible);
        if (settings.showReheating !== undefined)
          setShowReheating(settings.showReheating);
        if (settings.showAirFryer !== undefined)
          setShowAirFryer(settings.showAirFryer);
        if (settings.showOven !== undefined) setShowOven(settings.showOven);
        if (settings.showPan !== undefined) setShowPan(settings.showPan);
        if (settings.showNutrition !== undefined)
          setShowNutrition(settings.showNutrition);
        if (settings.showAllergens !== undefined)
          setShowAllergens(settings.showAllergens);
        if (settings.showBarcode !== undefined)
          setShowBarcode(settings.showBarcode);
        if (settings.expandedIngredients !== undefined)
          setExpandedIngredients(settings.expandedIngredients);
        if (settings.showAddress !== undefined)
          setShowAddress(settings.showAddress);
        if (settings.showPhone !== undefined) setShowPhone(settings.showPhone);
        if (settings.showOrigin !== undefined)
          setShowOrigin(settings.showOrigin);
        if (settings.showManufacturer !== undefined)
          setShowManufacturer(settings.showManufacturer);
        if (settings.useCustomLayout !== undefined)
          setUseCustomLayout(settings.useCustomLayout);
        if (settings.showNotReadyToEat !== undefined)
          setShowNotReadyToEat(settings.showNotReadyToEat);
        if (settings.notReadyToEatText !== undefined)
          setNotReadyToEatText(settings.notReadyToEatText);
        if (settings.nutritionConfigs !== undefined)
          setNutritionConfigs(settings.nutritionConfigs);
        if (settings.groupFontScales !== undefined) {
          setGroupFontScales({
            A: 1.0,
            B: 1.0,
            C: 1.0,
            D: 1.0,
            E: 1.0,
            F: 1.0,
            ...settings.groupFontScales,
          });
        }
        if (settings.barcodeExplanation !== undefined)
          setBarcodeExplanation(settings.barcodeExplanation);
        if (settings.brandNameZh) setBrandNameZh(settings.brandNameZh);
        if (settings.brandNameEn) setBrandNameEn(settings.brandNameEn);
        if (settings.logoType) setLogoType(settings.logoType);
        if (settings.selectedIconName)
          setSelectedIconName(settings.selectedIconName);
        if (settings.uploadedLogo) setUploadedLogo(settings.uploadedLogo);
        if (settings.companyName) setCompanyName(settings.companyName);
        if (settings.companyPhone) setCompanyPhone(settings.companyPhone);
        if (settings.companyAddress) setCompanyAddress(settings.companyAddress);
        if (settings.originCountry) setOriginCountry(settings.originCountry);
        if (settings.barcodeText) setBarcodeText(settings.barcodeText);
        if (settings.reheatingMainTitle)
          setReheatingMainTitle(settings.reheatingMainTitle);
        if (settings.airFryerTitle) setAirFryerTitle(settings.airFryerTitle);
        if (settings.ovenTitle) setOvenTitle(settings.ovenTitle);
        if (settings.panTitle) setPanTitle(settings.panTitle);
        if (settings.reheatingMainTitleSize)
          setReheatingMainTitleSize(settings.reheatingMainTitleSize);
        if (settings.reheatingSubTitleSize)
          setReheatingSubTitleSize(settings.reheatingSubTitleSize);
        if (settings.reheatingContentSize)
          setReheatingContentSize(settings.reheatingContentSize);
        if (settings.customLines !== undefined)
          setCustomLines(settings.customLines);
        if (settings.enableDualLanguage !== undefined)
          setEnableDualLanguage(settings.enableDualLanguage);
        if (settings.printLanguage !== undefined)
          setPrintLanguage(settings.printLanguage);
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
  }, []);
  const [savingLabelConfig, setSavingLabelConfig] = useState(false);
  const restoreLabelConfig = (config: any) => {
    if (!config) return;

    // Continuous Spacing details
    if (config.labelGap !== undefined) setLabelGap(config.labelGap);
    if (config.includeGapInPrint !== undefined)
      setIncludeGapInPrint(config.includeGapInPrint);
    if (config.previewContinuous !== undefined)
      setPreviewContinuous(config.previewContinuous);
    if (config.labelBorderRadius !== undefined)
      setLabelBorderRadius(config.labelBorderRadius);
    if (config.gapAlignment !== undefined) setGapAlignment(config.gapAlignment);

    // Core details
    if (config.useCustomLayout !== undefined)
      setUseCustomLayout(config.useCustomLayout);
    if (config.customLines !== undefined)
      setCustomLines(config.customLines || []);
    if (config.showNotReadyToEat !== undefined)
      setShowNotReadyToEat(config.showNotReadyToEat);
    if (config.notReadyToEatText !== undefined)
      setNotReadyToEatText(config.notReadyToEatText);
    if (config.nutritionConfigs !== undefined)
      setNutritionConfigs(config.nutritionConfigs);
    if (config.groupLayouts !== undefined) {
      const defaults = DEFAULT_LAYOUTS[labelSize] || DEFAULT_LAYOUTS["100x100"];
      setGroupLayouts({
        ...defaults,
        ...config.groupLayouts,
      });
    }
    if (config.groupFontScales !== undefined) {
      setGroupFontScales({
        A: 1.0,
        B: 1.0,
        C: 1.0,
        D: 1.0,
        E: 1.0,
        F: 1.0,
        ...config.groupFontScales,
      });
    }
    if (config.barcodeExplanation !== undefined)
      setBarcodeExplanation(config.barcodeExplanation);
    if (config.productZh !== undefined) setProductZh(config.productZh);
    if (config.productEn !== undefined) setProductEn(config.productEn);
    if (config.ingredientsText !== undefined)
      setIngredientsText(config.ingredientsText);
    if (config.netWeight !== undefined) setNetWeight(config.netWeight);
    if (config.storageCondition !== undefined)
      setStorageCondition(config.storageCondition);
    if (config.shelfLife !== undefined) setShelfLife(config.shelfLife);
    if (config.expiryOption !== undefined) setExpiryOption(config.expiryOption);
    if (config.brandNameZh !== undefined) setBrandNameZh(config.brandNameZh);
    if (config.brandNameEn !== undefined) setBrandNameEn(config.brandNameEn);
    if (config.logoType !== undefined) setLogoType(config.logoType);

    // Corporate & Warnings
    if (config.companyName !== undefined) setCompanyName(config.companyName);
    if (config.companyPhone !== undefined) setCompanyPhone(config.companyPhone);
    if (config.companyAddress !== undefined)
      setCompanyAddress(config.companyAddress);
    if (config.originCountry !== undefined)
      setOriginCountry(config.originCountry);
    if (config.allergenWarning !== undefined)
      setAllergenWarning(config.allergenWarning);
    if (config.barcodeText !== undefined) setBarcodeText(config.barcodeText);

    // Toggle Visibility Options
    if (config.showBranding !== undefined) setShowBranding(config.showBranding);
    if (config.showProductZh !== undefined)
      setShowProductZh(config.showProductZh);
    if (config.showProductEn !== undefined)
      setShowProductEn(config.showProductEn);
    if (config.showIngredients !== undefined)
      setShowIngredients(config.showIngredients);
    if (config.showNetWeight !== undefined)
      setShowNetWeight(config.showNetWeight);
    if (config.showStorage !== undefined) setShowStorage(config.showStorage);
    if (config.showExpiry !== undefined) setShowExpiry(config.showExpiry);
    if (config.showResponsible !== undefined)
      setShowResponsible(config.showResponsible);
    if (config.showReheating !== undefined)
      setShowReheating(config.showReheating);
    if (config.showAirFryer !== undefined) setShowAirFryer(config.showAirFryer);
    if (config.showOven !== undefined) setShowOven(config.showOven);
    if (config.showPan !== undefined) setShowPan(config.showPan);
    if (config.showNutrition !== undefined)
      setShowNutrition(config.showNutrition);
    if (config.showAllergens !== undefined)
      setShowAllergens(config.showAllergens);
    if (config.showBarcode !== undefined) setShowBarcode(config.showBarcode);
    if (config.expandedIngredients !== undefined)
      setExpandedIngredients(config.expandedIngredients || {});

    // Reheating Details
    if (config.airFryerSteps !== undefined)
      setAirFryerSteps(config.airFryerSteps);
    if (config.ovenSteps !== undefined) setOvenSteps(config.ovenSteps);
    if (config.panSteps !== undefined) setPanSteps(config.panSteps);
    if (config.reheatingMainTitle !== undefined)
      setReheatingMainTitle(config.reheatingMainTitle);
    if (config.airFryerTitle !== undefined)
      setAirFryerTitle(config.airFryerTitle);
    if (config.ovenTitle !== undefined) setOvenTitle(config.ovenTitle);
    if (config.panTitle !== undefined) setPanTitle(config.panTitle);

    // Nutrition values
    if (config.portionSize !== undefined) setPortionSize(config.portionSize);
    if (config.portionsPerPkg !== undefined)
      setPortionsPerPkg(config.portionsPerPkg);
    if (config.calories !== undefined) setCalories(config.calories);
    if (config.protein !== undefined) setProtein(config.protein);
    if (config.fat !== undefined) setFat(config.fat);
    if (config.saturatedFat !== undefined) setSaturatedFat(config.saturatedFat);
    if (config.transFat !== undefined) setTransFat(config.transFat);
    if (config.carbs !== undefined) setCarbs(config.carbs);
    if (config.sugar !== undefined) setSugar(config.sugar);
    if (config.sodium !== undefined) setSodium(config.sodium);

    // Scaling
    if (config.portionScale !== undefined) setPortionScale(config.portionScale);

    // Dual Language
    if (config.enableDualLanguage !== undefined)
      setEnableDualLanguage(config.enableDualLanguage);
    if (config.printLanguage !== undefined)
      setPrintLanguage(config.printLanguage);
  };

  // Copy and Paste Layout configuration utilities
  const handleCopyLayoutToClipboard = () => {
    const { t } = useTranslation();
    localStorage.setItem(
      "shutter_layout_clipboard",
      JSON.stringify({
        groupLayouts,
        groupFontScales,
        customLines,
      }),
    );
    alert(t("erp_463"));
  };
  const handlePasteLayoutFromClipboard = () => {
    const { t } = useTranslation();
    const data = localStorage.getItem("shutter_layout_clipboard");
    if (!data) {
      alert(t("erp_464"));
      return;
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed.groupLayouts) setGroupLayouts(parsed.groupLayouts);
      if (parsed.groupFontScales) setGroupFontScales(parsed.groupFontScales);
      if (parsed.customLines !== undefined) setCustomLines(parsed.customLines);
      alert(t("erp_465"));
    } catch (e) {
      alert(t("erp_466"));
    }
  };
  const handleCopyLayoutToRecipe = async () => {
    const { t } = useTranslation();
    if (!selectedRecipeId) {
      alert(t("erp_467"));
      return;
    }
    if (!targetRecipeIdToCopyTo) {
      alert(t("erp_468"));
      return;
    }
    try {
      setCopyingLayoutToRecipe(true);
      const res = await axios.get(
        `http://localhost:3000/api/recipes/${targetRecipeIdToCopyTo}`,
      );
      const targetRecipe = res.data;
      const oldConfig = targetRecipe.labelConfig || {};
      const updatedConfig = {
        ...oldConfig,
        useCustomLayout,
        groupLayouts,
        groupFontScales,
        customLines,
      };
      await axios.patch(
        `http://localhost:3000/api/recipes/${targetRecipeIdToCopyTo}/label-config`,
        {
          labelConfig: updatedConfig,
        },
      );
      alert(t("erp_469"));
      setTargetRecipeIdToCopyTo("");
    } catch (error) {
      console.error("Failed to copy layout to recipe", error);
      alert(t("erp_470"));
    } finally {
      setCopyingLayoutToRecipe(false);
    }
  };
  const handleSaveLabelConfig = async () => {
    const { t } = useTranslation();
    if (!selectedRecipeId) {
      alert(t("erp_471"));
      return;
    }
    try {
      setSavingLabelConfig(true);
      const labelConfig = {
        useCustomLayout,
        customLines,
        showNotReadyToEat,
        notReadyToEatText,
        nutritionConfigs,
        groupLayouts,
        groupFontScales,
        barcodeExplanation,
        labelGap,
        includeGapInPrint,
        previewContinuous,
        labelBorderRadius,
        gapAlignment,
        productZh,
        productEn,
        ingredientsText,
        netWeight,
        storageCondition,
        shelfLife,
        expiryOption,
        brandNameZh,
        brandNameEn,
        logoType,
        companyName,
        companyPhone,
        companyAddress,
        originCountry,
        allergenWarning,
        barcodeText,
        showBranding,
        showProductZh,
        showProductEn,
        showIngredients,
        showNetWeight,
        showStorage,
        showExpiry,
        showResponsible,
        showReheating,
        showAirFryer,
        showOven,
        showPan,
        showNutrition,
        showAllergens,
        showBarcode,
        airFryerSteps,
        ovenSteps,
        panSteps,
        reheatingMainTitle,
        airFryerTitle,
        ovenTitle,
        panTitle,
        portionSize,
        portionsPerPkg,
        calories,
        protein,
        fat,
        saturatedFat,
        transFat,
        carbs,
        sugar,
        sodium,
        portionScale,
        expandedIngredients,
      };
      await axios.patch(
        `http://localhost:3000/api/recipes/${selectedRecipeId}/label-config`,
        {
          labelConfig,
        },
      );
      alert(t("erp_472"));
      if (loadedRecipe) {
        setLoadedRecipe({
          ...loadedRecipe,
          labelConfig,
        });
      }
    } catch (error) {
      console.error("Failed to save label design", error);
      alert(t("erp_473"));
    } finally {
      setSavingLabelConfig(false);
    }
  };

  // Sync state when recipe is selected
  const handleRecipeChange = async (recipeId: string) => {
    const { t } = useTranslation();
    setSelectedRecipeId(recipeId);
    setPortionScale(1.0); // Reset scale to 1.0 on recipe change
    if (!recipeId) {
      setLoadedRecipe(null);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3000/api/recipes/${recipeId}`,
      );
      const recipe = response.data;
      setLoadedRecipe(recipe);
      if (recipe.labelConfig) {
        restoreLabelConfig(recipe.labelConfig);
      } else {
        applyRecipeData(recipe, 1.0);
      }
    } catch (error) {
      console.error("Failed to load recipe details", error);
      alert(t("erp_474"));
    } finally {
      setLoading(false);
    }
  };
  const handlePortionScaleChange = (scale: number) => {
    setPortionScale(scale);
    if (loadedRecipe) {
      if (loadedRecipe.labelConfig) {
        // Dynamically scale weight and packaging quantity, keeping other customs intact
        const baseWeight = loadedRecipe.totalWeight || 250;
        const yieldCount =
          loadedRecipe.yieldAmount && loadedRecipe.yieldAmount > 0
            ? loadedRecipe.yieldAmount
            : 1;
        const singlePortionWeight = baseWeight / yieldCount;
        const weight = singlePortionWeight * scale;
        setNetWeight(`${weight.toFixed(0)}公克 ± 5%`);
        setPortionsPerPkg(
          String(Number((1 * scale).toFixed(1))).replace(/\.0$/, ""),
        );
      } else {
        applyRecipeData(loadedRecipe, scale);
      }
    }
  };
  const applyRecipeData = (recipe: any, scale: number) => {
    const { t } = useTranslation();
    // 1. Set Product Name (Chinese & English)
    setProductZh(recipe.name);
    setProductEn(
      recipe.description
        ? recipe.description.toUpperCase().slice(0, 30)
        : "HANDCRAFTED PIZZA",
    );

    // 2. Build Ingredients list (sorted by quantity from most to least)
    const sortedIngredients = [...(recipe.totalIngredients || [])].sort(
      (a, b) => b.quantity - a.quantity,
    );
    const ingNames = sortedIngredients
      .map((i: any) => `{${i.name}}`)
      .join("、");
    setIngredientsText(ingNames || t("erp_475"));

    // 2.5 Auto-initialize expanded status for ingredients that have components in the database
    const autoExpanded: Record<string, boolean> = {};
    sortedIngredients.forEach((ing: any) => {
      const comps = getIngredientComponents(ing.name);
      if (comps) {
        autoExpanded[`{${ing.name}}`] = true;
      }
    });
    setExpandedIngredients(autoExpanded);

    // 3. Collect Allergens warnings dynamically
    const allergensSet = new Set<string>();
    if (recipe.totalIngredients) {
      recipe.totalIngredients.forEach((ing: any) => {
        // Database-backed allergens
        if (ing.allergens) {
          ing.allergens.forEach((a: any) => allergensSet.add(a.name));
        }

        // Fallback parsing (keeps original logic as robust fallback!)
        const name = ing.name;
        if (
          name.includes(i18n.t("erp_476")) ||
          name.includes(i18n.t("erp_477")) ||
          name.includes(i18n.t("erp_478"))
        )
          allergensSet.add(i18n.t("erp_479"));
        if (
          name.includes(i18n.t("erp_480")) ||
          name.includes(i18n.t("erp_481")) ||
          name.includes(i18n.t("erp_482")) ||
          name.includes(i18n.t("erp_483"))
        )
          allergensSet.add(i18n.t("erp_484"));
        if (name.includes(i18n.t("erp_485")))
          allergensSet.add(i18n.t("erp_486"));
        if (
          name.includes(i18n.t("erp_487")) ||
          name.includes(i18n.t("erp_488"))
        )
          allergensSet.add(i18n.t("erp_489"));
        if (
          name.includes(i18n.t("erp_490")) ||
          name.includes(i18n.t("erp_491")) ||
          name.includes(i18n.t("erp_492")) ||
          name.includes(i18n.t("erp_493"))
        )
          allergensSet.add(i18n.t("erp_494"));
        if (
          name.includes(i18n.t("erp_495")) ||
          name.includes(i18n.t("erp_496")) ||
          name.includes(i18n.t("erp_497"))
        )
          allergensSet.add(i18n.t("erp_498"));
        if (name.includes(i18n.t("erp_499")))
          allergensSet.add(i18n.t("erp_499"));
        if (
          name.includes(i18n.t("erp_500")) ||
          name.includes(i18n.t("erp_501"))
        )
          allergensSet.add(i18n.t("erp_502"));
      });
    }
    if (allergensSet.size > 0) {
      setAllergenWarning(
        `本產品含有${Array.from(allergensSet).join("、")}及其製品，不適合對其過敏體質者食用。`,
      );
      setShowAllergens(true);
    } else {
      setAllergenWarning(t("erp_503"));
      setShowAllergens(false);
    }

    // 4. Calculate Nutrition per 100g (scaled based on totalWeight and portionScale!)
    const baseWeight = recipe.totalWeight || 250;
    const yieldCount =
      recipe.yieldAmount && recipe.yieldAmount > 0 ? recipe.yieldAmount : 1;
    const singlePortionWeight = baseWeight / yieldCount;

    // In practice, packaging is based on the minimum quantity (1 portion).
    // The scale (portionScale) determines how many portions are packaged together.
    const weight = singlePortionWeight * scale;
    setNetWeight(`${weight.toFixed(0)}公克 ± 5%`);

    // Portions per package is 1 scaled by portionScale. Serving size is always 1 portion.
    const portionsPerPkgVal = Number((1 * scale).toFixed(1));
    const portionSizeVal = Number(singlePortionWeight.toFixed(1));
    setPortionSize(String(portionSizeVal).replace(/\.0$/, ""));
    setPortionsPerPkg(String(portionsPerPkgVal).replace(/\.0$/, ""));

    // Nutrition values per 100g DO NOT change because they are relative to 100g!
    // But we still calculate them relative to the recipe stats
    const nutritionScale = baseWeight > 0 ? baseWeight / 100 : 1;
    setCalories(String(Math.round(recipe.calories / nutritionScale)));
    setProtein(String((recipe.protein / nutritionScale).toFixed(1)));
    setFat(String((recipe.fat / nutritionScale).toFixed(1)));
    setSaturatedFat(String((recipe.saturatedFat / nutritionScale).toFixed(1)));
    setTransFat(String((recipe.transFat / nutritionScale).toFixed(1)));
    setCarbs(String((recipe.carbohydrates / nutritionScale).toFixed(1)));
    setSugar(String((recipe.sugar / nutritionScale).toFixed(1)));
    setSodium(String(Math.round(recipe.sodium / nutritionScale)));
    setBarcodeText(`https://smartkitchen-erp.com/recipe/${recipe.id}`);
  };

  // Reset form to default Pizza Studio Pepperoni
  const handleReset = () => {
    const { t } = useTranslation();
    setSelectedRecipeId("");
    setUseCustomLayout(false);
    setCustomLines([]);
    setShowNotReadyToEat(true);
    setNotReadyToEatText(t("erp_445"));
    setNutritionConfigs({
      calories: {
        decimals: -1,
        maxLength: 8,
      },
      protein: {
        decimals: 1,
        maxLength: 8,
      },
      fat: {
        decimals: 1,
        maxLength: 8,
      },
      saturatedFat: {
        decimals: 1,
        maxLength: 8,
      },
      transFat: {
        decimals: 1,
        maxLength: 8,
      },
      carbs: {
        decimals: 1,
        maxLength: 8,
      },
      sugar: {
        decimals: 1,
        maxLength: 8,
      },
      sodium: {
        decimals: -1,
        maxLength: 8,
      },
    });
    setGroupLayouts(DEFAULT_LAYOUTS[labelSize] || DEFAULT_LAYOUTS["100x100"]);
    setActiveAccordion("A");
    setLoadedRecipe(null);
    setPortionScale(1.0);
    setLabelGap(3);
    setIncludeGapInPrint(true);
    setPreviewContinuous(true);
    setLabelBorderRadius(4);
    setGapAlignment("bottom");
    setProductZh(t("erp_446"));
    setProductEn("PEPPERONI PIZZA");
    setIngredientsText(t("erp_447"));
    setNetWeight(t("erp_448"));
    setStorageCondition(t("erp_449"));
    setShelfLife(t("erp_450"));
    setExpiryOption("printed");
    setBrandNameZh(t("erp_451"));
    setBrandNameEn("PREMIUM FOOD LAB");
    setLogoType("icon");
    setSelectedIconName("ChefHat");
    setUploadedLogo("");
    setCompanyName(t("erp_452"));
    setCompanyPhone("02-2345-6789");
    setCompanyAddress(t("erp_453"));
    setOriginCountry(t("erp_454"));
    setAllergenWarning(t("erp_455"));
    setCalories("265");
    setProtein("12.5");
    setFat("8.4");
    setSaturatedFat("3.2");
    setTransFat("0");
    setCarbs("35.2");
    setSugar("1.8");
    setSodium("480");
    setPortionSize("100");
    setPortionsPerPkg("2.4");
    setBarcodeText("https://smartkitchen-erp.com/recipe");
    setShowReheating(true);
    setShowAirFryer(true);
    setShowOven(true);
    setShowPan(true);
    setShowNutrition(true);
    setShowAllergens(true);
    setShowBranding(true);
    setShowBarcode(true);
    setReheatingMainTitleSize(7.5);
    setReheatingSubTitleSize(7.2);
    setReheatingContentSize(6.2);
    setReheatingMainTitle(t("erp_459"));
    setAirFryerTitle(t("erp_460"));
    setOvenTitle(t("erp_461"));
    setPanTitle(t("erp_462"));
    setShowAddress(true);
    setShowPhone(true);
    setShowOrigin(true);
    setShowManufacturer(true);
    setGroupFontScales({
      A: 1.0,
      B: 1.0,
      C: 1.0,
      D: 1.0,
      E: 1.0,
      F: 1.0,
    });
    setBarcodeExplanation(t("erp_444"));
    setExpandedIngredients({});
    setEnableDualLanguage(false);
    setPrintLanguage("en");
    localStorage.removeItem("pizzamaster_label_settings");
  };
  const handleSaveSettings = () => {
    const { t } = useTranslation();
    const settings = {
      useCustomLayout,
      customLines,
      showNotReadyToEat,
      notReadyToEatText,
      nutritionConfigs,
      labelSize,
      groupFontScales,
      barcodeExplanation,
      labelGap,
      includeGapInPrint,
      previewContinuous,
      labelBorderRadius,
      gapAlignment,
      showBranding,
      showProductZh,
      showProductEn,
      showIngredients,
      showNetWeight,
      showStorage,
      showExpiry,
      showResponsible,
      showReheating,
      showAirFryer,
      showOven,
      showPan,
      showNutrition,
      showAllergens,
      showBarcode,
      showAddress,
      showPhone,
      showOrigin,
      showManufacturer,
      brandNameZh,
      brandNameEn,
      logoType,
      selectedIconName,
      uploadedLogo,
      companyName,
      companyPhone,
      companyAddress,
      originCountry,
      barcodeText,
      reheatingMainTitle,
      airFryerTitle,
      ovenTitle,
      panTitle,
      reheatingMainTitleSize,
      reheatingSubTitleSize,
      reheatingContentSize,
      expandedIngredients,
      enableDualLanguage,
      printLanguage,
    };
    localStorage.setItem(
      "pizzamaster_label_settings",
      JSON.stringify(settings),
    );
    alert(t("erp_504"));
  };
  const renderLabelLogo = () => {
    const { t } = useTranslation();
    if (logoType === "upload" && uploadedLogo) {
      return (
        <img
          src={uploadedLogo}
          alt="Custom Logo"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          className="filter contrast-200 grayscale brightness-105 mix-blend-multiply shrink-0"
        />
      );
    }
    if (logoType === "text") {
      const abbreviation = brandNameZh
        ? brandNameZh.substring(0, 2)
        : t("erp_505");
      return (
        <div className="w-full h-full bg-black text-white flex items-center justify-center font-black text-[9pt] leading-none select-none">
          {abbreviation}
        </div>
      );
    }

    // Default to Vector Icon
    const IconComponent =
      selectedIconName === "ChefHat"
        ? ChefHat
        : selectedIconName === "Utensils"
          ? Utensils
          : selectedIconName === "Flame"
            ? Flame
            : selectedIconName === "Award"
              ? Award
              : selectedIconName === "Sparkles"
                ? Sparkles
                : selectedIconName === "Layers"
                  ? Layers
                  : ChefHat;
    return <IconComponent className="w-full h-full text-black stroke-[2]" />;
  };
  const formattedIngredients = getFormattedIngredientsText();
  const isBottomLeftEmpty = !showBarcode || !showNutrition || !showResponsible;
  const isRightColumnCrowded =
    (formattedIngredients || "").length > 85 ||
    (allergenWarning || "").length > 60;
  const shouldMoveInfoToBottomLeft = isBottomLeftEmpty || isRightColumnCrowded;
  const hasActiveReheating =
    showReheating && (showAirFryer || showOven || showPan);
  const getLabelDimensions = () => {
    let w = 100;
    let h = 100;
    if (labelSize === "80x80") {
      w = 80;
      h = 80;
    } else if (labelSize === "100x150") {
      w = 100;
      h = 150;
    } else if (labelSize === "70x50") {
      w = 70;
      h = 50;
    }
    return {
      w,
      h,
    };
  };

  // Generate dynamic container styling and fluid scaling for full adaptive layout
  const getLabelStyle = (): React.CSSProperties => {
    let width = "100mm";
    let height = "100mm";
    let padding = "3mm";
    let baseFontSize = "9.5pt";
    if (labelSize === "80x80") {
      width = "80mm";
      height = "80mm";
      padding = "2.5mm";
      baseFontSize = "8.2pt";
    } else if (labelSize === "100x150") {
      width = "100mm";
      height = "150mm";
      padding = "4mm";
      baseFontSize = "10.5pt";
    } else if (labelSize === "70x50") {
      width = "70mm";
      height = "50mm";
      padding = "1.2mm";
      baseFontSize = "6.8pt";
    }

    // Dynamic Font Scaling Factor based on active content sections
    if (labelSize !== "70x50") {
      let score = 0;
      if (showNotReadyToEat) score += 0.5;
      if (showReheating) {
        if (showAirFryer) score += 0.6;
        if (showOven) score += 0.6;
        if (showPan) score += 0.6;
        if (showAirFryer || showOven || showPan) score += 0.2;
      }
      if (showNutrition) score += 3.5;
      if (showIngredients) score += 1.2;
      if (showAllergens) score += 0.8;
      if (showResponsible) score += 1;
      let scaleFactor = 1.0;
      if (score >= 4) scaleFactor = 0.9;
      if (score >= 6) scaleFactor = 0.82;
      if (score >= 7.5) scaleFactor = 0.73;
      const baseVal = parseFloat(baseFontSize);
      baseFontSize = `${(baseVal * scaleFactor).toFixed(1)}pt`;
    } else {
      // 70x50 has hard constraints
      let score = 0;
      if (showNotReadyToEat) score += 0.4;
      if (showIngredients) score += 1;
      if (showAllergens) score += 0.8;
      let scaleFactor = 1.0;
      if (score > 1.5) scaleFactor = 0.85;
      if (formattedIngredients.length > 50) scaleFactor *= 0.88;
      const baseVal = parseFloat(baseFontSize);
      baseFontSize = `${(baseVal * scaleFactor).toFixed(1)}pt`;
    }
    return {
      width,
      height,
      padding,
      fontSize: baseFontSize,
      boxSizing: "border-box",
      fontFamily: '"Noto Sans TC", "Noto Serif TC", sans-serif',
      lineHeight: 1.25,
      backgroundColor: "#ffffff",
      color: "#000000",
      borderColor: "#000000",
      borderWidth: "1.2mm",
      borderStyle: "solid",
      borderRadius: `${labelBorderRadius}mm`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      overflow: "hidden",
      position: "relative",
      userSelect: "none",
    };
  };
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-primary to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <Printer className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800">
              {t("erp_506")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("erp_507")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSaveSettings}
            className="flex-1 md:flex-none px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs shadow-sm hover:bg-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t("erp_508")}</span>
          </button>

          <button
            onClick={handleReset}
            className="flex-1 md:flex-none px-4 py-2 bg-white border border-border text-gray-700 rounded-xl font-bold text-xs shadow-sm hover:bg-muted transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("erp_509")}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="w-full md:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-xl font-black text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t("erp_510")}</span>
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Controls Panel */}
        <div className="lg:col-span-5 bg-white border border-border rounded-3xl p-6 space-y-6 shadow-sm print:hidden max-h-[82vh] overflow-y-auto">
          {/* Section: Recipe Database Integrator */}
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-primary">
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider">
                  {t("erp_511")}
                </h4>
              </div>
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"></div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">
              {t("erp_512")}
            </p>
            <select
              disabled={loading}
              className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs disabled:opacity-60 disabled:bg-muted"
              value={selectedRecipeId}
              onChange={(e) => handleRecipeChange(e.target.value)}
            >
              <option value="">{t("erp_513")}</option>
              {recipes
                .filter((recipe) => recipe.isProduct !== false)
                .map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    🍳 {recipe.name}
                    {t("erp_514")}
                    {recipe.yieldAmount}
                    {recipe.yieldUnit})
                  </option>
                ))}
            </select>

            {selectedRecipeId && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 mt-2 border-t border-primary/10 pt-2">
                <label className="text-[10px] font-black text-primary flex justify-between">
                  <span>{t("erp_515")}</span>
                  <span className="font-extrabold">
                    {portionScale}
                    {t("erp_516")}
                  </span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  className="w-full px-3 py-1.5 bg-white border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  value={portionScale}
                  onChange={(e) =>
                    handlePortionScaleChange(parseFloat(e.target.value) || 1.0)
                  }
                />
                <span className="text-[8.5px] text-muted-foreground leading-normal block pb-1.5">
                  {t("erp_517")}
                </span>

                {loadedRecipe && loadedRecipe.bakingLossRate > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 my-2.5 text-[10px] text-orange-800 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="font-black flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-600 animate-pulse shrink-0" />
                      <span>
                        {t("erp_518")}
                        {loadedRecipe.bakingLossRate}
                        {t("erp_519")}
                      </span>
                    </div>
                    <p className="leading-relaxed font-medium">
                      {t("erp_520")}
                      {(
                        (loadedRecipe.totalWeight /
                          (1 - loadedRecipe.bakingLossRate / 100)) *
                        portionScale
                      ).toFixed(0)}
                      {t("erp_521")}
                      {(loadedRecipe.totalWeight * portionScale).toFixed(0)}g。
                    </p>
                    <p className="leading-relaxed text-[9px] text-orange-700/80">
                      {t("erp_522")}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveLabelConfig}
                  disabled={savingLabelConfig}
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{t("erp_523")}</span>
                </button>

                {/* Layout Replication Panel */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3 mt-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 text-gray-700 pb-1.5 border-b border-dashed border-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-800">
                      {t("erp_524")}
                    </span>
                  </div>

                  {/* Clipboard Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLayoutToClipboard}
                      className="py-1.5 px-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors active:scale-95"
                    >
                      {t("erp_525")}
                    </button>
                    <button
                      type="button"
                      onClick={handlePasteLayoutFromClipboard}
                      className="py-1.5 px-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors active:scale-95"
                    >
                      {t("erp_526")}
                    </button>
                  </div>

                  {/* Sync to Other Recipe */}
                  <div className="space-y-1.5 pt-1.5 border-t border-dashed border-slate-200">
                    <label className="text-[8.5px] font-black text-gray-500 block">
                      {t("erp_527")}
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        className="flex-1 px-2.5 py-1.5 bg-white border border-border rounded-xl font-bold text-[11px] outline-none"
                        value={targetRecipeIdToCopyTo}
                        onChange={(e) =>
                          setTargetRecipeIdToCopyTo(e.target.value)
                        }
                      >
                        <option value="">{t("erp_528")}</option>
                        {recipes
                          .filter((r) => r.id !== selectedRecipeId)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleCopyLayoutToRecipe}
                        disabled={
                          copyingLayoutToRecipe || !targetRecipeIdToCopyTo
                        }
                        className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:cursor-not-allowed"
                      >
                        {copyingLayoutToRecipe ? t("erp_529") : t("erp_530")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Dual Language Selection */}
          <div className="space-y-3 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
            <div className="flex items-center gap-1.5 text-indigo-700">
              <Settings2 className="w-4 h-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                {t("erp_531")}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  checked={enableDualLanguage}
                  onChange={(e) => setEnableDualLanguage(e.target.checked)}
                />
                {t("erp_532")}
              </label>

              {enableDualLanguage && (
                <select
                  className="flex-1 px-3 py-1.5 bg-white border border-border rounded-xl font-bold text-xs outline-none"
                  value={printLanguage}
                  onChange={(e) => setPrintLanguage(e.target.value)}
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">{t("erp_533")}</p>
          </div>

          {/* Section: Size & Dimension Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Layers className="w-4 h-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                {t("erp_534")}
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: "100x100",
                  label: "100x100 mm",
                  desc: t("erp_535"),
                },
                {
                  id: "80x80",
                  label: "80x80 mm",
                  desc: t("erp_536"),
                },
                {
                  id: "100x150",
                  label: "100x150 mm",
                  desc: t("erp_537"),
                },
                {
                  id: "70x50",
                  label: "70x50 mm",
                  desc: t("erp_538"),
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLabelSize(opt.id as LabelSize)}
                  className={cn(
                    "p-3 border rounded-xl text-left transition-all active:scale-98",
                    labelSize === opt.id
                      ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                      : "border-border hover:bg-muted text-gray-700",
                  )}
                >
                  <p className="text-xs font-black">{opt.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 font-medium leading-normal">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Continuous Spacing Settings */}
          <div className="space-y-3 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Settings2 className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-wider">
                  {t("erp_539")}
                </h4>
              </div>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-md">
                {labelGap === 0 ? t("erp_540") : `間距: ${labelGap} mm`}
              </span>
            </div>

            {/* Gap Slider & Quick Selections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-600">
                  {t("erp_541")}
                </label>
                <span className="text-[10px] font-mono font-black text-slate-500">
                  {labelGap}mm
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  value={labelGap}
                  onChange={(e) => setLabelGap(parseFloat(e.target.value))}
                />
              </div>

              {/* Quick Choice Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  {
                    value: 0,
                    label: t("erp_542"),
                  },
                  {
                    value: 2,
                    label: "2mm",
                  },
                  {
                    value: 3,
                    label: t("erp_543"),
                  },
                  {
                    value: 4,
                    label: "4mm",
                  },
                ].map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setLabelGap(pill.value)}
                    className={cn(
                      "px-2 py-1 text-[9.5px] font-black rounded-lg border transition-all cursor-pointer",
                      labelGap === pill.value
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-white border-border text-gray-600 hover:bg-slate-50",
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Corner Radius Settings */}
            <div className="space-y-2 pt-2.5 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-600">
                  {t("erp_544")}
                </label>
                <span className="text-[10px] font-mono font-black text-slate-500">
                  {labelBorderRadius}mm
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  value={labelBorderRadius}
                  onChange={(e) =>
                    setLabelBorderRadius(parseFloat(e.target.value))
                  }
                />
              </div>

              {/* Quick Choice Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  {
                    value: 0,
                    label: t("erp_545"),
                  },
                  {
                    value: 1.5,
                    label: "1.5mm",
                  },
                  {
                    value: 3,
                    label: "3mm",
                  },
                  {
                    value: 4,
                    label: t("erp_546"),
                  },
                  {
                    value: 6,
                    label: "6mm",
                  },
                ].map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setLabelBorderRadius(pill.value)}
                    className={cn(
                      "px-2 py-1 text-[9.5px] font-black rounded-lg border transition-all cursor-pointer",
                      labelBorderRadius === pill.value
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-white border-border text-gray-600 hover:bg-slate-50",
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Gap Alignment Settings */}
            <div className="space-y-2 pt-2.5 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-600">
                  {t("erp_547")}
                </label>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-black rounded font-mono uppercase">
                  {gapAlignment === "top"
                    ? t("erp_548")
                    : gapAlignment === "center"
                      ? t("erp_549")
                      : t("erp_550")}
                </span>
              </div>
              <p className="text-[8.5px] text-muted-foreground font-semibold leading-normal">
                {t("erp_551")}
              </p>
              <div className="grid grid-cols-3 gap-1 bg-white border border-border p-1 rounded-xl">
                {[
                  {
                    id: "bottom",
                    label: t("erp_552"),
                    desc: t("erp_553"),
                  },
                  {
                    id: "center",
                    label: t("erp_554"),
                    desc: t("erp_555"),
                  },
                  {
                    id: "top",
                    label: t("erp_556"),
                    desc: t("erp_557"),
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setGapAlignment(t.id as any)}
                    className={cn(
                      "py-1 px-1 text-[9.5px] font-black rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5",
                      gapAlignment === t.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                    )}
                  >
                    <span>{t.label}</span>
                    <span className="text-[7.5px] font-semibold opacity-80 leading-none">
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              {/* Include Gap in Print */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeGapInPrint}
                  onChange={(e) => setIncludeGapInPrint(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary rounded border-border focus:ring-primary/20 shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10.5px] font-bold text-gray-700 block leading-tight">
                    {t("erp_558")}
                  </span>
                  <span className="text-[8.5px] text-muted-foreground font-semibold leading-normal block mt-0.5">
                    {t("erp_559")}
                  </span>
                </div>
              </label>

              {/* Toggle simulated preview */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={previewContinuous}
                  onChange={(e) => setPreviewContinuous(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary rounded border-border focus:ring-primary/20 shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10.5px] font-bold text-gray-700 block leading-tight">
                    {t("erp_560")}
                  </span>
                  <span className="text-[8.5px] text-muted-foreground font-semibold leading-normal block mt-0.5">
                    {t("erp_561")}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section: Custom Drag-and-Drop Layout Mode Selector */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 rounded-2xl p-4 space-y-3 shadow-sm text-black">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wide">
                    {t("erp_562")}
                  </h4>
                  <p className="text-[9.5px] text-indigo-700/80 font-medium">
                    {t("erp_563")}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCustomLayout}
                  onChange={(e) => setUseCustomLayout(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            {useCustomLayout && (
              <div className="text-[9px] text-indigo-800 leading-relaxed font-semibold bg-white/70 rounded-xl p-2.5 border border-indigo-100 flex flex-col gap-1">
                <span>{t("erp_564")}</span>
                <span>
                  {t("erp_565")}
                  <span className="font-black text-indigo-700">
                    {t("erp_566")}
                  </span>
                  {t("erp_567")}
                </span>
                <span>
                  {t("erp_568")}
                  <span className="font-black text-indigo-700">
                    {t("erp_569")}
                  </span>
                  {t("erp_570")}
                </span>
                <span>
                  {t("erp_571")}
                  <span className="font-black text-indigo-700">
                    {t("erp_572")}
                  </span>
                  {t("erp_573")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setGroupLayouts(
                      DEFAULT_LAYOUTS[labelSize] || DEFAULT_LAYOUTS["100x100"],
                    );
                  }}
                  className="mt-2.5 w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black tracking-wider transition-colors border border-indigo-200 cursor-pointer"
                >
                  {t("erp_574")}
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Accordion Groups A to E */}
          <div className="space-y-3">
            {/* GROUP A: 覆熱指引 */}
            <div
              className={cn(
                "border rounded-2xl overflow-hidden bg-white shadow-sm transition-all",
                activeAccordion === "A"
                  ? "border-primary/40 ring-1 ring-primary/10"
                  : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveAccordion(activeAccordion === "A" ? null : "A")
                }
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-500 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                    A
                  </span>
                  <div className="text-left">
                    <span className="text-[11px] font-black text-gray-800 block">
                      {t("erp_575")}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold">
                      {t("erp_576")}
                    </span>
                  </div>
                </div>
                {activeAccordion === "A" ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {activeAccordion === "A" && (
                <div className="p-4 border-t border-border space-y-4 animate-in fade-in duration-200">
                  {/* Font Scale Slider */}
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-700 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-orange-600" />
                        {t("erp_577")}
                      </span>
                      <span className="text-[10px] font-bold text-orange-600 font-mono bg-orange-50 px-1.5 py-0.5 rounded-md">
                        {Math.round(groupFontScales.A * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.0"
                      step="0.05"
                      value={groupFontScales.A}
                      onChange={(e) =>
                        updateGroupFontScale("A", parseFloat(e.target.value))
                      }
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer font-black text-[10.5px] text-gray-700">
                      <input
                        type="checkbox"
                        checked={showReheating}
                        onChange={(e) => setShowReheating(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded border-border"
                      />
                      <span>{t("erp_578")}</span>
                    </label>
                  </div>

                  {showReheating && (
                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[9.5px] font-bold text-gray-600">
                          {t("erp_579")}
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/10"
                          value={reheatingMainTitle}
                          onChange={(e) =>
                            setReheatingMainTitle(e.target.value)
                          }
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8.5px] font-bold text-gray-600">
                            {t("erp_580")}
                          </label>
                          <input
                            type="text"
                            className="w-full px-2 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/10"
                            value={airFryerTitle}
                            onChange={(e) => setAirFryerTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8.5px] font-bold text-gray-600">
                            {t("erp_581")}
                          </label>
                          <input
                            type="text"
                            className="w-full px-2 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/10"
                            value={ovenTitle}
                            onChange={(e) => setOvenTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8.5px] font-bold text-gray-600">
                            {t("erp_582")}
                          </label>
                          <input
                            type="text"
                            className="w-full px-2 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/10"
                            value={panTitle}
                            onChange={(e) => setPanTitle(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">
                          {t("erp_583")}
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              state: showAirFryer,
                              setter: setShowAirFryer,
                              label: airFryerTitle || t("erp_460"),
                            },
                            {
                              state: showOven,
                              setter: setShowOven,
                              label: ovenTitle || t("erp_461"),
                            },
                            {
                              state: showPan,
                              setter: setShowPan,
                              label: panTitle || t("erp_462"),
                            },
                          ].map((sub, idx) => (
                            <label
                              key={idx}
                              className="flex items-center gap-1.5 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={sub.state}
                                onChange={(e) => sub.setter(e.target.checked)}
                                className="w-3.5 h-3.5 accent-primary rounded border-border focus:ring-primary/20 cursor-pointer"
                              />
                              <span className="text-[10px] font-bold text-gray-700 truncate">
                                {sub.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {showAirFryer && (
                        <div className="space-y-1 animate-in fade-in duration-150">
                          <label className="text-[9px] font-bold text-gray-500">
                            {airFryerTitle}
                            {t("erp_584")}
                          </label>
                          <textarea
                            rows={2}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                            value={airFryerSteps}
                            onChange={(e) => setAirFryerSteps(e.target.value)}
                          />
                        </div>
                      )}

                      {showOven && (
                        <div className="space-y-1 animate-in fade-in duration-150">
                          <label className="text-[9px] font-bold text-gray-500">
                            {ovenTitle}
                            {t("erp_584")}
                          </label>
                          <textarea
                            rows={2}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                            value={ovenSteps}
                            onChange={(e) => setOvenSteps(e.target.value)}
                          />
                        </div>
                      )}

                      {showPan && (
                        <div className="space-y-1 animate-in fade-in duration-150">
                          <label className="text-[9px] font-bold text-gray-500">
                            {panTitle}
                            {t("erp_584")}
                          </label>
                          <textarea
                            rows={2}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                            value={panSteps}
                            onChange={(e) => setPanSteps(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2 mt-2">
                        <span className="text-[9px] font-black text-gray-600 uppercase block mb-1">
                          {t("erp_585")}
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-gray-500 block">
                              {t("erp_586")}
                              {reheatingMainTitleSize}pt)
                            </label>
                            <input
                              type="range"
                              min="5"
                              max="12"
                              step="0.1"
                              value={reheatingMainTitleSize}
                              onChange={(e) =>
                                setReheatingMainTitleSize(
                                  Number(e.target.value),
                                )
                              }
                              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-gray-500 block">
                              {t("erp_587")}
                              {reheatingSubTitleSize}pt)
                            </label>
                            <input
                              type="range"
                              min="5"
                              max="11"
                              step="0.1"
                              value={reheatingSubTitleSize}
                              onChange={(e) =>
                                setReheatingSubTitleSize(Number(e.target.value))
                              }
                              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-gray-500 block">
                              {t("erp_588")}
                              {reheatingContentSize}pt)
                            </label>
                            <input
                              type="range"
                              min="4.5"
                              max="10"
                              step="0.1"
                              value={reheatingContentSize}
                              onChange={(e) =>
                                setReheatingContentSize(Number(e.target.value))
                              }
                              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GROUP B: 品牌與品名 */}
            <div
              className={cn(
                "border rounded-2xl overflow-hidden bg-white shadow-sm transition-all",
                activeAccordion === "B"
                  ? "border-primary/40 ring-1 ring-primary/10"
                  : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveAccordion(activeAccordion === "B" ? null : "B")
                }
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-teal-500 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                    B
                  </span>
                  <div className="text-left">
                    <span className="text-[11px] font-black text-gray-800 block">
                      {t("erp_589")}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold">
                      {t("erp_590")}
                    </span>
                  </div>
                </div>
                {activeAccordion === "B" ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {activeAccordion === "B" && (
                <div className="p-4 border-t border-border space-y-4 animate-in fade-in duration-200">
                  {/* Font Scale Slider */}
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-700 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-teal-600" />
                        {t("erp_577")}
                      </span>
                      <span className="text-[10px] font-bold text-teal-600 font-mono bg-teal-50 px-1.5 py-0.5 rounded-md">
                        {Math.round(groupFontScales.B * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.0"
                      step="0.05"
                      value={groupFontScales.B}
                      onChange={(e) =>
                        updateGroupFontScale("B", parseFloat(e.target.value))
                      }
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                  </div>
                  {/* Brand Branding Info Box */}
                  <div className="bg-slate-50/50 p-3 border border-border rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 cursor-pointer font-black text-[10.5px] text-gray-700">
                        <input
                          type="checkbox"
                          checked={showBranding}
                          onChange={(e) => setShowBranding(e.target.checked)}
                          className="w-3.5 h-3.5 accent-primary rounded border-border"
                        />
                        <span>{t("erp_591")}</span>
                      </label>
                    </div>

                    {showBranding && (
                      <div className="space-y-3.5 animate-in fade-in duration-150">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-gray-600">
                              {t("erp_592")}
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-1.5 bg-white border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20"
                              value={brandNameZh}
                              onChange={(e) => setBrandNameZh(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-gray-600">
                              {t("erp_593")}
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-1.5 bg-white border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20"
                              value={brandNameEn}
                              onChange={(e) => setBrandNameEn(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Logo Source Type Selection */}
                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                            {t("erp_594")}
                          </span>
                          <div className="grid grid-cols-3 gap-1 bg-white border border-border p-1 rounded-xl">
                            {[
                              {
                                id: "icon",
                                label: t("erp_595"),
                              },
                              {
                                id: "upload",
                                label: t("erp_596"),
                              },
                              {
                                id: "text",
                                label: t("erp_597"),
                              },
                            ].map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setLogoType(t.id as any)}
                                className={cn(
                                  "py-1 text-[9.5px] font-black rounded-lg transition-all cursor-pointer",
                                  logoType === t.id
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                                )}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Logo Source Type Options Editor */}
                        {logoType === "icon" && (
                          <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                            <span className="text-[9px] font-bold text-slate-400 block mb-1">
                              {t("erp_598")}
                            </span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                {
                                  name: "ChefHat",
                                  label: t("erp_599"),
                                  icon: ChefHat,
                                },
                                {
                                  name: "Utensils",
                                  label: t("erp_600"),
                                  icon: Utensils,
                                },
                                {
                                  name: "Flame",
                                  label: t("erp_601"),
                                  icon: Flame,
                                },
                                {
                                  name: "Award",
                                  label: t("erp_602"),
                                  icon: Award,
                                },
                                {
                                  name: "Sparkles",
                                  label: t("erp_603"),
                                  icon: Sparkles,
                                },
                                {
                                  name: "Layers",
                                  label: t("erp_604"),
                                  icon: Layers,
                                },
                              ].map((item) => {
                                const Icon = item.icon;
                                return (
                                  <button
                                    key={item.name}
                                    type="button"
                                    onClick={() =>
                                      setSelectedIconName(item.name)
                                    }
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[9.5px] font-bold transition-all cursor-pointer justify-center",
                                      selectedIconName === item.name
                                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                                        : "border-border bg-white text-gray-500 hover:bg-slate-50",
                                    )}
                                  >
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">
                                      {item.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {logoType === "upload" && (
                          <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                            <span className="text-[9px] font-bold text-slate-400 block">
                              {t("erp_605")}
                            </span>
                            <div className="flex items-center gap-3 bg-white p-2.5 border border-border rounded-xl">
                              <label className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-lg text-[9px] font-black text-gray-600 transition-all cursor-pointer relative">
                                {t("erp_606")}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        if (event.target?.result) {
                                          setUploadedLogo(
                                            event.target.result as string,
                                          );
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                              <div className="flex-1 min-w-0">
                                {uploadedLogo ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 border border-border rounded overflow-hidden shrink-0 flex items-center justify-center bg-slate-50 shadow-inner">
                                      <img
                                        src={uploadedLogo}
                                        className="w-full h-full object-contain mix-blend-multiply"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[9px] text-emerald-600 font-extrabold truncate">
                                        {t("erp_607")}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => setUploadedLogo("")}
                                        className="text-[9px] text-red-500 font-bold hover:underline cursor-pointer"
                                      >
                                        {t("erp_608")}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-gray-400 font-semibold block leading-tight font-sans">
                                    {t("erp_609")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {logoType === "text" && (
                          <div className="bg-white p-2.5 border border-border rounded-xl text-[9px] text-gray-500 leading-normal font-semibold animate-in fade-in duration-200">
                            {t("erp_610")}
                            {brandNameZh
                              ? brandNameZh.substring(0, 2)
                              : t("erp_505")}
                            {t("erp_611")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Basic Info Names */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-600">
                        {t("erp_612")}
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                        value={productZh}
                        onChange={(e) => setProductZh(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-600">
                        {t("erp_613")}
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                        value={productEn}
                        onChange={(e) => setProductEn(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* GROUP F: 成分與警告 */}
            <div
              className={cn(
                "border rounded-2xl overflow-hidden bg-white shadow-sm transition-all",
                activeAccordion === "F"
                  ? "border-primary/40 ring-1 ring-primary/10"
                  : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveAccordion(activeAccordion === "F" ? null : "F")
                }
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-amber-500 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                    F
                  </span>
                  <div className="text-left">
                    <span className="text-[11px] font-black text-gray-800 block">
                      {t("erp_614")}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold">
                      {t("erp_615")}
                    </span>
                  </div>
                </div>
                {activeAccordion === "F" ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {activeAccordion === "F" && (
                <div className="p-4 border-t border-border space-y-4 animate-in fade-in duration-200">
                  {/* Font Scale Slider */}
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-700 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-amber-600" />
                        {t("erp_577")}
                      </span>
                      <span className="text-[10px] font-bold text-amber-600 font-mono bg-amber-50 px-1.5 py-0.5 rounded-md">
                        {Math.round(groupFontScales.F * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.0"
                      step="0.05"
                      value={groupFontScales.F}
                      onChange={(e) =>
                        updateGroupFontScale("F", parseFloat(e.target.value))
                      }
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                  </div>
                  {/* Ingredients List */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer font-black text-[10.5px] text-gray-700">
                      <input
                        type="checkbox"
                        checked={showIngredients}
                        onChange={(e) => setShowIngredients(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded border-border"
                      />
                      <span>{t("erp_616")}</span>
                    </label>
                    {showIngredients && (
                      <div className="space-y-1">
                        <textarea
                          rows={3}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs leading-relaxed"
                          value={ingredientsText}
                          onChange={(e) => setIngredientsText(e.target.value)}
                          placeholder={t("erp_617")}
                        />
                        <div className="text-[9.5px] text-gray-500 font-bold leading-normal bg-amber-50/60 border border-amber-100/60 p-2.5 rounded-xl space-y-1">
                          <div>
                            💡 <b>{t("erp_618")}</b>
                            {t("erp_619")}
                            <code>{t("erp_620")}</code>
                            {t("erp_621")}
                            <code>{t("erp_622")}</code>
                            {t("erp_623")}
                          </div>
                          <div>
                            ✍️ <b>{t("erp_624")}</b>
                            {t("erp_625")}
                            <code>{t("erp_626")}</code>
                            {t("erp_621")}
                            <code>{t("erp_627")}</code>）。
                          </div>
                        </div>
                      </div>
                    )}
                    {showIngredients &&
                      parseIngredientReferences(ingredientsText).length > 0 && (
                        <div className="mt-3 space-y-2 bg-slate-50 p-3 border border-border rounded-xl animate-in fade-in duration-150 text-left">
                          <span className="text-[10px] font-black text-gray-500 block mb-1.5">
                            {t("erp_628")}
                          </span>
                          {parseIngredientReferences(ingredientsText).map(
                            (ref, idx) => {
                              const { t } = useTranslation();
                              const comps = getIngredientComponents(
                                ref.ingredientName,
                              );
                              const isExpanded = !!expandedIngredients[ref.raw];
                              return (
                                <label
                                  key={idx}
                                  className="flex items-center gap-2 cursor-pointer select-none"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isExpanded}
                                    disabled={!comps}
                                    onChange={(e) => {
                                      setExpandedIngredients((prev) => ({
                                        ...prev,
                                        [ref.raw]: e.target.checked,
                                      }));
                                    }}
                                    className="w-3.5 h-3.5 accent-primary rounded border-border cursor-pointer disabled:opacity-50"
                                  />
                                  <span
                                    className={cn(
                                      "text-[10.5px] font-bold text-gray-700",
                                      !comps && "text-gray-400",
                                    )}
                                  >
                                    {t("erp_629")}
                                    {ref.customName
                                      ? `${ref.ingredientName} (${ref.customName})`
                                      : ref.ingredientName}
                                    {comps ? ` [${comps}]` : i18n.t("erp_630")}
                                  </span>
                                </label>
                              );
                            },
                          )}
                        </div>
                      )}
                  </div>

                  {/* Non-ready-to-eat Warning Toggle & Input */}
                  <div className="bg-amber-50/60 p-3 border border-amber-100 rounded-2xl space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-black text-[10.5px] text-amber-900">
                      <input
                        type="checkbox"
                        checked={showNotReadyToEat}
                        onChange={(e) => setShowNotReadyToEat(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-600 rounded border-amber-200"
                      />
                      <span>{t("erp_631")}</span>
                    </label>
                    {showNotReadyToEat && (
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-white border border-amber-200/80 rounded-xl font-bold text-xs text-amber-800 focus:ring-2 focus:ring-amber-500/10 outline-none"
                        value={notReadyToEatText}
                        onChange={(e) => setNotReadyToEatText(e.target.value)}
                      />
                    )}
                  </div>

                  {/* Allergen Warning */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer font-black text-[10.5px] text-rose-700">
                      <input
                        type="checkbox"
                        checked={showAllergens}
                        onChange={(e) => setShowAllergens(e.target.checked)}
                        className="w-3.5 h-3.5 accent-rose-600 rounded border-rose-200"
                      />
                      <span>{t("erp_632")}</span>
                    </label>
                    {showAllergens && (
                      <textarea
                        rows={2}
                        className="w-full px-3 py-1.5 bg-rose-50/40 border border-rose-100 rounded-xl font-bold text-xs text-rose-700"
                        value={allergenWarning}
                        onChange={(e) => setAllergenWarning(e.target.value)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* GROUP C: 商品規格與保存條件 */}
            <div
              className={cn(
                "border rounded-2xl overflow-hidden bg-white shadow-sm transition-all",
                activeAccordion === "C"
                  ? "border-primary/40 ring-1 ring-primary/10"
                  : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveAccordion(activeAccordion === "C" ? null : "C")
                }
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-emerald-500 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                    C
                  </span>
                  <div className="text-left">
                    <span className="text-[11px] font-black text-gray-800 block">
                      {t("erp_633")}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold">
                      {t("erp_634")}
                    </span>
                  </div>
                </div>
                {activeAccordion === "C" ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {activeAccordion === "C" && (
                <div className="p-4 border-t border-border space-y-4 animate-in fade-in duration-200">
                  {/* Font Scale Slider */}
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-700 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                        {t("erp_577")}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {Math.round(groupFontScales.C * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.0"
                      step="0.05"
                      value={groupFontScales.C}
                      onChange={(e) =>
                        updateGroupFontScale("C", parseFloat(e.target.value))
                      }
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>
                  {/* Net Weight & Origin */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer font-black text-[10px] text-gray-700">
                        <input
                          type="checkbox"
                          checked={showNetWeight}
                          onChange={(e) => setShowNetWeight(e.target.checked)}
                          className="w-3.5 h-3.5 accent-primary rounded border-border"
                        />
                        <span>{t("erp_635")}</span>
                      </label>
                      {showNetWeight && (
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                          value={netWeight}
                          onChange={(e) => setNetWeight(e.target.value)}
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer font-black text-[10px] text-gray-700">
                        <input
                          type="checkbox"
                          checked={showOrigin}
                          onChange={(e) => setShowOrigin(e.target.checked)}
                          className="w-3.5 h-3.5 accent-primary rounded border-border"
                        />
                        <span>{t("erp_636")}</span>
                      </label>
                      {showOrigin && (
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                          value={originCountry}
                          onChange={(e) => setOriginCountry(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Merged Preservation & Expiry Conditions setup card */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
                      {t("erp_637")}
                    </span>

                    {/* Storage Condition */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer font-black text-[9.5px] text-gray-600">
                        <input
                          type="checkbox"
                          checked={showStorage}
                          onChange={(e) => setShowStorage(e.target.checked)}
                          className="w-3.5 h-3.5 accent-primary rounded border-border"
                        />
                        <span>{t("erp_638")}</span>
                      </label>
                      {showStorage && (
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 bg-white border border-border rounded-xl font-bold text-xs"
                          value={storageCondition}
                          onChange={(e) => setStorageCondition(e.target.value)}
                        />
                      )}
                    </div>

                    {/* Expiry Date Toggles and Inputs */}
                    <div className="space-y-2.5 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer font-black text-[9.5px] text-gray-600">
                        <input
                          type="checkbox"
                          checked={showExpiry}
                          onChange={(e) => setShowExpiry(e.target.checked)}
                          className="w-3.5 h-3.5 accent-primary rounded border-border"
                        />
                        <span>{t("erp_639")}</span>
                      </label>

                      {showExpiry && (
                        <div className="space-y-3.5 p-3 bg-white border border-slate-100 rounded-xl animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[9.5px] font-bold text-gray-500">
                              {t("erp_640")}
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setExpiryOption("printed")}
                                className={cn(
                                  "px-2 py-0.5 rounded text-[8.5px] font-black tracking-wide cursor-pointer",
                                  expiryOption === "printed"
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                )}
                              >
                                {t("erp_641")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpiryOption("date")}
                                className={cn(
                                  "px-2 py-0.5 rounded text-[8.5px] font-black tracking-wide cursor-pointer",
                                  expiryOption === "date"
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                )}
                              >
                                {t("erp_642")}
                              </button>
                            </div>
                          </div>

                          {expiryOption === "date" ? (
                            <div className="space-y-1 animate-in fade-in duration-150">
                              <label className="text-[8.5px] font-bold text-gray-500">
                                {t("erp_643")}
                              </label>
                              <input
                                type="text"
                                className="w-full px-2.5 py-1 bg-slate-50 border border-border rounded-lg font-mono font-bold text-xs"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                              />
                            </div>
                          ) : (
                            <p className="text-[8.5px] text-muted-foreground font-semibold leading-relaxed">
                              {t("erp_644")}
                            </p>
                          )}

                          <div className="space-y-1 pt-1 border-t border-slate-100">
                            <label className="text-[8.5px] font-bold text-gray-500">
                              {t("erp_645")}
                            </label>
                            <input
                              type="text"
                              className="w-full px-2.5 py-1 bg-slate-50 border border-border rounded-lg font-bold text-xs"
                              value={shelfLife}
                              onChange={(e) => setShelfLife(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* GROUP D: 廠商資訊 */}
            <div
              className={cn(
                "border rounded-2xl overflow-hidden bg-white shadow-sm transition-all",
                activeAccordion === "D"
                  ? "border-primary/40 ring-1 ring-primary/10"
                  : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveAccordion(activeAccordion === "D" ? null : "D")
                }
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-sky-500 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                    D
                  </span>
                  <div className="text-left">
                    <span className="text-[11px] font-black text-gray-800 block">
                      {t("erp_646")}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold">
                      {t("erp_647")}
                    </span>
                  </div>
                </div>
                {activeAccordion === "D" ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {activeAccordion === "D" && (
                <div className="p-4 border-t border-border space-y-4 animate-in fade-in duration-200">
                  {/* Font Scale Slider */}
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-700 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-sky-600" />
                        {t("erp_577")}
                      </span>
                      <span className="text-[10px] font-bold text-sky-600 font-mono bg-sky-50 px-1.5 py-0.5 rounded-md">
                        {Math.round(groupFontScales.D * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.0"
                      step="0.05"
                      value={groupFontScales.D}
                      onChange={(e) =>
                        updateGroupFontScale("D", parseFloat(e.target.value))
                      }
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                    />
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer font-black text-[10.5px] text-gray-700">
                      <input
                        type="checkbox"
                        checked={showResponsible}
                        onChange={(e) => setShowResponsible(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded border-border"
                      />
                      <span>{t("erp_648")}</span>
                    </label>
                  </div>

                  {showResponsible && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      <div className="space-y-1">
                        <label className="text-[9.5px] font-bold text-gray-600">
                          {t("erp_649")}
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-bold text-gray-600">
                            {t("erp_262")}
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9.5px] font-bold text-gray-600">
                          {t("erp_650")}
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs"
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                        />
                      </div>

                      <div className="bg-slate-50/60 p-3 border border-slate-200/50 rounded-2xl space-y-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                          {t("erp_651")}
                        </span>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                          {[
                            {
                              state: showAddress,
                              setter: setShowAddress,
                              label: t("erp_652"),
                            },
                            {
                              state: showPhone,
                              setter: setShowPhone,
                              label: t("erp_653"),
                            },
                            {
                              state: showOrigin,
                              setter: setShowOrigin,
                              label: t("erp_654"),
                            },
                            {
                              state: showManufacturer,
                              setter: setShowManufacturer,
                              label: t("erp_655"),
                            },
                          ].map((sub, idx) => (
                            <label
                              key={idx}
                              className="flex items-center gap-1.5 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={sub.state}
                                onChange={(e) => sub.setter(e.target.checked)}
                                className="w-3.5 h-3.5 accent-primary rounded border-border focus:ring-primary/20 cursor-pointer"
                              />
                              <span className="text-[10.5px] font-bold text-gray-700">
                                {sub.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Barcode settings moved to Group D */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-[10px] text-gray-700">
                      <input
                        type="checkbox"
                        checked={showBarcode}
                        onChange={(e) => setShowBarcode(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded border-border"
                      />
                      <span>{t("erp_656")}</span>
                    </label>
                    {showBarcode && (
                      <div className="space-y-3 animate-in fade-in duration-150">
                        <div className="space-y-1">
                          <span className="text-[8.5px] font-bold text-gray-500 block">
                            {t("erp_657")}
                          </span>
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs font-mono"
                            value={barcodeText}
                            onChange={(e) => setBarcodeText(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8.5px] font-bold text-gray-500 block">
                            {t("erp_658")}
                          </span>
                          <textarea
                            className="w-full px-3 py-1.5 bg-slate-50 border border-border rounded-xl font-bold text-xs resize-none font-sans"
                            rows={2}
                            placeholder={t("erp_444")}
                            value={barcodeExplanation}
                            onChange={(e) =>
                              setBarcodeExplanation(e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* GROUP E: 營養標示 */}
            <div
              className={cn(
                "border rounded-2xl overflow-hidden bg-white shadow-sm transition-all",
                activeAccordion === "E"
                  ? "border-primary/40 ring-1 ring-primary/10"
                  : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveAccordion(activeAccordion === "E" ? null : "E")
                }
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-purple-500 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                    E
                  </span>
                  <div className="text-left">
                    <span className="text-[11px] font-black text-gray-800 block">
                      {t("erp_97")}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold">
                      {t("erp_659")}
                    </span>
                  </div>
                </div>
                {activeAccordion === "E" ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {activeAccordion === "E" && (
                <div className="p-4 border-t border-border space-y-4 animate-in fade-in duration-200">
                  {/* Font Scale Slider */}
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-700 flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-purple-600" />
                        {t("erp_577")}
                      </span>
                      <span className="text-[10px] font-bold text-purple-600 font-mono bg-purple-50 px-1.5 py-0.5 rounded-md">
                        {Math.round(groupFontScales.E * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.0"
                      step="0.05"
                      value={groupFontScales.E}
                      onChange={(e) =>
                        updateGroupFontScale("E", parseFloat(e.target.value))
                      }
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer font-black text-[10.5px] text-gray-700">
                      <input
                        type="checkbox"
                        checked={showNutrition}
                        onChange={(e) => setShowNutrition(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded border-border"
                      />
                      <span>{t("erp_660")}</span>
                    </label>
                  </div>

                  {showNutrition && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Servings Info */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 border border-slate-200/50 rounded-2xl">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-gray-500">
                            {t("erp_661")}
                          </span>
                          <input
                            type="number"
                            className="w-full px-2.5 py-1.5 bg-white border border-border rounded-xl font-mono text-xs text-right font-bold"
                            value={portionSize}
                            onChange={(e) => setPortionSize(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-gray-500">
                            {t("erp_662")}
                          </span>
                          <input
                            type="number"
                            step="any"
                            className="w-full px-2.5 py-1.5 bg-white border border-border rounded-xl font-mono text-xs text-right font-bold"
                            value={portionsPerPkg}
                            onChange={(e) => setPortionsPerPkg(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Granular decimals and length selectors */}
                      <div className="space-y-2">
                        <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                          {t("erp_663")}
                        </span>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {[
                            {
                              key: "calories",
                              label: t("erp_664"),
                              val: calories,
                              setter: setCalories,
                            },
                            {
                              key: "protein",
                              label: t("erp_665"),
                              val: protein,
                              setter: setProtein,
                            },
                            {
                              key: "fat",
                              label: t("erp_666"),
                              val: fat,
                              setter: setFat,
                            },
                            {
                              key: "saturatedFat",
                              label: t("erp_667"),
                              val: saturatedFat,
                              setter: setSaturatedFat,
                            },
                            {
                              key: "transFat",
                              label: t("erp_668"),
                              val: transFat,
                              setter: setTransFat,
                            },
                            {
                              key: "carbs",
                              label: t("erp_669"),
                              val: carbs,
                              setter: setCarbs,
                            },
                            {
                              key: "sugar",
                              label: t("erp_670"),
                              val: sugar,
                              setter: setSugar,
                            },
                            {
                              key: "sodium",
                              label: t("erp_671"),
                              val: sodium,
                              setter: setSodium,
                            },
                          ].map((nut) => {
                            const { t } = useTranslation();
                            const cfg = nutritionConfigs[nut.key] || {
                              decimals: 1,
                              maxLength: 8,
                            };
                            return (
                              <div
                                key={nut.key}
                                className="p-2 bg-slate-50/50 border border-slate-200/50 rounded-xl space-y-1"
                              >
                                <div className="flex justify-between items-center text-[9px] font-bold text-gray-700">
                                  <span>{nut.label}</span>
                                </div>
                                <div className="grid grid-cols-12 gap-1 items-center">
                                  <div className="col-span-5">
                                    <input
                                      type="number"
                                      className="w-full px-2 py-1 bg-white border border-border rounded-lg font-mono text-[10.5px] text-right font-bold"
                                      value={nut.val}
                                      onChange={(e) =>
                                        nut.setter(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="col-span-4">
                                    <select
                                      className="w-full px-1 py-1 bg-white border border-border rounded-lg text-[9px] font-bold text-gray-700 outline-none"
                                      value={cfg.decimals}
                                      onChange={(e) =>
                                        updateNutritionConfig(nut.key, {
                                          decimals: parseInt(e.target.value),
                                        })
                                      }
                                    >
                                      <option value="-1">{t("erp_672")}</option>
                                      <option value="0">{t("erp_673")}</option>
                                      <option value="1">{t("erp_674")}</option>
                                      <option value="2">{t("erp_675")}</option>
                                      <option value="3">{t("erp_676")}</option>
                                    </select>
                                  </div>
                                  <div className="col-span-3 flex items-center gap-0.5">
                                    <span className="text-[7.5px] text-slate-400 font-bold">
                                      {t("erp_677")}
                                    </span>
                                    <input
                                      type="number"
                                      min="1"
                                      max="20"
                                      className="w-full px-1 py-0.5 bg-white border border-border rounded text-[9px] font-mono text-center font-bold text-gray-700"
                                      value={cfg.maxLength}
                                      onChange={(e) =>
                                        updateNutritionConfig(nut.key, {
                                          maxLength:
                                            parseInt(e.target.value) || 8,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GROUP L: 自訂分隔線段 */}
            <div
              className={cn(
                "border rounded-2xl overflow-hidden bg-white shadow-sm transition-all",
                activeAccordion === "L"
                  ? "border-primary/40 ring-1 ring-primary/10"
                  : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveAccordion(activeAccordion === "L" ? null : "L")
                }
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-indigo-500 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                    L
                  </span>
                  <div className="text-left">
                    <span className="text-[11px] font-black text-gray-800 block">
                      {t("erp_678")}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold">
                      {t("erp_679")}
                    </span>
                  </div>
                </div>
                {activeAccordion === "L" ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {activeAccordion === "L" && (
                <div className="p-4 border-t border-border space-y-4 animate-in fade-in duration-200">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t("erp_680")}</span>
                    </button>
                    {customLines.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const { t } = useTranslation();
                          if (confirm(t("erp_681"))) {
                            setCustomLines([]);
                          }
                        }}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t("erp_682")}</span>
                      </button>
                    )}
                  </div>

                  {customLines.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs">
                      {t("erp_683")}
                      <br />
                      {t("erp_684")}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {customLines.map((line, index) => (
                        <div
                          key={line.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative group/item"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-700 font-sans">
                              {t("erp_685")}
                              {index + 1} (
                              {line.type === "horizontal"
                                ? i18n.t("erp_686")
                                : i18n.t("erp_687")}
                              )
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(line.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Direction toggle */}
                            <div className="space-y-1">
                              <span className="text-[8.5px] font-bold text-gray-500 block">
                                {t("erp_688")}
                              </span>
                              <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white p-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateLine(line.id, {
                                      type: "horizontal",
                                    })
                                  }
                                  className={cn(
                                    "flex-1 py-1 text-[9px] font-black rounded cursor-pointer",
                                    line.type === "horizontal"
                                      ? "bg-slate-900 text-white"
                                      : "text-slate-600 hover:bg-slate-50",
                                  )}
                                >
                                  {t("erp_686")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateLine(line.id, {
                                      type: "vertical",
                                    })
                                  }
                                  className={cn(
                                    "flex-1 py-1 text-[9px] font-black rounded cursor-pointer",
                                    line.type === "vertical"
                                      ? "bg-slate-900 text-white"
                                      : "text-slate-600 hover:bg-slate-50",
                                  )}
                                >
                                  {t("erp_687")}
                                </button>
                              </div>
                            </div>

                            {/* Style dropdown */}
                            <div className="space-y-1">
                              <span className="text-[8.5px] font-bold text-gray-500 block">
                                {t("erp_689")}
                              </span>
                              <select
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9.5px] font-bold text-slate-700 outline-none"
                                value={line.style}
                                onChange={(e) =>
                                  handleUpdateLine(line.id, {
                                    style: e.target.value as any,
                                  })
                                }
                              >
                                <option value="solid">{t("erp_690")}</option>
                                <option value="dashed">{t("erp_691")}</option>
                                <option value="dotted">{t("erp_692")}</option>
                                <option value="double">{t("erp_693")}</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Thickness */}
                            <div className="space-y-1">
                              <span className="text-[8.5px] font-bold text-gray-500 block">
                                {t("erp_694")}
                              </span>
                              <select
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9.5px] font-bold text-slate-700 outline-none"
                                value={line.thickness}
                                onChange={(e) =>
                                  handleUpdateLine(line.id, {
                                    thickness: e.target.value,
                                  })
                                }
                              >
                                <option value="0.5pt">0.5 pt</option>
                                <option value="1pt">{t("erp_695")}</option>
                                <option value="1.5pt">1.5 pt</option>
                                <option value="2pt">2.0 pt</option>
                                <option value="3pt">3.0 pt</option>
                              </select>
                            </div>

                            {/* Length */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[8.5px] font-bold text-gray-500 block">
                                  {t("erp_696")}
                                </span>
                                <span className="text-[8.5px] font-mono font-bold text-slate-600">
                                  {line.length}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="2"
                                max="100"
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                value={line.length}
                                onChange={(e) =>
                                  handleUpdateLine(line.id, {
                                    length: parseInt(e.target.value) || 50,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Position X (Left) */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[8.5px] font-bold text-gray-500 block">
                                  {t("erp_697")}
                                </span>
                                <span className="text-[8.5px] font-mono font-bold text-slate-600">
                                  {line.left}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                value={line.left}
                                onChange={(e) =>
                                  handleUpdateLine(line.id, {
                                    left: parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>

                            {/* Position Y (Top) */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[8.5px] font-bold text-gray-500 block">
                                  {t("erp_698")}
                                </span>
                                <span className="text-[8.5px] font-mono font-bold text-slate-600">
                                  {line.top}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                value={line.top}
                                onChange={(e) =>
                                  handleUpdateLine(line.id, {
                                    top: parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>{" "}
        {/* Right Side: Adaptive thermal label preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-start p-8 bg-[#D1D4D9] rounded-3xl min-h-[75vh] relative overflow-hidden border border-border shadow-inner print:bg-transparent print:border-none print:shadow-none print:p-0">
          <div className="absolute top-4 left-6 text-gray-500 font-bold text-[10px] tracking-widest uppercase flex items-center gap-1.5 print:hidden">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {t("erp_699")}
          </div>

          {/* Sizing Container (for media query print sizing) */}
          {(() => {
            const { t } = useTranslation();
            const { w: activeWidth, h: activeHeight } = getLabelDimensions();
            const upperGap =
              gapAlignment === "top"
                ? labelGap
                : gapAlignment === "center"
                  ? labelGap / 2
                  : 0;
            const lowerGap =
              gapAlignment === "bottom"
                ? labelGap
                : gapAlignment === "center"
                  ? labelGap / 2
                  : 0;
            return (
              <div
                className={cn(
                  "w-full flex flex-col items-center justify-start min-h-0 print:overflow-visible print:max-h-none print:py-0 print:pr-0",
                  previewContinuous
                    ? "overflow-y-auto max-h-[62vh] py-8 pr-12 scrollbar-none print:pr-0 print:py-0"
                    : "justify-center py-4",
                )}
              >
                {/* Simulated Continuous Backing Paper Roll Wrapper */}
                <div
                  className={cn(
                    "continuous-backing-paper flex flex-col items-center relative transition-all duration-300",
                    previewContinuous
                      ? "shadow-xl border-x-[1.5px] border-dashed border-[#D2C095] pt-[15mm] pb-[15mm] print:shadow-none print:border-none print:pt-0 print:pb-0"
                      : "pt-0 pb-0",
                  )}
                  style={
                    previewContinuous
                      ? {
                          width: `${activeWidth + 8}mm`,
                          background:
                            "linear-gradient(to right, #F3E6C4 0%, #FAF1D7 8%, #FDF7E7 50%, #FAF1D7 92%, #F3E6C4 100%)",
                        }
                      : {}
                  }
                >
                  {/* Dynamic Scale Ruler (Right Side) - Hidden in Print */}
                  {previewContinuous && (
                    <div className="absolute right-[-45px] top-0 bottom-0 w-[40px] flex flex-col items-start justify-center print:hidden text-slate-500 font-mono select-none">
                      {/* Label Height Indicator */}
                      <div
                        className="absolute flex flex-col items-center justify-center"
                        style={{
                          top: `${35 + upperGap}mm`,
                          height: `${activeHeight}mm`,
                        }}
                      >
                        <div className="w-[1px] bg-slate-400 h-full relative flex items-center justify-center">
                          <div className="absolute top-0 w-2 h-[1px] bg-slate-400"></div>
                          <div className="bg-[#D1D4D9] px-1 py-0.5 text-[8px] font-black text-slate-600 rotate-90 whitespace-nowrap shadow-sm border border-slate-300 rounded">
                            {t("erp_700")}
                            {activeHeight}mm
                          </div>
                          <div className="absolute bottom-0 w-2 h-[1px] bg-slate-400"></div>
                        </div>
                      </div>

                      {/* Upper Label Gap Indicator */}
                      {upperGap > 0 && (
                        <div
                          className="absolute flex flex-col items-center justify-center animate-in fade-in duration-200"
                          style={{
                            top: `35mm`,
                            height: `${upperGap}mm`,
                          }}
                        >
                          <div className="w-[1px] bg-red-400 h-full relative flex items-center justify-center">
                            <div className="absolute top-0 w-2 h-[1px] bg-red-400"></div>
                            <div className="bg-red-50 text-red-600 px-1 py-0.5 text-[7px] font-black absolute left-2 whitespace-nowrap shadow-sm border border-red-200 rounded">
                              {t("erp_701")}
                              {upperGap.toFixed(1).replace(/\.0$/, "")}mm
                            </div>
                            <div className="absolute bottom-0 w-2 h-[1px] bg-red-400"></div>
                          </div>
                        </div>
                      )}

                      {/* Lower Label Gap Indicator */}
                      {lowerGap > 0 && (
                        <div
                          className="absolute flex flex-col items-center justify-center animate-in fade-in duration-200"
                          style={{
                            top: `${35 + upperGap + activeHeight}mm`,
                            height: `${lowerGap}mm`,
                          }}
                        >
                          <div className="w-[1px] bg-red-400 h-full relative flex items-center justify-center">
                            <div className="absolute top-0 w-2 h-[1px] bg-red-400"></div>
                            <div className="bg-red-50 text-red-600 px-1 py-0.5 text-[7px] font-black absolute left-2 whitespace-nowrap shadow-sm border border-red-200 rounded">
                              {t("erp_701")}
                              {lowerGap.toFixed(1).replace(/\.0$/, "")}mm
                            </div>
                            <div className="absolute bottom-0 w-2 h-[1px] bg-red-400"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 1. Ghost Previous Label at the top */}
                  {previewContinuous && (
                    <div
                      className="opacity-[0.12] border-2 border-black border-dashed rounded-none bg-white flex flex-col justify-between p-2 pointer-events-none select-none shrink-0 print:hidden animate-in fade-in duration-300"
                      style={{
                        width: `${activeWidth}mm`,
                        height: "20mm",
                        marginBottom: `${upperGap}mm`,
                        overflow: "hidden",
                      }}
                    >
                      <div className="w-full border-b border-black pb-1 flex justify-between items-center text-[5.5pt]">
                        <span className="font-bold">PREVIOUS LABEL</span>
                        <span className="font-mono">
                          GAP: {upperGap.toFixed(1).replace(/\.0$/, "")}mm
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. Main Active Label */}
                  <div
                    id="printable-label"
                    style={getLabelStyle()}
                    className={cn(
                      "relative shadow-md print:shadow-none shrink-0 transition-shadow rounded-none overflow-hidden select-none",
                      useCustomLayout && "border-slate-800",
                    )}
                  >
                    {/* Dotted Grid Background Overlay for Drag Alignment - Hidden in Print */}
                    {useCustomLayout && (
                      <div
                        className="absolute inset-0 pointer-events-none print:hidden z-0"
                        style={{
                          backgroundImage:
                            "radial-gradient(#6366f1 0.8px, transparent 0.8px)",
                          backgroundSize: "2% 2%",
                          opacity: 0.15,
                        }}
                      />
                    )}

                    {/* Render Custom Line Segments */}
                    {customLines.map((line) => (
                      <div
                        key={line.id}
                        className={cn(
                          "absolute pointer-events-auto",
                          useCustomLayout
                            ? "hover:bg-indigo-50/20 group/line"
                            : "pointer-events-none",
                        )}
                        style={{
                          left: `${line.left}%`,
                          top: `${line.top}%`,
                          width:
                            line.type === "horizontal"
                              ? `${line.length}%`
                              : `${line.thickness}`,
                          height:
                            line.type === "vertical"
                              ? `${line.length}%`
                              : `${line.thickness}`,
                          borderTop:
                            line.type === "horizontal"
                              ? `${line.thickness} ${line.style} ${line.color}`
                              : "none",
                          borderLeft:
                            line.type === "vertical"
                              ? `${line.thickness} ${line.style} ${line.color}`
                              : "none",
                          zIndex: 15,
                        }}
                      >
                        {/* Drag & Resize controls overlay, hidden in print */}
                        {useCustomLayout && (
                          <>
                            {/* Hover info panel & Delete button */}
                            <div className="absolute top-[-16px] left-0 bg-slate-900 text-white font-mono text-[7px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover/line:opacity-100 transition-opacity z-30 print:hidden flex items-center gap-1 select-none whitespace-nowrap">
                              <span>
                                {t("erp_702")}
                                {line.type === "horizontal" ? "H" : "V"})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLine(line.id)}
                                className="text-red-400 hover:text-red-600 font-bold ml-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                            {/* Drag Trigger Overlay */}
                            <div
                              onMouseDown={(e) =>
                                handleLineDragStart(e, line.id)
                              }
                              className="absolute inset-0 cursor-move print:hidden z-10 bg-transparent"
                              style={{
                                padding: "4px",
                                margin: "-4px",
                              }}
                            />
                            {/* Resize Handle (circle anchor) */}
                            <div
                              onMouseDown={(e) =>
                                handleLineResizeStart(e, line.id)
                              }
                              className={cn(
                                "absolute bg-indigo-600 rounded-full w-2.5 h-2.5 border border-white cursor-pointer z-20 print:hidden shadow-sm hover:scale-125 transition-transform",
                                line.type === "horizontal"
                                  ? "right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
                                  : "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
                              )}
                            />
                          </>
                        )}
                      </div>
                    ))}

                    {/* Drag-and-Resize Active Group Coordinates Overlay Tooltip - Hidden in Print */}
                    {useCustomLayout && (draggingGroup || resizingGroup) && (
                      <div className="absolute top-2 left-2 bg-indigo-900/90 text-white font-mono font-bold text-[7.5px] px-2 py-1 rounded shadow-md z-30 pointer-events-none animate-pulse print:hidden border border-indigo-700">
                        {draggingGroup
                          ? `DRAGGING [Group ${draggingGroup}]`
                          : `RESIZING [Group ${resizingGroup}]`}{" "}
                        : L:{" "}
                        {
                          groupLayouts[draggingGroup || resizingGroup || "A"]
                            .left
                        }
                        % T:{" "}
                        {
                          groupLayouts[draggingGroup || resizingGroup || "A"]
                            .top
                        }
                        % W:{" "}
                        {
                          groupLayouts[draggingGroup || resizingGroup || "A"]
                            .width
                        }
                        % H:{" "}
                        {
                          groupLayouts[draggingGroup || resizingGroup || "A"]
                            .height
                        }
                        %
                      </div>
                    )}

                    {/* RENDER MODE switcher */}
                    {useCustomLayout ? (
                      // ABSOLUTE POSITION DRAG-AND-RESIZE LAYOUT
                      <div className="w-full h-full relative z-10">
                        {/* GROUP B: Brand & Product Name */}
                        <div
                          className={cn(
                            "absolute flex flex-col justify-start overflow-hidden border border-transparent hover:border-slate-300 transition-colors bg-white/95 rounded p-1 group/item",
                            draggingGroup === "B" &&
                              "border-indigo-500 bg-indigo-50/10 z-20 shadow-md",
                            resizingGroup === "B" &&
                              "border-purple-500 bg-purple-50/10 z-20 shadow-md",
                          )}
                          style={{
                            left: `${groupLayouts.B.left}%`,
                            top: `${groupLayouts.B.top}%`,
                            width: `${groupLayouts.B.width}%`,
                            height: `${groupLayouts.B.height}%`,
                          }}
                        >
                          {/* Drag Bar - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDraggingGroup("B");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.B,
                              });
                            }}
                            className="absolute top-0 left-0 right-0 h-4 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 cursor-move flex items-center justify-between px-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7.5px] font-black text-slate-600 select-none"
                          >
                            <span>{t("erp_703")}</span>
                            <span className="font-mono opacity-80">
                              {groupLayouts.B.width}% x {groupLayouts.B.height}%
                            </span>
                          </div>

                          {/* Content Container */}
                          <div className="w-full h-full flex items-center justify-between pt-3 pb-1 min-h-0 text-black px-1">
                            {labelSize !== "70x50" ? (
                              <>
                                {/* Left Side: Brand Logo & Names */}
                                {showBranding && (
                                  <div className="flex items-center gap-1.5 overflow-hidden shrink-0">
                                    <div className="w-5 h-5 shrink-0 flex items-center justify-center border border-black rounded p-0.5 bg-white">
                                      {renderLabelLogo()}
                                    </div>
                                    <div className="flex flex-col text-left min-w-0">
                                      <span
                                        className="font-extrabold tracking-wide leading-none text-black truncate"
                                        style={{
                                          fontSize: `${7.5 * groupFontScales.B}pt`,
                                        }}
                                      >
                                        {brandNameZh}
                                      </span>
                                      <span
                                        className="font-bold tracking-wider text-black uppercase leading-none truncate mt-0.5"
                                        style={{
                                          fontSize: `${4.5 * groupFontScales.B}pt`,
                                        }}
                                      >
                                        {brandNameEn}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Right Side: Product Name */}
                                <div className="text-right flex-1 pl-2 overflow-hidden leading-tight flex flex-col justify-center">
                                  {showProductZh && (
                                    <h1
                                      className="font-black leading-none tracking-tight text-black break-words"
                                      style={{
                                        fontSize: `${10 * groupFontScales.B}pt`,
                                      }}
                                    >
                                      {productZh}
                                    </h1>
                                  )}
                                  {showProductEn && (
                                    <span
                                      className="font-bold uppercase text-black block leading-none truncate mt-0.5"
                                      style={{
                                        fontSize: `${5 * groupFontScales.B}pt`,
                                      }}
                                    >
                                      {productEn}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              // 70x50 mini label side-by-side layout: Product name on left, Brand name on right
                              <div className="w-full flex items-center justify-between min-h-0 leading-none">
                                {showProductZh && (
                                  <span
                                    className="font-black text-black text-left truncate flex-1 pr-1.5"
                                    style={{
                                      fontSize: `${9 * groupFontScales.B}pt`,
                                    }}
                                  >
                                    {productZh}
                                  </span>
                                )}
                                {showBranding && (
                                  <span
                                    className="font-bold text-black text-right shrink-0"
                                    style={{
                                      fontSize: `${5.5 * groupFontScales.B}pt`,
                                    }}
                                  >
                                    {brandNameZh}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Resize Handle - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setResizingGroup("B");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.B,
                              });
                            }}
                            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize flex items-center justify-center bg-slate-200 border-t border-l border-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7px] font-black text-slate-600 rounded-tl"
                          >
                            ↘
                          </div>
                        </div>

                        {/* GROUP F: Ingredients & Warnings & Allergens */}
                        <div
                          className={cn(
                            "absolute flex flex-col justify-start overflow-hidden border border-transparent hover:border-slate-300 transition-colors bg-white/95 rounded p-1 group/item",
                            draggingGroup === "F" &&
                              "border-indigo-500 bg-indigo-50/10 z-20 shadow-md",
                            resizingGroup === "F" &&
                              "border-purple-500 bg-purple-50/10 z-20 shadow-md",
                          )}
                          style={{
                            left: `${groupLayouts.F.left}%`,
                            top: `${groupLayouts.F.top}%`,
                            width: `${groupLayouts.F.width}%`,
                            height: `${groupLayouts.F.height}%`,
                          }}
                        >
                          {/* Drag Bar - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDraggingGroup("F");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.F,
                              });
                            }}
                            className="absolute top-0 left-0 right-0 h-4 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 cursor-move flex items-center justify-between px-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7.5px] font-black text-slate-600 select-none"
                          >
                            <span>{t("erp_704")}</span>
                            <span className="font-mono opacity-80">
                              {groupLayouts.F.width}% x {groupLayouts.F.height}%
                            </span>
                          </div>

                          {/* Content Container */}
                          <div className="w-full h-full flex flex-col justify-between pt-3 pb-1 min-h-0 text-black">
                            {/* Ingredients */}
                            {showIngredients && (
                              <div className="flex-1 flex flex-col justify-start min-h-0 overflow-hidden text-black leading-tight">
                                <span
                                  className="font-black bg-black text-white px-1 py-[0.2mm] rounded-[0.2mm] self-start leading-none shrink-0 mb-0.5"
                                  style={{
                                    fontSize: `${5.8 * groupFontScales.F}pt`,
                                  }}
                                >
                                  {t("erp_705")}
                                </span>
                                <p
                                  className="font-semibold text-justify word-break break-all text-black leading-[1.25] overflow-y-auto"
                                  style={{
                                    fontSize: `${5.8 * groupFontScales.F}pt`,
                                  }}
                                >
                                  {formattedIngredients}
                                </p>
                              </div>
                            )}

                            {/* Warnings Non-Ready-To-Eat & Allergens */}
                            <div className="shrink-0 space-y-0.5 mt-1 leading-none">
                              {showNotReadyToEat && (
                                <div
                                  className="font-black text-center text-white bg-black border border-black py-0.5 rounded-[0.2mm]"
                                  style={{
                                    fontSize: `${5.5 * groupFontScales.F}pt`,
                                  }}
                                >
                                  ⚠️ {notReadyToEatText}
                                </div>
                              )}
                              {showAllergens && allergenWarning && (
                                <div
                                  className="font-black text-black bg-white p-0.5 rounded-[0.2mm] border border-black border-dashed leading-tight"
                                  style={{
                                    fontSize: `${5 * groupFontScales.F}pt`,
                                  }}
                                >
                                  {t("erp_706")}
                                  {allergenWarning}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Resize Handle - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setResizingGroup("F");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.F,
                              });
                            }}
                            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize flex items-center justify-center bg-slate-200 border-t border-l border-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7px] font-black text-slate-600 rounded-tl"
                          >
                            ↘
                          </div>
                        </div>

                        {/* GROUP E: Nutrition facts table */}
                        <div
                          className={cn(
                            "absolute flex flex-col justify-start overflow-hidden border border-transparent hover:border-slate-300 transition-colors bg-white/95 rounded p-1 group/item",
                            draggingGroup === "E" &&
                              "border-indigo-500 bg-indigo-50/10 z-20 shadow-md",
                            resizingGroup === "E" &&
                              "border-purple-500 bg-purple-50/10 z-20 shadow-md",
                          )}
                          style={{
                            left: `${groupLayouts.E.left}%`,
                            top: `${groupLayouts.E.top}%`,
                            width: `${groupLayouts.E.width}%`,
                            height: `${groupLayouts.E.height}%`,
                          }}
                        >
                          {/* Drag Bar - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDraggingGroup("E");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.E,
                              });
                            }}
                            className="absolute top-0 left-0 right-0 h-4 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 cursor-move flex items-center justify-between px-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7.5px] font-black text-slate-600 select-none"
                          >
                            <span>{t("erp_707")}</span>
                            <span className="font-mono opacity-80">
                              {groupLayouts.E.width}% x {groupLayouts.E.height}%
                            </span>
                          </div>

                          {/* Content Container */}
                          <div className="w-full h-full flex flex-col justify-end pt-3 pb-1 min-h-0 text-black">
                            {showNutrition ? (
                              <div className="flex flex-col justify-end text-black shrink-0 border border-black p-0.5 bg-white">
                                <div
                                  className="font-black text-center border-b border-black pb-0.5 tracking-wider leading-none"
                                  style={{
                                    fontSize: `${6.2 * groupFontScales.E}pt`,
                                  }}
                                >
                                  {t("erp_708")}
                                </div>
                                <div
                                  className="font-bold text-left py-0.5 border-b border-black leading-tight"
                                  style={{
                                    fontSize: `${4.8 * groupFontScales.E}pt`,
                                  }}
                                >
                                  {t("erp_709")}
                                  {portionSize}
                                  {t("erp_77")}
                                  <br />
                                  {t("erp_710")}
                                  {portionsPerPkg}
                                  {t("erp_15")}
                                </div>
                                <table
                                  className="w-full text-center border-collapse mt-0.5"
                                  style={{
                                    fontSize: `${5 * groupFontScales.E}pt`,
                                  }}
                                >
                                  <thead>
                                    <tr
                                      className="border-b border-black"
                                      style={{
                                        fontSize: `${4.5 * groupFontScales.E}pt`,
                                      }}
                                    >
                                      <th className="py-0.5 text-left font-black"></th>
                                      <th className="py-0.5 text-right font-black w-[28%]">
                                        {t("erp_711")}
                                      </th>
                                      <th className="py-0.5 text-right font-black w-[36%]">
                                        {t("erp_712")}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="font-mono">
                                    {[
                                      {
                                        name: i18n.t("erp_197"),
                                        valPer100: Number(calories),
                                        key: "calories",
                                        unit: i18n.t("erp_713"),
                                        isZeroLimit: 0,
                                      },
                                      {
                                        name: i18n.t("erp_198"),
                                        valPer100: Number(protein),
                                        key: "protein",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0,
                                      },
                                      {
                                        name: i18n.t("erp_199"),
                                        valPer100: Number(fat),
                                        key: "fat",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0,
                                      },
                                      {
                                        name: i18n.t("erp_714"),
                                        valPer100: Number(saturatedFat),
                                        key: "saturatedFat",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0.1,
                                      },
                                      {
                                        name: i18n.t("erp_715"),
                                        valPer100: Number(transFat),
                                        key: "transFat",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0.3,
                                      },
                                      {
                                        name: i18n.t("erp_218"),
                                        valPer100: Number(carbs),
                                        key: "carbs",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0,
                                      },
                                      {
                                        name: i18n.t("erp_716"),
                                        valPer100: Number(sugar),
                                        key: "sugar",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0.5,
                                      },
                                      {
                                        name: i18n.t("erp_201"),
                                        valPer100: Number(sodium),
                                        key: "sodium",
                                        unit: i18n.t("erp_717"),
                                        isZeroLimit: 5,
                                      },
                                    ].map((row, idx) => {
                                      const sizeRatio =
                                        Number(portionSize) / 100;
                                      const valPerPortion =
                                        row.valPer100 * sizeRatio;
                                      const val100 = row.valPer100;
                                      const cfg = nutritionConfigs[row.key] || {
                                        decimals: 1,
                                        maxLength: 8,
                                      };
                                      let displayPortion = "";
                                      let display100 = "";

                                      // Handle rounding precision
                                      if (cfg.decimals === -1) {
                                        displayPortion =
                                          Math.round(valPerPortion).toString();
                                        display100 =
                                          Math.round(val100).toString();
                                      } else {
                                        displayPortion = valPerPortion.toFixed(
                                          cfg.decimals,
                                        );
                                        display100 = val100.toFixed(
                                          cfg.decimals,
                                        );
                                      }

                                      // FDA Zero and Sodium checks
                                      if (row.key === "sodium") {
                                        displayPortion =
                                          valPerPortion < 5
                                            ? "0"
                                            : Math.round(
                                                valPerPortion,
                                              ).toString();
                                        display100 =
                                          val100 < 5
                                            ? "0"
                                            : Math.round(val100).toString();
                                      } else if (row.isZeroLimit > 0) {
                                        if (valPerPortion <= row.isZeroLimit)
                                          displayPortion = "0";
                                        if (val100 <= row.isZeroLimit)
                                          display100 = "0";
                                      }

                                      // Apply text limits to prevent visual overflows
                                      if (
                                        displayPortion.length > cfg.maxLength
                                      ) {
                                        displayPortion =
                                          displayPortion.substring(
                                            0,
                                            cfg.maxLength,
                                          );
                                      }
                                      if (display100.length > cfg.maxLength) {
                                        display100 = display100.substring(
                                          0,
                                          cfg.maxLength,
                                        );
                                      }
                                      return (
                                        <tr
                                          key={idx}
                                          className="text-black font-black"
                                        >
                                          <td
                                            className={cn(
                                              "py-[0.1mm] text-left pl-[0.2mm]",
                                              row.name.startsWith("  ")
                                                ? "pl-[1.2mm] font-semibold"
                                                : "font-black",
                                            )}
                                          >
                                            {row.name.trim()}
                                          </td>
                                          <td className="py-[0.1mm] text-right font-mono font-bold whitespace-nowrap">
                                            {displayPortion}
                                            {row.unit}
                                          </td>
                                          <td className="py-[0.1mm] text-right font-mono font-bold whitespace-nowrap">
                                            {display100}
                                            {row.unit}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="w-full text-center text-[6pt] text-slate-400 font-bold border border-slate-200 border-dashed py-4 rounded">
                                {t("erp_718")}
                              </div>
                            )}
                          </div>

                          {/* Resize Handle - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setResizingGroup("E");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.E,
                              });
                            }}
                            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize flex items-center justify-center bg-slate-200 border-t border-l border-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7px] font-black text-slate-600 rounded-tl"
                          >
                            ↘
                          </div>
                        </div>

                        {/* GROUP C: Product Specs & Preservation Conditions */}
                        <div
                          className={cn(
                            "absolute flex flex-col justify-start overflow-hidden border border-transparent hover:border-slate-300 transition-colors bg-white/95 rounded p-1 group/item",
                            draggingGroup === "C" &&
                              "border-indigo-500 bg-indigo-50/10 z-20 shadow-md",
                            resizingGroup === "C" &&
                              "border-purple-500 bg-purple-50/10 z-20 shadow-md",
                          )}
                          style={{
                            left: `${groupLayouts.C.left}%`,
                            top: `${groupLayouts.C.top}%`,
                            width: `${groupLayouts.C.width}%`,
                            height: `${groupLayouts.C.height}%`,
                          }}
                        >
                          {/* Drag Bar - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDraggingGroup("C");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.C,
                              });
                            }}
                            className="absolute top-0 left-0 right-0 h-4 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 cursor-move flex items-center justify-between px-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7.5px] font-black text-slate-600 select-none"
                          >
                            <span>{t("erp_719")}</span>
                            <span className="font-mono opacity-80">
                              {groupLayouts.C.width}% x {groupLayouts.C.height}%
                            </span>
                          </div>

                          {/* Content Container */}
                          <div className="w-full h-full flex flex-col justify-around pt-3 pb-1 min-h-0 text-black leading-tight">
                            <div
                              className="font-extrabold space-y-[0.3mm] text-black"
                              style={{
                                fontSize: `${5.8 * groupFontScales.C}pt`,
                              }}
                            >
                              {showNetWeight && (
                                <div className="flex justify-between">
                                  <span>{t("erp_720")}</span>
                                  <span className="font-mono">{netWeight}</span>
                                </div>
                              )}
                              {showStorage && (
                                <div className="flex justify-between">
                                  <span>{t("erp_721")}</span>
                                  <span>{storageCondition}</span>
                                </div>
                              )}
                              {showExpiry && (
                                <>
                                  <div className="flex justify-between">
                                    <span>{t("erp_722")}</span>
                                    <span>{shelfLife}</span>
                                  </div>
                                  <div className="flex justify-between font-black">
                                    <span>{t("erp_723")}</span>
                                    <span className="font-mono">
                                      {expiryOption === "printed"
                                        ? i18n.t("erp_724")
                                        : expiryDate}
                                    </span>
                                  </div>
                                </>
                              )}
                              {showOrigin && originCountry && (
                                <div className="flex justify-between">
                                  <span>{t("erp_725")}</span>
                                  <span className="font-extrabold">
                                    {originCountry}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Resize Handle - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setResizingGroup("C");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.C,
                              });
                            }}
                            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize flex items-center justify-center bg-slate-200 border-t border-l border-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7px] font-black text-slate-600 rounded-tl"
                          >
                            ↘
                          </div>
                        </div>

                        {/* GROUP A: Reheating Guide */}
                        <div
                          className={cn(
                            "absolute flex flex-col justify-start overflow-hidden border border-transparent hover:border-slate-300 transition-colors bg-white/95 rounded p-1 group/item",
                            draggingGroup === "A" &&
                              "border-indigo-500 bg-indigo-50/10 z-20 shadow-md",
                            resizingGroup === "A" &&
                              "border-purple-500 bg-purple-50/10 z-20 shadow-md",
                          )}
                          style={{
                            left: `${groupLayouts.A.left}%`,
                            top: `${groupLayouts.A.top}%`,
                            width: `${groupLayouts.A.width}%`,
                            height: `${groupLayouts.A.height}%`,
                          }}
                        >
                          {/* Drag Bar - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDraggingGroup("A");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.A,
                              });
                            }}
                            className="absolute top-0 left-0 right-0 h-4 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 cursor-move flex items-center justify-between px-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7.5px] font-black text-slate-600 select-none"
                          >
                            <span>{t("erp_726")}</span>
                            <span className="font-mono opacity-80">
                              {groupLayouts.A.width}% x {groupLayouts.A.height}%
                            </span>
                          </div>

                          {/* Content Container */}
                          <div className="w-full h-full flex flex-col justify-between pt-3 pb-1 min-h-0 text-black">
                            {showReheating ? (
                              <div className="w-full h-full flex flex-col justify-between overflow-hidden">
                                <div className="flex justify-center shrink-0 mb-0.5">
                                  <span
                                    style={{
                                      fontSize: `${(reheatingMainTitleSize - 1) * groupFontScales.A}pt`,
                                    }}
                                    className="font-black bg-black text-white px-1.5 py-[0.25mm] rounded-[0.25mm] text-center leading-none"
                                  >
                                    {reheatingMainTitle}
                                  </span>
                                </div>
                                <div className="flex-1 flex flex-col justify-around min-h-0 overflow-y-auto leading-tight">
                                  {[
                                    {
                                      title: airFryerTitle,
                                      steps: airFryerSteps,
                                      show: showAirFryer,
                                    },
                                    {
                                      title: ovenTitle,
                                      steps: ovenSteps,
                                      show: showOven,
                                    },
                                    {
                                      title: panTitle,
                                      steps: panSteps,
                                      show: showPan,
                                    },
                                  ]
                                    .filter((m) => m.show)
                                    .map((m, idx) => (
                                      <div
                                        key={idx}
                                        className="flex flex-col text-black"
                                      >
                                        <strong
                                          style={{
                                            fontSize: `${(reheatingSubTitleSize - 1.2) * groupFontScales.A}pt`,
                                          }}
                                          className="font-black"
                                        >
                                          ├─ {m.title}
                                        </strong>
                                        <p
                                          style={{
                                            fontSize: `${(reheatingContentSize - 1.2) * groupFontScales.A}pt`,
                                          }}
                                          className="font-bold whitespace-pre-line pl-2 leading-tight"
                                        >
                                          {m.steps}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full text-center text-[5.5pt] text-slate-400 font-bold border border-slate-200 border-dashed py-2 rounded">
                                {t("erp_727")}
                              </div>
                            )}
                          </div>

                          {/* Resize Handle - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setResizingGroup("A");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.A,
                              });
                            }}
                            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize flex items-center justify-center bg-slate-200 border-t border-l border-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7px] font-black text-slate-600 rounded-tl"
                          >
                            ↘
                          </div>
                        </div>

                        {/* GROUP D: Manufacturer Info & Barcode */}
                        <div
                          className={cn(
                            "absolute flex flex-col justify-start overflow-hidden border border-transparent hover:border-slate-300 transition-colors bg-white/95 rounded p-1 group/item",
                            draggingGroup === "D" &&
                              "border-indigo-500 bg-indigo-50/10 z-20 shadow-md",
                            resizingGroup === "D" &&
                              "border-purple-500 bg-purple-50/10 z-20 shadow-md",
                          )}
                          style={{
                            left: `${groupLayouts.D.left}%`,
                            top: `${groupLayouts.D.top}%`,
                            width: `${groupLayouts.D.width}%`,
                            height: `${groupLayouts.D.height}%`,
                          }}
                        >
                          {/* Drag Bar - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDraggingGroup("D");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.D,
                              });
                            }}
                            className="absolute top-0 left-0 right-0 h-4 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 cursor-move flex items-center justify-between px-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7.5px] font-black text-slate-600 select-none"
                          >
                            <span>{t("erp_728")}</span>
                            <span className="font-mono opacity-80">
                              {groupLayouts.D.width}% x {groupLayouts.D.height}%
                            </span>
                          </div>

                          {/* Content Container */}
                          <div className="w-full h-full flex items-center justify-between pt-3 pb-0.5 min-h-0 text-black leading-tight gap-1.5">
                            {/* Responsible party info */}
                            {showResponsible && (
                              <div
                                className="text-black font-semibold flex-1 min-w-0"
                                style={{
                                  fontSize: `${5.2 * groupFontScales.D}pt`,
                                }}
                              >
                                {showAddress && (
                                  <div className="flex gap-[0.2mm]">
                                    <span className="font-black shrink-0">
                                      {t("erp_729")}
                                    </span>
                                    <span className="truncate">
                                      {companyAddress}
                                    </span>
                                  </div>
                                )}
                                {showPhone && (
                                  <div className="flex gap-[0.2mm]">
                                    <span className="font-black shrink-0">
                                      {t("erp_730")}
                                    </span>
                                    <span className="font-mono">
                                      {companyPhone}
                                    </span>
                                  </div>
                                )}
                                {showManufacturer && (
                                  <div
                                    className="flex gap-[0.2mm] text-slate-600 mt-0.5"
                                    style={{
                                      fontSize: `${5 * groupFontScales.D}pt`,
                                    }}
                                  >
                                    <span>{t("erp_731")}</span>
                                    <span className="truncate">
                                      {companyName}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Barcode area */}
                            {showBarcode && (
                              <div className="flex items-center gap-1.5 shrink-0 border-l border-dashed border-black pl-1.5 py-0.5">
                                <div className="p-0.5 bg-white border border-black shrink-0 flex items-center justify-center">
                                  <QRCodeSVG
                                    value={
                                      barcodeText || "https://shutterorder.com"
                                    }
                                    size={24}
                                    level="M"
                                    fgColor="#000000"
                                    bgColor="#ffffff"
                                  />
                                </div>
                                <span
                                  className="font-sans font-black leading-tight text-black whitespace-pre-line text-left"
                                  style={{
                                    fontSize: `${4.5 * groupFontScales.D}pt`,
                                  }}
                                >
                                  {barcodeExplanation}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Resize Handle - Hidden in Print */}
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setResizingGroup("D");
                              setDragStartPos({
                                x: e.clientX,
                                y: e.clientY,
                              });
                              setDragStartLayout({
                                ...groupLayouts.D,
                              });
                            }}
                            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize flex items-center justify-center bg-slate-200 border-t border-l border-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity z-20 print:hidden text-[7px] font-black text-slate-600 rounded-tl"
                          >
                            ↘
                          </div>
                        </div>
                      </div>
                    ) : (
                      // STANDARD FLOW COLUMN/GRID LAYOUT
                      <div className="w-full h-full flex flex-col justify-between relative z-10 text-black">
                        {/* 1. Header (Brand Logo, Product Title) */}
                        {labelSize !== "70x50" ? (
                          <div className="w-full border-b-[0.8mm] border-black pb-[1.5mm] flex justify-between items-center shrink-0">
                            {showBranding && (
                              <div className="flex items-center gap-[2.5mm] overflow-hidden">
                                <div
                                  style={{
                                    width: "12mm",
                                    height: "12mm",
                                  }}
                                  className="shrink-0 flex items-center justify-center border border-black rounded-lg p-1 bg-white"
                                >
                                  {renderLabelLogo()}
                                </div>
                                <div className="flex flex-col justify-center text-black">
                                  <span
                                    className="font-extrabold tracking-wide leading-none text-black"
                                    style={{
                                      fontSize: `${12 * groupFontScales.B}pt`,
                                    }}
                                  >
                                    {brandNameZh}
                                  </span>
                                  <span
                                    className="font-bold tracking-widest text-black uppercase mt-0.5 leading-none"
                                    style={{
                                      fontSize: `${5.5 * groupFontScales.B}pt`,
                                    }}
                                  >
                                    {brandNameEn}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="text-right flex-1 pl-[3mm] overflow-hidden">
                              {showProductZh && (
                                <h1
                                  className="font-black tracking-tight leading-none text-black break-words"
                                  style={{
                                    fontSize: `${13 * groupFontScales.B}pt`,
                                  }}
                                >
                                  {productZh}
                                </h1>
                              )}
                              {showProductEn && (
                                <span
                                  className="font-extrabold tracking-wide uppercase text-black block mt-1.5 leading-none truncate"
                                  style={{
                                    fontSize: `${6.2 * groupFontScales.B}pt`,
                                  }}
                                >
                                  {productEn}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Mini Header layout (70x50)
                          <div className="w-full border-b-[0.5mm] border-black pb-[0.5mm] flex justify-between items-end shrink-0">
                            <span
                              className="font-black leading-none text-black"
                              style={{
                                fontSize: `${9 * groupFontScales.B}pt`,
                              }}
                            >
                              {productZh}
                            </span>
                            <span
                              className="font-bold text-black leading-none"
                              style={{
                                fontSize: `${5.5 * groupFontScales.B}pt`,
                              }}
                            >
                              {brandNameZh}
                            </span>
                          </div>
                        )}

                        {/* 2. Main content adaptive body */}
                        {labelSize !== "70x50" ? (
                          // Grid structure for big labels: Left (Reheating), Right (Ingredients/Nutrition/Info)
                          <div
                            style={
                              hasActiveReheating
                                ? {
                                    gridTemplateColumns: "1.1fr 1fr",
                                  }
                                : undefined
                            }
                            className={cn(
                              "flex-1 min-h-0 text-black",
                              hasActiveReheating
                                ? "grid gap-[3mm] py-[2mm] grid-cols-[1.1fr_1fr]"
                                : "py-[2mm] flex flex-col justify-between",
                            )}
                          >
                            {/* Left Column: Reheating steps */}
                            {hasActiveReheating && (
                              <div className="border-r-[0.3mm] border-black pr-[2mm] flex flex-col justify-between gap-[2.5mm] min-h-0 overflow-hidden text-black h-full">
                                <div className="flex justify-center">
                                  <span
                                    style={{
                                      fontSize: `${reheatingMainTitleSize * groupFontScales.A}pt`,
                                    }}
                                    className="font-black bg-black text-white px-[2mm] py-[0.5mm] rounded-[0.5mm] text-center leading-none"
                                  >
                                    {reheatingMainTitle}
                                  </span>
                                </div>

                                <div className="flex-1 flex flex-col justify-around py-[1mm]">
                                  {[
                                    {
                                      title: airFryerTitle,
                                      steps: airFryerSteps,
                                      show: showAirFryer,
                                    },
                                    {
                                      title: ovenTitle,
                                      steps: ovenSteps,
                                      show: showOven,
                                    },
                                    {
                                      title: panTitle,
                                      steps: panSteps,
                                      show: showPan,
                                    },
                                  ]
                                    .filter((m) => m.show)
                                    .map((m, idx) => (
                                      <div
                                        key={idx}
                                        className="flex flex-col gap-[0.5mm] text-black"
                                      >
                                        <strong
                                          style={{
                                            fontSize: `${reheatingSubTitleSize * groupFontScales.A}pt`,
                                          }}
                                          className="font-extrabold text-black"
                                        >
                                          ├─ {m.title}
                                        </strong>
                                        <p
                                          style={{
                                            fontSize: `${reheatingContentSize * groupFontScales.A}pt`,
                                          }}
                                          className="text-black font-semibold whitespace-pre-line pl-[3.5mm] leading-[1.3]"
                                        >
                                          {m.steps}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Right Column: Ingredients list, Allergen advice, Expiry, Nutrition */}
                            <div className="flex flex-col justify-between gap-[2.5mm] min-h-0 h-full text-black">
                              {/* Ingredients */}
                              {showIngredients && (
                                <div className="flex flex-col gap-[1mm] min-h-0 overflow-hidden text-black flex-1 justify-start">
                                  <span
                                    className="font-black bg-black text-white px-[1.5mm] py-[0.3mm] rounded-[0.3mm] self-start leading-none shrink-0 mb-1"
                                    style={{
                                      fontSize: `${7 * groupFontScales.F}pt`,
                                    }}
                                  >
                                    {t("erp_705")}
                                  </span>
                                  <p
                                    className="font-semibold text-justify word-break break-all text-black pl-0.5 leading-[1.3] overflow-y-auto"
                                    style={{
                                      fontSize: `${6.6 * groupFontScales.F}pt`,
                                    }}
                                  >
                                    {formattedIngredients}
                                  </p>
                                </div>
                              )}

                              {/* Non-ready-to-eat warning inside flow */}
                              {showNotReadyToEat && (
                                <div
                                  className="font-black text-center text-white bg-black py-0.5 rounded-[0.3mm] shrink-0 my-0.5"
                                  style={{
                                    fontSize: `${6.2 * groupFontScales.F}pt`,
                                  }}
                                >
                                  ⚠️ {notReadyToEatText}
                                </div>
                              )}

                              {/* Expiry / Weight */}
                              {!shouldMoveInfoToBottomLeft &&
                                (showNetWeight ||
                                  showStorage ||
                                  showExpiry ||
                                  showOrigin) && (
                                  <div
                                    className="leading-[1.35] font-bold space-y-[0.6mm] border-t-[0.2mm] border-dashed border-black pt-2 text-black shrink-0"
                                    style={{
                                      fontSize: `${6.8 * groupFontScales.C}pt`,
                                    }}
                                  >
                                    {showNetWeight && (
                                      <div className="flex justify-between text-black">
                                        <span>{t("erp_720")}</span>
                                        <span className="font-mono">
                                          {netWeight}
                                        </span>
                                      </div>
                                    )}
                                    {showStorage && (
                                      <div className="flex justify-between text-black">
                                        <span>{t("erp_721")}</span>
                                        <span>{storageCondition}</span>
                                      </div>
                                    )}
                                    {showExpiry && (
                                      <>
                                        <div className="flex justify-between text-black">
                                          <span>{t("erp_722")}</span>
                                          <span>{shelfLife}</span>
                                        </div>
                                        <div className="flex justify-between font-black text-black">
                                          <span>{t("erp_723")}</span>
                                          <span className="font-mono">
                                            {expiryOption === "printed"
                                              ? i18n.t("erp_724")
                                              : expiryDate}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    {showOrigin && originCountry && (
                                      <div className="flex justify-between text-black">
                                        <span>{t("erp_725")}</span>
                                        <span className="font-extrabold">
                                          {originCountry}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                              {/* Allergen alert */}
                              {showAllergens && allergenWarning && (
                                <div className="text-[6pt] font-black text-black bg-white p-[1.2mm] rounded-[0.5mm] border-[0.25mm] border-black border-dashed leading-[1.2] shrink-0">
                                  {t("erp_732")}
                                  {allergenWarning}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Mini Label (70x50) compact body
                          <div
                            className="flex-1 py-[1mm] flex flex-col justify-between text-black leading-[1.2] font-extrabold"
                            style={{
                              fontSize: `${5.8 * groupFontScales.F}pt`,
                            }}
                          >
                            {showIngredients && (
                              <p
                                className="text-justify word-break break-all text-black font-semibold"
                                style={{
                                  fontSize: `${5.8 * groupFontScales.F}pt`,
                                }}
                              >
                                <span className="font-black text-black">
                                  {t("erp_733")}
                                </span>
                                {formattedIngredients}
                              </p>
                            )}

                            {showNotReadyToEat && (
                              <div
                                className="font-black text-center text-white bg-black py-0.5 rounded-[0.2mm] shrink-0 my-0.5"
                                style={{
                                  fontSize: `${5.2 * groupFontScales.F}pt`,
                                }}
                              >
                                ⚠️ {notReadyToEatText}
                              </div>
                            )}

                            <div
                              className="grid grid-cols-2 gap-[2mm] border-t-[0.1mm] border-black pt-[1mm] mt-[0.5mm]"
                              style={{
                                fontSize: `${5.8 * groupFontScales.C}pt`,
                              }}
                            >
                              <div>
                                {showNetWeight && (
                                  <p>
                                    <span className="font-black">
                                      {t("erp_720")}
                                    </span>
                                    {netWeight}
                                  </p>
                                )}
                                {showStorage && (
                                  <p>
                                    <span className="font-black">
                                      {t("erp_734")}
                                    </span>
                                    {storageCondition}
                                  </p>
                                )}
                                {showExpiry && (
                                  <p>
                                    <span className="font-black">
                                      {t("erp_735")}
                                    </span>
                                    {shelfLife}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                {showExpiry && (
                                  <p className="font-black text-black">
                                    {t("erp_736")}
                                    {expiryOption === "printed"
                                      ? i18n.t("erp_737")
                                      : expiryDate}
                                  </p>
                                )}
                                {showOrigin && originCountry && (
                                  <p>
                                    <span className="font-black">
                                      {t("erp_738")}
                                    </span>
                                    {originCountry}
                                  </p>
                                )}
                              </div>
                            </div>

                            {showAllergens && (
                              <p
                                className="font-black text-black bg-white border-[0.1mm] border-dashed border-black p-0.5 mt-0.5"
                                style={{
                                  fontSize: `${5 * groupFontScales.F}pt`,
                                }}
                              >
                                {t("erp_739")}
                                {allergenWarning
                                  .replace(i18n.t("erp_740"), "")
                                  .replace(i18n.t("erp_741"), "")}
                              </p>
                            )}
                          </div>
                        )}

                        {/* 3. Bottom Row: Nutrition facts table & corporate details & QR code */}
                        {labelSize !== "70x50" ? (
                          <div
                            style={
                              showNutrition
                                ? {
                                    gridTemplateColumns: "1.1fr 1fr",
                                  }
                                : undefined
                            }
                            className={cn(
                              "w-full border-t-[0.8mm] border-black pt-[2mm] shrink-0 text-black",
                              showNutrition
                                ? "grid gap-[3mm] items-end grid-cols-[1.1fr_1fr]"
                                : "block",
                            )}
                          >
                            {/* Bottom Left: Corporate Details + Barcode Area */}
                            <div
                              className={cn(
                                "overflow-hidden text-black w-full",
                                showNutrition
                                  ? "space-y-[2mm]"
                                  : "flex justify-between items-end gap-[4mm] border-b-[0.1mm] border-dashed border-slate-300 pb-1",
                              )}
                            >
                              {shouldMoveInfoToBottomLeft &&
                                (showNetWeight ||
                                  showStorage ||
                                  showExpiry ||
                                  showOrigin) && (
                                  <div
                                    className="leading-[1.35] font-bold space-y-[0.6mm] border-b-[0.2mm] border-dashed border-black pb-2 mb-2 text-black shrink-0"
                                    style={{
                                      fontSize: `${6.8 * groupFontScales.C}pt`,
                                    }}
                                  >
                                    {showNetWeight && (
                                      <div className="flex justify-between text-black">
                                        <span>{t("erp_720")}</span>
                                        <span className="font-mono">
                                          {netWeight}
                                        </span>
                                      </div>
                                    )}
                                    {showStorage && (
                                      <div className="flex justify-between text-black">
                                        <span>{t("erp_721")}</span>
                                        <span>{storageCondition}</span>
                                      </div>
                                    )}
                                    {showExpiry && (
                                      <>
                                        <div className="flex justify-between text-black">
                                          <span>{t("erp_722")}</span>
                                          <span>{shelfLife}</span>
                                        </div>
                                        <div className="flex justify-between font-black text-black">
                                          <span>{t("erp_723")}</span>
                                          <span className="font-mono">
                                            {expiryOption === "printed"
                                              ? i18n.t("erp_724")
                                              : expiryDate}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    {showOrigin && originCountry && (
                                      <div className="flex justify-between text-black">
                                        <span>{t("erp_725")}</span>
                                        <span className="font-extrabold">
                                          {originCountry}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                              {showResponsible && (
                                <div
                                  className={cn(
                                    "leading-[1.3] text-black font-semibold",
                                    showNutrition ? "" : "flex-1",
                                  )}
                                  style={{
                                    fontSize: `${6.2 * groupFontScales.D}pt`,
                                  }}
                                >
                                  {showAddress && (
                                    <div className="flex gap-[0.5mm]">
                                      <span className="font-black shrink-0">
                                        {t("erp_729")}
                                      </span>
                                      <span>{companyAddress}</span>
                                    </div>
                                  )}
                                  {showPhone && (
                                    <div className="flex gap-[0.5mm]">
                                      <span className="font-black shrink-0">
                                        {t("erp_730")}
                                      </span>
                                      <span className="font-mono">
                                        {companyPhone}
                                      </span>
                                    </div>
                                  )}
                                  {showOrigin &&
                                    !shouldMoveInfoToBottomLeft && (
                                      <div className="flex gap-[0.5mm]">
                                        <span className="font-black shrink-0">
                                          {t("erp_725")}
                                        </span>
                                        <span className="font-extrabold text-black">
                                          {originCountry}
                                        </span>
                                      </div>
                                    )}
                                  {showManufacturer && (
                                    <div
                                      className="flex gap-[0.5mm] mt-0.5 text-black"
                                      style={{
                                        fontSize: `${5.8 * groupFontScales.D}pt`,
                                      }}
                                    >
                                      <span>{t("erp_731")}</span>
                                      <span className="truncate">
                                        {companyName}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* QR Code Barcode area */}
                              {showBarcode && (
                                <div
                                  className={cn(
                                    "flex items-center gap-[2mm] shrink-0",
                                    showNutrition
                                      ? "border-t-[0.2mm] border-dashed border-black pt-[1.5mm]"
                                      : "border-l-[0.2mm] border-dashed border-black pl-[4mm] py-0.5",
                                  )}
                                >
                                  <div className="p-0.5 bg-white border border-black shrink-0 flex items-center justify-center">
                                    <QRCodeSVG
                                      value={
                                        barcodeText ||
                                        "https://shutterorder.com"
                                      }
                                      size={32}
                                      level="M"
                                      fgColor="#000000"
                                      bgColor="#ffffff"
                                    />
                                  </div>
                                  <span
                                    className="font-sans font-black leading-tight text-black whitespace-pre-line text-left"
                                    style={{
                                      fontSize: `${5.2 * groupFontScales.D}pt`,
                                    }}
                                  >
                                    {barcodeExplanation}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Bottom Right: Taiwan Nutrition Facts Table with Custom Decimal Precisions */}
                            {showNutrition && (
                              <div className="flex flex-col justify-end text-black shrink-0 border border-black p-1 bg-white">
                                <div
                                  className="font-black text-center border-b-[0.25mm] border-black pb-0.5 tracking-[1mm] text-black leading-none"
                                  style={{
                                    fontSize: `${7 * groupFontScales.E}pt`,
                                  }}
                                >
                                  {t("erp_708")}
                                </div>
                                <div
                                  className="font-bold text-left py-1 leading-normal border-b-[0.15mm] border-black text-black"
                                  style={{
                                    fontSize: `${5.5 * groupFontScales.E}pt`,
                                  }}
                                >
                                  {t("erp_709")}
                                  {portionSize}
                                  {t("erp_77")}
                                  <br />
                                  {t("erp_710")}
                                  {portionsPerPkg}
                                  {t("erp_15")}
                                </div>

                                <table
                                  className="w-full text-center border-collapse mt-0.5 text-black"
                                  style={{
                                    fontSize: `${5.8 * groupFontScales.E}pt`,
                                  }}
                                >
                                  <thead>
                                    <tr
                                      className="border-b-[0.15mm] border-black text-black"
                                      style={{
                                        fontSize: `${5 * groupFontScales.E}pt`,
                                      }}
                                    >
                                      <th className="py-[0.2mm] text-left pl-[0.5mm] text-black font-black"></th>
                                      <th className="py-[0.2mm] text-right pr-[0.5mm] text-black font-black w-[28%]">
                                        {t("erp_711")}
                                      </th>
                                      <th className="py-[0.2mm] text-right pr-[0.5mm] text-black font-black w-[36%]">
                                        {t("erp_742")}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="font-mono text-black">
                                    {[
                                      {
                                        name: i18n.t("erp_197"),
                                        valPer100: Number(calories),
                                        key: "calories",
                                        unit: i18n.t("erp_713"),
                                        isZeroLimit: 0,
                                      },
                                      {
                                        name: i18n.t("erp_198"),
                                        valPer100: Number(protein),
                                        key: "protein",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0,
                                      },
                                      {
                                        name: i18n.t("erp_199"),
                                        valPer100: Number(fat),
                                        key: "fat",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0,
                                      },
                                      {
                                        name: i18n.t("erp_714"),
                                        valPer100: Number(saturatedFat),
                                        key: "saturatedFat",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0.1,
                                      },
                                      {
                                        name: i18n.t("erp_715"),
                                        valPer100: Number(transFat),
                                        key: "transFat",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0.3,
                                      },
                                      {
                                        name: i18n.t("erp_218"),
                                        valPer100: Number(carbs),
                                        key: "carbs",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0,
                                      },
                                      {
                                        name: i18n.t("erp_716"),
                                        valPer100: Number(sugar),
                                        key: "sugar",
                                        unit: i18n.t("erp_77"),
                                        isZeroLimit: 0.5,
                                      },
                                      {
                                        name: i18n.t("erp_201"),
                                        valPer100: Number(sodium),
                                        key: "sodium",
                                        unit: i18n.t("erp_717"),
                                        isZeroLimit: 5,
                                      },
                                    ].map((row, idx) => {
                                      const sizeRatio =
                                        Number(portionSize) / 100;
                                      const valPerPortion =
                                        row.valPer100 * sizeRatio;
                                      const val100 = row.valPer100;
                                      const cfg = nutritionConfigs[row.key] || {
                                        decimals: 1,
                                        maxLength: 8,
                                      };
                                      let displayPortion = "";
                                      let display100 = "";

                                      // Handle rounding precision
                                      if (cfg.decimals === -1) {
                                        displayPortion =
                                          Math.round(valPerPortion).toString();
                                        display100 =
                                          Math.round(val100).toString();
                                      } else {
                                        displayPortion = valPerPortion.toFixed(
                                          cfg.decimals,
                                        );
                                        display100 = val100.toFixed(
                                          cfg.decimals,
                                        );
                                      }

                                      // Apply FDA Zero checks & Sodium checks
                                      if (row.key === "sodium") {
                                        displayPortion =
                                          valPerPortion < 5
                                            ? "0"
                                            : Math.round(
                                                valPerPortion,
                                              ).toString();
                                        display100 =
                                          val100 < 5
                                            ? "0"
                                            : Math.round(val100).toString();
                                      } else if (row.isZeroLimit > 0) {
                                        if (valPerPortion <= row.isZeroLimit)
                                          displayPortion = "0";
                                        if (val100 <= row.isZeroLimit)
                                          display100 = "0";
                                      }

                                      // Limit length to prevent overflows
                                      if (
                                        displayPortion.length > cfg.maxLength
                                      ) {
                                        displayPortion =
                                          displayPortion.substring(
                                            0,
                                            cfg.maxLength,
                                          );
                                      }
                                      if (display100.length > cfg.maxLength) {
                                        display100 = display100.substring(
                                          0,
                                          cfg.maxLength,
                                        );
                                      }
                                      return (
                                        <tr
                                          key={idx}
                                          className="text-black font-black"
                                        >
                                          <td
                                            className={cn(
                                              "py-[0.2mm] text-left font-sans pl-[0.5mm] text-black",
                                              row.name.startsWith("  ")
                                                ? "pl-[2mm] font-semibold text-black"
                                                : "font-black text-black",
                                            )}
                                          >
                                            {row.name.trim()}
                                          </td>
                                          <td className="py-[0.2mm] text-right pr-[0.5mm] text-black font-mono font-bold whitespace-nowrap">
                                            {displayPortion} {row.unit}
                                          </td>
                                          <td className="py-[0.2mm] text-right pr-[0.5mm] text-black font-mono font-bold whitespace-nowrap">
                                            {display100} {row.unit}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Mini Label bottom row (70x50)
                          <div
                            className="w-full border-t-[0.4mm] border-black pt-[0.5mm] flex justify-between items-center text-black font-black shrink-0"
                            style={{
                              fontSize: `${5.2 * groupFontScales.D}pt`,
                            }}
                          >
                            {showResponsible && (
                              <span className="leading-none truncate max-w-[48mm]">
                                {t("erp_743")}
                                {companyName}
                                {t("erp_744")}
                                {companyPhone}
                              </span>
                            )}
                            {showBarcode && (
                              <span
                                className="font-mono leading-none shrink-0 font-black border-[0.1mm] border-black px-0.5 rounded-[0.2mm]"
                                style={{
                                  fontSize: `${4.2 * groupFontScales.D}pt`,
                                }}
                              >
                                QR: Cook Info
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Ghost Next Label at the bottom */}
                  {previewContinuous && (
                    <div
                      className="opacity-[0.12] border-2 border-black border-dashed rounded-none bg-white flex flex-col justify-between p-2 pointer-events-none select-none shrink-0 print:hidden animate-in fade-in duration-300"
                      style={{
                        width: `${activeWidth}mm`,
                        height: "20mm",
                        marginTop: `${lowerGap}mm`,
                        overflow: "hidden",
                      }}
                    >
                      <div className="w-full border-b border-black pb-1 flex justify-between items-center text-[5.5pt]">
                        <span className="font-bold">NEXT LABEL</span>
                        <span className="font-mono">
                          GAP: {lowerGap.toFixed(1).replace(/\.0$/, "")}mm
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <p className="text-[10px] text-gray-500 font-bold mt-6 print:hidden">
            {t("erp_745")}
          </p>
        </div>
      </div>

      {/* Printing Media Style for Thermal Printer */}
      <style>{`
        /* Grid Dots Overlay Dotted Style */
        .grid-dots-overlay {
          background-image: radial-gradient(#6366f1 0.8px, transparent 0.8px);
          background-size: 2% 2%;
          opacity: 0.15;
        }

        /* Prevent scrollbars inside label rendering container */
        #printable-label::-webkit-scrollbar {
          display: none !important;
        }
        #printable-label {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        @media print {
          /* Force background color printing for all elements (e.g., solid black headers and tags) */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            scrollbar-width: none !important; /* Hide scrollbars in Firefox */
            -ms-overflow-style: none !important; /* Hide scrollbars in IE/Edge */
          }
          /* Hide all WebKit scrollbars and scroll buttons globally when printing */
          ::-webkit-scrollbar {
            display: none !important;
          }
          /* Hide sidebar and all other website layout wrappers */
          body {
            background: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav, aside, header, footer, .print-btn, .lg\\:col-span-5, .text-gray-500, p.print\\:hidden, div.print\\:hidden {
            display: none !important;
          }
          .lg\\:col-span-7 {
            padding: 0 !important;
            margin: 0 !important;
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
          }
          .continuous-backing-paper {
            background: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            width: auto !important;
          }
          #printable-label {
            border: 1.2mm solid black !important;
            border-radius: ${labelBorderRadius}mm !important;
            box-shadow: none !important;
            transform: none !important;
            page-break-inside: avoid;
            margin: ${gapAlignment === "top" ? `${labelGap}mm auto 0` : gapAlignment === "center" ? `${labelGap / 2}mm auto 0` : `0 auto`} !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            size: ${labelSize === "100x100" ? `100mm ${100 + (includeGapInPrint ? labelGap : 0)}mm` : labelSize === "80x80" ? `80mm ${80 + (includeGapInPrint ? labelGap : 0)}mm` : labelSize === "100x150" ? `100mm ${150 + (includeGapInPrint ? labelGap : 0)}mm` : `70mm ${50 + (includeGapInPrint ? labelGap : 0)}mm`};
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
export default Labels;
