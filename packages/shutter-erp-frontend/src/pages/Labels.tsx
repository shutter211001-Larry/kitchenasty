import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Printer, 
  Settings2, 
  Layers, 
  Database, 
  CheckSquare, 
  RotateCcw,
  Sparkles,
  Flame,
  Award,
  Save,
  ChefHat,
  Utensils
} from 'lucide-react';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';

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
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [loading, setLoading] = useState(false);

  // Layout Size Options
  type LabelSize = '100x100' | '80x80' | '100x150' | '70x50';
  const [labelSize, setLabelSize] = useState<LabelSize>('100x100');

  // Continuous Spacing Options (Label Gap in mm)
  const [labelGap, setLabelGap] = useState<number>(3); 
  const [includeGapInPrint, setIncludeGapInPrint] = useState<boolean>(true);
  const [previewContinuous, setPreviewContinuous] = useState<boolean>(true);
  const [labelBorderRadius, setLabelBorderRadius] = useState<number>(4);
  const [gapAlignment, setGapAlignment] = useState<'top' | 'center' | 'bottom'>('bottom');

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
  const [showNutrition, setShowNutrition] = useState(true);
  const [showAllergens, setShowAllergens] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);

  // Field values
  const [productZh, setProductZh] = useState('美式臘腸披薩');
  const [productEn, setProductEn] = useState('PEPPERONI PIZZA');
  const [ingredientsText, setIngredientsText] = useState('麵粉、水、酵母、食鹽、美式臘腸、莫札瑞拉乳酪、番茄醬汁');
  const [netWeight, setNetWeight] = useState('240公克 ± 5%');
  const [storageCondition, setStorageCondition] = useState('冷凍 -18°C 以下保存');
  const [shelfLife, setShelfLife] = useState('一年');
  const [expiryOption, setExpiryOption] = useState<'printed' | 'date'>('printed'); // 'printed' -> 標示於封口, 'date' -> 特定日期
  const [expiryDate, setExpiryDate] = useState('2027/05/20');
  
  // Customizable Brand Names
  const [brandNameZh, setBrandNameZh] = useState('美味食品研發中心');
  const [brandNameEn, setBrandNameEn] = useState('PREMIUM FOOD LAB');

  // Custom Logo Options
  const [logoType, setLogoType] = useState<'icon' | 'upload' | 'text'>('icon');
  const [selectedIconName, setSelectedIconName] = useState<string>('ChefHat');
  const [uploadedLogo, setUploadedLogo] = useState<string>(''); // Base64 image data-url

  // Responsible Party Info
  const [companyName, setCompanyName] = useState('美味食品股份有限公司');
  const [companyPhone, setCompanyPhone] = useState('02-2345-6789');
  const [companyAddress, setCompanyAddress] = useState('台北市美味特區研發路 88 號');
  const [originCountry, setOriginCountry] = useState('台灣');

  // Individual corporate detail display toggles
  const [showAddress, setShowAddress] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [showManufacturer, setShowManufacturer] = useState(true);

  // Allergen Statement
  const [allergenWarning, setAllergenWarning] = useState('本產品含有麩質、牛奶及其製品，不適合對其過敏體質者食用。');

  // Reheating Instructions
  const [airFryerSteps, setAirFryerSteps] = useState('180-200°C 預熱 5-10分鐘。\n披薩前後微噴水，烤 3-5分鐘。');
  const [ovenSteps, setOvenSteps] = useState('200-220°C 預熱 10-15分鐘。\n披薩前後微噴水，烤 3-5分鐘。');
  const [panSteps, setPanSteps] = useState('披薩底面及表面輕微噴水。\n放入平底鍋以中小火乾煎 8-13 分鐘。');

  // Reheating Instructions Font Sizes
  const [reheatingMainTitleSize, setReheatingMainTitleSize] = useState(7.5);
  const [reheatingSubTitleSize, setReheatingSubTitleSize] = useState(7.2);
  const [reheatingContentSize, setReheatingContentSize] = useState(6.2);

  // Reheating Instructions Custom Titles
  const [reheatingMainTitle, setReheatingMainTitle] = useState('美味復熱指引');
  const [airFryerTitle, setAirFryerTitle] = useState('氣炸烤箱');
  const [ovenTitle, setOvenTitle] = useState('家用烤箱');
  const [panTitle, setPanTitle] = useState('平底鍋');

  // Recipe portion scaling states
  const [loadedRecipe, setLoadedRecipe] = useState<any | null>(null);
  const [portionScale, setPortionScale] = useState(1.0);

  // Nutrition Facts (per 100g)
  const [portionSize, setPortionSize] = useState('100'); // 每一份量克數
  const [portionsPerPkg, setPortionsPerPkg] = useState('2.4'); // 本包裝含幾份
  
  const [calories, setCalories] = useState('265');
  const [protein, setProtein] = useState('12.5');
  const [fat, setFat] = useState('8.4');
  const [saturatedFat, setSaturatedFat] = useState('3.2');
  const [transFat, setTransFat] = useState('0');
  const [carbs, setCarbs] = useState('35.2');
  const [sugar, setSugar] = useState('1.8');
  const [sodium, setSodium] = useState('480');

  // Barcode / QR Code content
  const [barcodeText, setBarcodeText] = useState('https://smartkitchen-erp.com/recipe');

  // Load recipes list
  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/recipes');
      setRecipes(response.data);
    } catch (error) {
      console.error('Failed to load recipes', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();

    // Load saved label settings if they exist
    const saved = localStorage.getItem('pizzamaster_label_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.labelSize) setLabelSize(settings.labelSize);
        if (settings.labelGap !== undefined) setLabelGap(settings.labelGap);
        if (settings.includeGapInPrint !== undefined) setIncludeGapInPrint(settings.includeGapInPrint);
        if (settings.previewContinuous !== undefined) setPreviewContinuous(settings.previewContinuous);
        if (settings.labelBorderRadius !== undefined) setLabelBorderRadius(settings.labelBorderRadius);
        if (settings.gapAlignment !== undefined) setGapAlignment(settings.gapAlignment);
        if (settings.showBranding !== undefined) setShowBranding(settings.showBranding);
        if (settings.showProductZh !== undefined) setShowProductZh(settings.showProductZh);
        if (settings.showProductEn !== undefined) setShowProductEn(settings.showProductEn);
        if (settings.showIngredients !== undefined) setShowIngredients(settings.showIngredients);
        if (settings.showNetWeight !== undefined) setShowNetWeight(settings.showNetWeight);
        if (settings.showStorage !== undefined) setShowStorage(settings.showStorage);
        if (settings.showExpiry !== undefined) setShowExpiry(settings.showExpiry);
        if (settings.showResponsible !== undefined) setShowResponsible(settings.showResponsible);
        if (settings.showReheating !== undefined) setShowReheating(settings.showReheating);
        if (settings.showNutrition !== undefined) setShowNutrition(settings.showNutrition);
        if (settings.showAllergens !== undefined) setShowAllergens(settings.showAllergens);
        if (settings.showBarcode !== undefined) setShowBarcode(settings.showBarcode);
        
        if (settings.showAddress !== undefined) setShowAddress(settings.showAddress);
        if (settings.showPhone !== undefined) setShowPhone(settings.showPhone);
        if (settings.showOrigin !== undefined) setShowOrigin(settings.showOrigin);
        if (settings.showManufacturer !== undefined) setShowManufacturer(settings.showManufacturer);
        
        if (settings.brandNameZh) setBrandNameZh(settings.brandNameZh);
        if (settings.brandNameEn) setBrandNameEn(settings.brandNameEn);
        if (settings.logoType) setLogoType(settings.logoType);
        if (settings.selectedIconName) setSelectedIconName(settings.selectedIconName);
        if (settings.uploadedLogo) setUploadedLogo(settings.uploadedLogo);
        if (settings.companyName) setCompanyName(settings.companyName);
        if (settings.companyPhone) setCompanyPhone(settings.companyPhone);
        if (settings.companyAddress) setCompanyAddress(settings.companyAddress);
        if (settings.originCountry) setOriginCountry(settings.originCountry);
        if (settings.barcodeText) setBarcodeText(settings.barcodeText);
        
        if (settings.reheatingMainTitle) setReheatingMainTitle(settings.reheatingMainTitle);
        if (settings.airFryerTitle) setAirFryerTitle(settings.airFryerTitle);
        if (settings.ovenTitle) setOvenTitle(settings.ovenTitle);
        if (settings.panTitle) setPanTitle(settings.panTitle);
        
        if (settings.reheatingMainTitleSize) setReheatingMainTitleSize(settings.reheatingMainTitleSize);
        if (settings.reheatingSubTitleSize) setReheatingSubTitleSize(settings.reheatingSubTitleSize);
        if (settings.reheatingContentSize) setReheatingContentSize(settings.reheatingContentSize);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
  }, []);

  const [savingLabelConfig, setSavingLabelConfig] = useState(false);

  const restoreLabelConfig = (config: any) => {
    if (!config) return;
    
    // Continuous Spacing details
    if (config.labelGap !== undefined) setLabelGap(config.labelGap);
    if (config.includeGapInPrint !== undefined) setIncludeGapInPrint(config.includeGapInPrint);
    if (config.previewContinuous !== undefined) setPreviewContinuous(config.previewContinuous);
    if (config.labelBorderRadius !== undefined) setLabelBorderRadius(config.labelBorderRadius);
    if (config.gapAlignment !== undefined) setGapAlignment(config.gapAlignment);

    // Core details
    if (config.productZh !== undefined) setProductZh(config.productZh);
    if (config.productEn !== undefined) setProductEn(config.productEn);
    if (config.ingredientsText !== undefined) setIngredientsText(config.ingredientsText);
    if (config.netWeight !== undefined) setNetWeight(config.netWeight);
    if (config.storageCondition !== undefined) setStorageCondition(config.storageCondition);
    if (config.shelfLife !== undefined) setShelfLife(config.shelfLife);
    if (config.expiryOption !== undefined) setExpiryOption(config.expiryOption);
    if (config.brandNameZh !== undefined) setBrandNameZh(config.brandNameZh);
    if (config.brandNameEn !== undefined) setBrandNameEn(config.brandNameEn);
    if (config.logoType !== undefined) setLogoType(config.logoType);
    
    // Corporate & Warnings
    if (config.companyName !== undefined) setCompanyName(config.companyName);
    if (config.companyPhone !== undefined) setCompanyPhone(config.companyPhone);
    if (config.companyAddress !== undefined) setCompanyAddress(config.companyAddress);
    if (config.originCountry !== undefined) setOriginCountry(config.originCountry);
    if (config.allergenWarning !== undefined) setAllergenWarning(config.allergenWarning);
    if (config.barcodeText !== undefined) setBarcodeText(config.barcodeText);
    
    // Toggle Visibility Options
    if (config.showBranding !== undefined) setShowBranding(config.showBranding);
    if (config.showProductZh !== undefined) setShowProductZh(config.showProductZh);
    if (config.showProductEn !== undefined) setShowProductEn(config.showProductEn);
    if (config.showIngredients !== undefined) setShowIngredients(config.showIngredients);
    if (config.showNetWeight !== undefined) setShowNetWeight(config.showNetWeight);
    if (config.showStorage !== undefined) setShowStorage(config.showStorage);
    if (config.showExpiry !== undefined) setShowExpiry(config.showExpiry);
    if (config.showResponsible !== undefined) setShowResponsible(config.showResponsible);
    if (config.showReheating !== undefined) setShowReheating(config.showReheating);
    if (config.showNutrition !== undefined) setShowNutrition(config.showNutrition);
    if (config.showAllergens !== undefined) setShowAllergens(config.showAllergens);
    if (config.showBarcode !== undefined) setShowBarcode(config.showBarcode);

    // Reheating Details
    if (config.airFryerSteps !== undefined) setAirFryerSteps(config.airFryerSteps);
    if (config.ovenSteps !== undefined) setOvenSteps(config.ovenSteps);
    if (config.panSteps !== undefined) setPanSteps(config.panSteps);
    if (config.reheatingMainTitle !== undefined) setReheatingMainTitle(config.reheatingMainTitle);
    if (config.airFryerTitle !== undefined) setAirFryerTitle(config.airFryerTitle);
    if (config.ovenTitle !== undefined) setOvenTitle(config.ovenTitle);
    if (config.panTitle !== undefined) setPanTitle(config.panTitle);

    // Nutrition values
    if (config.portionSize !== undefined) setPortionSize(config.portionSize);
    if (config.portionsPerPkg !== undefined) setPortionsPerPkg(config.portionsPerPkg);
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
  };

  const handleSaveLabelConfig = async () => {
    if (!selectedRecipeId) {
      alert('請先選擇一個食譜配方');
      return;
    }
    
    try {
      setSavingLabelConfig(true);
      const labelConfig = {
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
        portionScale
      };
      
      await axios.patch(`http://localhost:3000/api/recipes/${selectedRecipeId}/label-config`, { labelConfig });
      alert('🎉 標籤設計已成功儲存！下次載入此食譜時，系統會自動還原您的自訂設計！');
      
      if (loadedRecipe) {
        setLoadedRecipe({
          ...loadedRecipe,
          labelConfig
        });
      }
    } catch (error) {
      console.error('Failed to save label design', error);
      alert('儲存標籤設計失敗，請檢查網路連線或伺服器狀態');
    } finally {
      setSavingLabelConfig(false);
    }
  };

  // Sync state when recipe is selected
  const handleRecipeChange = async (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setPortionScale(1.0); // Reset scale to 1.0 on recipe change
    if (!recipeId) {
      setLoadedRecipe(null);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3000/api/recipes/${recipeId}`);
      const recipe = response.data;
      setLoadedRecipe(recipe);
      
      if (recipe.labelConfig) {
        restoreLabelConfig(recipe.labelConfig);
      } else {
        applyRecipeData(recipe, 1.0);
      }
    } catch (error) {
      console.error('Failed to load recipe details', error);
      alert('自動載入配方資料失敗');
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
        const yieldCount = loadedRecipe.yieldAmount && loadedRecipe.yieldAmount > 0 ? loadedRecipe.yieldAmount : 1;
        const singlePortionWeight = baseWeight / yieldCount;
        const weight = singlePortionWeight * scale;
        setNetWeight(`${weight.toFixed(0)}公克 ± 5%`);
        setPortionsPerPkg(String(Number((1 * scale).toFixed(1))).replace(/\.0$/, ''));
      } else {
        applyRecipeData(loadedRecipe, scale);
      }
    }
  };

  const applyRecipeData = (recipe: any, scale: number) => {
    // 1. Set Product Name (Chinese & English)
    setProductZh(recipe.name);
    setProductEn(recipe.description ? recipe.description.toUpperCase().slice(0, 30) : 'HANDCRAFTED PIZZA');

    // 2. Build Ingredients list (sorted by quantity from most to least)
    const sortedIngredients = [...(recipe.totalIngredients || [])].sort((a, b) => b.quantity - a.quantity);
    const ingNames = sortedIngredients.map((i: any) => i.name).join('、');
    setIngredientsText(ingNames || '麵粉、水、酵母、起司');

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
        if (name.includes('麥') || name.includes('麵粉') || name.includes('麩')) allergensSet.add('麩質');
        if (name.includes('奶') || name.includes('起司') || name.includes('乳') || name.includes('乾酪')) allergensSet.add('牛奶');
        if (name.includes('蛋')) allergensSet.add('蛋類');
        if (name.includes('豆') || name.includes('醬油')) allergensSet.add('大豆');
        if (name.includes('魚') || name.includes('鯖') || name.includes('鱈') || name.includes('鮭')) allergensSet.add('魚類');
        if (name.includes('蝦') || name.includes('蟹') || name.includes('貝')) allergensSet.add('甲殼類');
        if (name.includes('芝麻')) allergensSet.add('芝麻');
        if (name.includes('堅果') || name.includes('花生')) allergensSet.add('堅果花生');
      });
    }

    if (allergensSet.size > 0) {
      setAllergenWarning(`本產品含有${Array.from(allergensSet).join('、')}及其製品，不適合對其過敏體質者食用。`);
      setShowAllergens(true);
    } else {
      setAllergenWarning('本產品無已知常見過敏原。');
      setShowAllergens(false);
    }

    // 4. Calculate Nutrition per 100g (scaled based on totalWeight and portionScale!)
    const baseWeight = recipe.totalWeight || 250; 
    const yieldCount = recipe.yieldAmount && recipe.yieldAmount > 0 ? recipe.yieldAmount : 1;
    const singlePortionWeight = baseWeight / yieldCount;
    
    // In practice, packaging is based on the minimum quantity (1 portion).
    // The scale (portionScale) determines how many portions are packaged together.
    const weight = singlePortionWeight * scale;
    setNetWeight(`${weight.toFixed(0)}公克 ± 5%`);
    
    // Portions per package is 1 scaled by portionScale. Serving size is always 1 portion.
    const portionsPerPkgVal = Number((1 * scale).toFixed(1));
    const portionSizeVal = Number(singlePortionWeight.toFixed(1));
    
    setPortionSize(String(portionSizeVal).replace(/\.0$/, ''));
    setPortionsPerPkg(String(portionsPerPkgVal).replace(/\.0$/, ''));

    // Nutrition values per 100g DO NOT change because they are relative to 100g!
    // But we still calculate them relative to the recipe stats
    const nutritionScale = baseWeight > 0 ? (baseWeight / 100) : 1;
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
    setSelectedRecipeId('');
    setLoadedRecipe(null);
    setPortionScale(1.0);
    setLabelGap(3);
    setIncludeGapInPrint(true);
    setPreviewContinuous(true);
    setLabelBorderRadius(4);
    setGapAlignment('bottom');
    setProductZh('美式臘腸披薩');
    setProductEn('PEPPERONI PIZZA');
    setIngredientsText('麵粉、水、酵母、食鹽、美式臘腸、莫札瑞拉乳酪、番茄醬汁');
    setNetWeight('240公克 ± 5%');
    setStorageCondition('冷凍 -18°C 以下保存');
    setShelfLife('一年');
    setExpiryOption('printed');
    setBrandNameZh('美味食品研發中心');
    setBrandNameEn('PREMIUM FOOD LAB');
    setLogoType('icon');
    setSelectedIconName('ChefHat');
    setUploadedLogo('');
    setCompanyName('美味食品股份有限公司');
    setCompanyPhone('02-2345-6789');
    setCompanyAddress('台北市美味特區研發路 88 號');
    setOriginCountry('台灣');
    setAllergenWarning('本產品含有麩質、牛奶及其製品，不適合對其過敏體質者食用。');
    setCalories('265');
    setProtein('12.5');
    setFat('8.4');
    setSaturatedFat('3.2');
    setTransFat('0');
    setCarbs('35.2');
    setSugar('1.8');
    setSodium('480');
    setPortionSize('100');
    setPortionsPerPkg('2.4');
    setBarcodeText('https://smartkitchen-erp.com/recipe');
    setShowReheating(true);
    setShowNutrition(true);
    setShowAllergens(true);
    setShowBranding(true);
    setShowBarcode(true);
    setReheatingMainTitleSize(7.5);
    setReheatingSubTitleSize(7.2);
    setReheatingContentSize(6.2);
    setReheatingMainTitle('美味復熱指引');
    setAirFryerTitle('氣炸烤箱');
    setOvenTitle('家用烤箱');
    setPanTitle('平底鍋');
    setShowAddress(true);
    setShowPhone(true);
    setShowOrigin(true);
    setShowManufacturer(true);
    localStorage.removeItem('pizzamaster_label_settings');
  };

  const handleSaveSettings = () => {
    const settings = {
      labelSize,
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
      reheatingContentSize
    };
    localStorage.setItem('pizzamaster_label_settings', JSON.stringify(settings));
    alert('🎉 標籤列印設定已成功儲存至瀏覽器！下次開啟將自動套用您的客製化版面。');
  };

  const renderLabelLogo = () => {
    if (logoType === 'upload' && uploadedLogo) {
      return (
        <img 
          src={uploadedLogo} 
          alt="Custom Logo" 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          className="filter contrast-200 grayscale brightness-105 mix-blend-multiply shrink-0"
        />
      );
    }
    
    if (logoType === 'text') {
      const abbreviation = brandNameZh ? brandNameZh.substring(0, 2) : '美味';
      return (
        <div className="w-full h-full bg-black text-white flex items-center justify-center font-black text-[9pt] leading-none select-none">
          {abbreviation}
        </div>
      );
    }
    
    // Default to Vector Icon
    const IconComponent = 
      selectedIconName === 'ChefHat' ? ChefHat :
      selectedIconName === 'Utensils' ? Utensils :
      selectedIconName === 'Flame' ? Flame :
      selectedIconName === 'Award' ? Award :
      selectedIconName === 'Sparkles' ? Sparkles :
      selectedIconName === 'Layers' ? Layers :
      ChefHat;
      
    return <IconComponent className="w-full h-full text-black stroke-[2]" />;
  };

  // Dynamic layout heuristic: Should we intelligently move Expiry/Weight/Storage block to the bottom-left area to optimize spacing?
  const isBottomLeftEmpty = !showBarcode || !showNutrition || !showResponsible;
  const isRightColumnCrowded = (ingredientsText || '').length > 85 || (allergenWarning || '').length > 60;
  const shouldMoveInfoToBottomLeft = isBottomLeftEmpty || isRightColumnCrowded;

  const getLabelDimensions = () => {
    let w = 100;
    let h = 100;
    if (labelSize === '80x80') {
      w = 80;
      h = 80;
    } else if (labelSize === '100x150') {
      w = 100;
      h = 150;
    } else if (labelSize === '70x50') {
      w = 70;
      h = 50;
    }
    return { w, h };
  };

  // Generate dynamic container styling and fluid scaling for full adaptive layout
  const getLabelStyle = (): React.CSSProperties => {
    let width = '100mm';
    let height = '100mm';
    let padding = '3mm';
    let baseFontSize = '9.5pt';

    if (labelSize === '80x80') {
      width = '80mm';
      height = '80mm';
      padding = '2.5mm';
      baseFontSize = '8.2pt';
    } else if (labelSize === '100x150') {
      width = '100mm';
      height = '150mm';
      padding = '4mm';
      baseFontSize = '10.5pt';
    } else if (labelSize === '70x50') {
      width = '70mm';
      height = '50mm';
      padding = '1.2mm';
      baseFontSize = '6.8pt';
    }

    // Dynamic Font Scaling Factor based on active content sections
    if (labelSize !== '70x50') {
      let score = 0;
      if (showReheating) score += 2;
      if (showNutrition) score += 3.5;
      if (showIngredients) score += 1.2;
      if (showAllergens) score += 0.8;
      if (showResponsible) score += 1;

      let scaleFactor = 1.0;
      if (score >= 4) scaleFactor = 0.90;
      if (score >= 6) scaleFactor = 0.82;
      if (score >= 7.5) scaleFactor = 0.73; 

      const baseVal = parseFloat(baseFontSize);
      baseFontSize = `${(baseVal * scaleFactor).toFixed(1)}pt`;
    } else {
      // 70x50 has hard constraints
      let score = 0;
      if (showIngredients) score += 1;
      if (showAllergens) score += 0.8;
      
      let scaleFactor = 1.0;
      if (score > 1.5) scaleFactor = 0.85;
      if (ingredientsText.length > 50) scaleFactor *= 0.88;

      const baseVal = parseFloat(baseFontSize);
      baseFontSize = `${(baseVal * scaleFactor).toFixed(1)}pt`;
    }

    return {
      width,
      height,
      padding,
      fontSize: baseFontSize,
      boxSizing: 'border-box',
      fontFamily: '"Noto Sans TC", "Noto Serif TC", sans-serif',
      lineHeight: 1.25,
      backgroundColor: '#ffffff',
      color: '#000000',
      borderColor: '#000000',
      borderWidth: '1.2mm',
      borderStyle: 'solid',
      borderRadius: `${labelBorderRadius}mm`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      position: 'relative',
      userSelect: 'none'
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
            <h2 className="text-2xl font-black text-gray-800">自適應食品標籤列印器</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              台灣冷凍/預包裝食品法規完全規格對齊 · 動態勾選排版與食譜資料庫一鍵連動
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSaveSettings}
            className="flex-1 md:flex-none px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs shadow-sm hover:bg-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>儲存設定</span>
          </button>

          <button
            onClick={handleReset}
            className="flex-1 md:flex-none px-4 py-2 bg-white border border-border text-gray-700 rounded-xl font-bold text-xs shadow-sm hover:bg-muted transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置預設</span>
          </button>
          
          <button
            onClick={() => window.print()}
            className="w-full md:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-xl font-black text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>列印標籤</span>
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
                <h4 className="text-xs font-black uppercase tracking-wider">食譜配方庫一鍵帶入</h4>
              </div>
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"></div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">
              選取食譜後，系統會自動按比例從多到少排列成分、精算八大營養素、彙整食材過敏原。
            </p>
            <select
              disabled={loading}
              className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs disabled:opacity-60 disabled:bg-muted"
              value={selectedRecipeId}
              onChange={(e) => handleRecipeChange(e.target.value)}
            >
              <option value="">-- 手動輸入 (不連結食譜) --</option>
              {recipes.filter(recipe => recipe.isProduct !== false).map(recipe => (
                <option key={recipe.id} value={recipe.id}>
                  🍳 {recipe.name} (份量: {recipe.yieldAmount}{recipe.yieldUnit})
                </option>
              ))}
            </select>

            {selectedRecipeId && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 mt-2 border-t border-primary/10 pt-2">
                <label className="text-[10px] font-black text-primary flex justify-between">
                  <span>🔢 帶入食譜產出份數倍率</span>
                  <span className="font-extrabold">{portionScale} 倍</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  className="w-full px-3 py-1.5 bg-white border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  value={portionScale}
                  onChange={(e) => handlePortionScaleChange(parseFloat(e.target.value) || 1.0)}
                />
                <span className="text-[8.5px] text-muted-foreground leading-normal block pb-1.5">
                  調整倍率會自動按比例重新縮放「淨重」與「營養標示之包裝份數」。
                </span>

                {loadedRecipe && loadedRecipe.bakingLossRate > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 my-2.5 text-[10px] text-orange-800 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="font-black flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-600 animate-pulse shrink-0" />
                      <span>已套用 {loadedRecipe.bakingLossRate}% 烤焙水份損耗</span>
                    </div>
                    <p className="leading-relaxed font-medium">
                      原始生重：{((loadedRecipe.totalWeight / (1 - loadedRecipe.bakingLossRate / 100)) * portionScale).toFixed(0)}g ➜ 成品淨重：{(loadedRecipe.totalWeight * portionScale).toFixed(0)}g。
                    </p>
                    <p className="leading-relaxed text-[9px] text-orange-700/80">
                      分母已自動縮減，每 100g 營養素密度已進行等比例「濃縮計算」。
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveLabelConfig}
                  disabled={savingLabelConfig}
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>💾 儲存目前標籤設計</span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Size & Dimension Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Layers className="w-4 h-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">選擇實體標籤列印尺寸</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: '100x100', label: '100x100 mm', desc: '方型披薩盒貼紙 (精緻款)' },
                { id: '80x80', label: '80x80 mm', desc: '標準方型貼紙 (精簡款)' },
                { id: '100x150', label: '100x150 mm', desc: '長條型大貼紙 (資訊全配)' },
                { id: '70x50', label: '70x50 mm', desc: '迷你標籤 (僅含法定最少項目)' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLabelSize(opt.id as LabelSize)}
                  className={cn(
                    "p-3 border rounded-xl text-left transition-all active:scale-98",
                    labelSize === opt.id 
                      ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20" 
                      : "border-border hover:bg-muted text-gray-700"
                  )}
                >
                  <p className="text-xs font-black">{opt.label}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 font-medium leading-normal">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Continuous Spacing Settings */}
          <div className="space-y-3 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Settings2 className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-wider">連續捲筒貼紙設定</h4>
              </div>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-md">
                {labelGap === 0 ? '連續紙' : `間距: ${labelGap} mm`}
              </span>
            </div>

            {/* Gap Slider & Quick Selections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-600">貼紙與貼紙間距 (Gap)</label>
                <span className="text-[10px] font-mono font-black text-slate-500">{labelGap}mm</span>
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
                  { value: 0, label: '0mm (無)' },
                  { value: 2, label: '2mm' },
                  { value: 3, label: '3mm (標準)' },
                  { value: 4, label: '4mm' }
                ].map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setLabelGap(pill.value)}
                    className={cn(
                      "px-2 py-1 text-[9.5px] font-black rounded-lg border transition-all cursor-pointer",
                      labelGap === pill.value
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-white border-border text-gray-600 hover:bg-slate-50"
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
                <label className="text-[10px] font-bold text-gray-600">貼紙邊角圓角 (Corner Radius)</label>
                <span className="text-[10px] font-mono font-black text-slate-500">{labelBorderRadius}mm</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  value={labelBorderRadius}
                  onChange={(e) => setLabelBorderRadius(parseFloat(e.target.value))}
                />
              </div>
              
              {/* Quick Choice Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { value: 0, label: '0mm (直角)' },
                  { value: 1.5, label: '1.5mm' },
                  { value: 3, label: '3mm' },
                  { value: 4, label: '4mm (標準)' },
                  { value: 6, label: '6mm' }
                ].map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setLabelBorderRadius(pill.value)}
                    className={cn(
                      "px-2 py-1 text-[9.5px] font-black rounded-lg border transition-all cursor-pointer",
                      labelBorderRadius === pill.value
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-white border-border text-gray-600 hover:bg-slate-50"
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
                <label className="text-[10px] font-bold text-gray-600">紙張垂直出紙對齊 (高度補償)</label>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-black rounded font-mono uppercase">
                  {gapAlignment === 'top' ? '間距在上方' : gapAlignment === 'center' ? '上下均分' : '間距在下方'}
                </span>
              </div>
              <p className="text-[8.5px] text-muted-foreground font-semibold leading-normal">
                解決第一張標籤上半被裁切的問題。依您的印表機感應點，調整列印版面在實體標籤上的上下偏移位置。
              </p>
              <div className="grid grid-cols-3 gap-1 bg-white border border-border p-1 rounded-xl">
                {[
                  { id: 'bottom', label: '靠上列印', desc: '間距留於下方' },
                  { id: 'center', label: '置中列印', desc: '間距上下均分' },
                  { id: 'top', label: '靠下列印', desc: '間距留於上方' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setGapAlignment(t.id as any)}
                    className={cn(
                      "py-1 px-1 text-[9.5px] font-black rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5",
                      gapAlignment === t.id 
                        ? "bg-slate-900 text-white shadow-sm" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                  >
                    <span>{t.label}</span>
                    <span className="text-[7.5px] font-semibold opacity-80 leading-none">{t.desc}</span>
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
                  <span className="text-[10.5px] font-bold text-gray-700 block leading-tight">列印尺寸包含間距 (高度優化)</span>
                  <span className="text-[8.5px] text-muted-foreground font-semibold leading-normal block mt-0.5">
                    啟用後，系統列印高度會自動包含間距，有助於 Zebra/TSC 等熱敏印表機完美對齊而不跳頁。
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
                  <span className="text-[10.5px] font-bold text-gray-700 block leading-tight">啟用連續捲筒底紙模擬</span>
                  <span className="text-[8.5px] text-muted-foreground font-semibold leading-normal block mt-0.5">
                    在右側列印預覽中，呈現格拉辛底紙與相鄰貼紙間距的 1:1 視覺對齊效果。
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section: Feature Switch Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-gray-700">
              <CheckSquare className="w-4 h-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">欄位與板塊顯示設定</h4>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-muted/30 border border-border p-4 rounded-2xl">
              {[
                { state: showBranding, setter: setShowBranding, label: '品牌 Logo 識別' },
                { state: showProductZh, setter: setShowProductZh, label: '品名 (中文)' },
                { state: showProductEn, setter: setShowProductEn, label: '英文名稱副標' },
                { state: showIngredients, setter: setShowIngredients, label: '內容物成分清單' },
                { state: showNetWeight, setter: setShowNetWeight, label: '淨重標示' },
                { state: showStorage, setter: setShowStorage, label: '冷凍保存條件' },
                { state: showExpiry, setter: setShowExpiry, label: '有效與保存期限' },
                { state: showResponsible, setter: setShowResponsible, label: '負責廠商資訊' },
                { state: showReheating, setter: setShowReheating, label: '加熱/烹調指南' },
                { state: showNutrition, setter: setShowNutrition, label: '標準八大營養標示' },
                { state: showAllergens, setter: setShowAllergens, label: '過敏原防呆聲明' },
                { state: showBarcode, setter: setShowBarcode, label: '烹調說明條碼' },
              ].map((item, idx) => (
                <label key={idx} className="flex items-center gap-2 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={item.state}
                    onChange={(e) => item.setter(e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary rounded border-border focus:ring-primary/20"
                  />
                  <span className="text-[11px] font-bold text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
            
            {/* Nested Sub-fields under Responsible Party Info */}
            {showResponsible && (
              <div className="px-4 py-3 bg-primary/5 border border-primary/10 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <span className="text-[9px] font-black text-primary uppercase block tracking-wider">🏢 廠商資訊顯示細項設定</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  {[
                    { state: showAddress, setter: setShowAddress, label: '顯示地址' },
                    { state: showPhone, setter: setShowPhone, label: '顯示電話' },
                    { state: showOrigin, setter: setShowOrigin, label: '顯示原產地' },
                    { state: showManufacturer, setter: setShowManufacturer, label: '顯示製造商' },
                  ].map((sub, idx) => (
                    <label key={idx} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sub.state}
                        onChange={(e) => sub.setter(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded border-border focus:ring-primary/20 shrink-0 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-gray-700">{sub.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Custom Field Editor */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Settings2 className="w-4 h-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">標籤內容微調輸入</h4>
            </div>

            {/* Basic Info */}
            <div className="space-y-3">
              {showBranding && (
                <div className="space-y-3.5 bg-primary/5 p-4 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-primary">品牌名稱 (中文)</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-white border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20"
                        value={brandNameZh}
                        onChange={(e) => setBrandNameZh(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-primary">品牌名稱 (英文)</label>
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
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">自訂 Logo 標誌樣式</span>
                    <div className="grid grid-cols-3 gap-1 bg-white border border-border p-1 rounded-xl">
                      {[
                        { id: 'icon', label: '精選圖章' },
                        { id: 'upload', label: '上傳圖檔' },
                        { id: 'text', label: '文字印記' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setLogoType(t.id as any)}
                          className={cn(
                            "py-1 text-[9.5px] font-black rounded-lg transition-all cursor-pointer",
                            logoType === t.id 
                              ? "bg-primary text-white shadow-sm" 
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Logo Source Type Options Editor */}
                  {logoType === 'icon' && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                      <span className="text-[9px] font-bold text-slate-400 block mb-1">🔍 選擇一個向量印章圖案</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { name: 'ChefHat', label: '廚師帽', icon: ChefHat },
                          { name: 'Utensils', label: '餐具', icon: Utensils },
                          { name: 'Flame', label: '火焰', icon: Flame },
                          { name: 'Award', label: '榮譽獎章', icon: Award },
                          { name: 'Sparkles', label: '閃耀星芒', icon: Sparkles },
                          { name: 'Layers', label: '層疊製程', icon: Layers }
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => setSelectedIconName(item.name)}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[9.5px] font-bold transition-all cursor-pointer justify-center",
                                selectedIconName === item.name
                                  ? "border-primary bg-primary/5 text-primary shadow-sm"
                                  : "border-border bg-white text-gray-500 hover:bg-slate-50"
                              )}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {logoType === 'upload' && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                      <span className="text-[9px] font-bold text-slate-400 block">📸 上傳商標 Logo 檔案 (PNG/JPG)</span>
                      <div className="flex items-center gap-3 bg-white p-2.5 border border-border rounded-xl">
                        <label className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-lg text-[9px] font-black text-gray-600 transition-all cursor-pointer relative">
                          選擇圖片
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
                                    setUploadedLogo(event.target.result as string);
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
                                <img src={uploadedLogo} className="w-full h-full object-contain mix-blend-multiply" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-emerald-600 font-extrabold truncate">已成功載入</p>
                                <button 
                                  type="button"
                                  onClick={() => setUploadedLogo('')}
                                  className="text-[9px] text-red-500 font-bold hover:underline"
                                >
                                  清除重新上傳
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[9px] text-gray-400 font-semibold block leading-tight">未載入任何外部圖檔 (印表機將以原文字呈現)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {logoType === 'text' && (
                    <div className="bg-white/50 p-2.5 border border-border rounded-xl text-[9.5px] text-gray-500 leading-normal font-bold animate-in fade-in duration-200">
                      💡 系統將自動抓取您上方輸入的 <strong>品牌名稱 (中文)</strong> 前兩個字（目前為：「{brandNameZh ? brandNameZh.substring(0, 2) : '美味'}」）作為標籤上的方形純文字反白印記，呈現極簡俐落的工業設計風格。
                    </div>
                  )}
                </div>
              )}

              {showProductZh && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600">中文品名</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 bg-muted border border-border rounded-xl font-bold text-xs"
                    value={productZh}
                    onChange={(e) => setProductZh(e.target.value)}
                  />
                </div>
              )}

              {showProductEn && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600">英文名稱</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 bg-muted border border-border rounded-xl font-bold text-xs"
                    value={productEn}
                    onChange={(e) => setProductEn(e.target.value)}
                  />
                </div>
              )}

              {showIngredients && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600">成分清單 (依含量由多到少排列)</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-1.5 bg-muted border border-border rounded-xl font-bold text-xs"
                    value={ingredientsText}
                    onChange={(e) => setIngredientsText(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {showNetWeight && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600">淨重容量</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-muted border border-border rounded-xl font-bold text-xs"
                      value={netWeight}
                      onChange={(e) => setNetWeight(e.target.value)}
                    />
                  </div>
                )}
                {showStorage && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600">保存條件</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-muted border border-border rounded-xl font-bold text-xs"
                      value={storageCondition}
                      onChange={(e) => setStorageCondition(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {showExpiry && (
                <div className="bg-muted/10 p-3 border border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-600">日期標示設定</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExpiryOption('printed')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold",
                          expiryOption === 'printed' ? "bg-gray-800 text-white" : "bg-muted text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        標示於包裝
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpiryOption('date')}
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold",
                          expiryOption === 'date' ? "bg-gray-800 text-white" : "bg-muted text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        列印特定日期
                      </button>
                    </div>
                  </div>
                  
                  {expiryOption === 'date' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500">有效日期 (YYYY/MM/DD)</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1 bg-white border border-border rounded-lg font-mono font-bold text-xs"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </div>
                  ) : (
                    <p className="text-[9px] text-muted-foreground font-semibold">
                      ※ 標籤將自動印出「有效日期：標示於封口處 (西元年/月/日)」
                    </p>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500">保存期限</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1 bg-white border border-border rounded-lg font-bold text-xs"
                      value={shelfLife}
                      onChange={(e) => setShelfLife(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {showAllergens && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-600">過敏原防呆聲明</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-1.5 bg-rose-50/40 border border-rose-100 rounded-xl font-bold text-xs text-rose-700"
                    value={allergenWarning}
                    onChange={(e) => setAllergenWarning(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Reheating Steps */}
            {showReheating && (
              <div className="border-t border-border/80 pt-4 space-y-3">
                <div className="flex items-center gap-1 text-gray-800">
                  <Flame className="w-3.5 h-3.5 text-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider">復熱步驟指南 (品牌自製)</span>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-600">復熱主標題文字</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1 bg-white border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/10"
                      value={reheatingMainTitle}
                      onChange={(e) => setReheatingMainTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-bold text-gray-600">氣炸小標題</label>
                      <input
                        type="text"
                        className="w-full px-2.5 py-1 bg-white border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/10"
                        value={airFryerTitle}
                        onChange={(e) => setAirFryerTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-bold text-gray-600">烤箱小標題</label>
                      <input
                        type="text"
                        className="w-full px-2.5 py-1 bg-white border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/10"
                        value={ovenTitle}
                        onChange={(e) => setOvenTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-bold text-gray-600">煎鍋小標題</label>
                      <input
                        type="text"
                        className="w-full px-2.5 py-1 bg-white border border-border rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-primary/10"
                        value={panTitle}
                        onChange={(e) => setPanTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-600">{airFryerTitle}步驟指引</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-1 bg-muted border border-border rounded-xl font-bold text-xs"
                      value={airFryerSteps}
                      onChange={(e) => setAirFryerSteps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-600">{ovenTitle}步驟指引</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-1 bg-muted border border-border rounded-xl font-bold text-xs"
                      value={ovenSteps}
                      onChange={(e) => setOvenSteps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-600">{panTitle}步驟指引</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-1 bg-muted border border-border rounded-xl font-bold text-xs"
                      value={panSteps}
                      onChange={(e) => setPanSteps(e.target.value)}
                    />
                  </div>
                </div>

                {/* Font Size Adjusters for Reheating Instructions */}
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2 mt-3">
                  <span className="text-[9px] font-black text-gray-600 uppercase block mb-1">🔍 復熱字型大小微調 (pt)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-gray-500 block">主標 ({reheatingMainTitleSize}pt)</label>
                      <input 
                        type="range" 
                        min="5" 
                        max="12" 
                        step="0.1" 
                        value={reheatingMainTitleSize} 
                        onChange={(e) => setReheatingMainTitleSize(Number(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-gray-500 block">小標 ({reheatingSubTitleSize}pt)</label>
                      <input 
                        type="range" 
                        min="5" 
                        max="11" 
                        step="0.1" 
                        value={reheatingSubTitleSize} 
                        onChange={(e) => setReheatingSubTitleSize(Number(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-gray-500 block">步驟 ({reheatingContentSize}pt)</label>
                      <input 
                        type="range" 
                        min="4.5" 
                        max="10" 
                        step="0.1" 
                        value={reheatingContentSize} 
                        onChange={(e) => setReheatingContentSize(Number(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nutrition facts input */}
            {showNutrition && (
              <div className="border-t border-border/80 pt-4 space-y-3">
                <div className="flex items-center gap-1 text-gray-800">
                  <Award className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider">法定標準八大營養數值</span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 border border-slate-100 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500">每一份量 (g)</label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 bg-white border border-border rounded-lg font-mono text-xs text-right font-bold"
                      value={portionSize}
                      onChange={(e) => setPortionSize(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500">本包裝含 (份)</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full px-2 py-1 bg-white border border-border rounded-lg font-mono text-xs text-right font-bold"
                      value={portionsPerPkg}
                      onChange={(e) => setPortionsPerPkg(e.target.value)}
                    />
                  </div>
                  
                  {[
                    { label: '熱量 (kcal)', val: calories, setter: setCalories },
                    { label: '蛋白質 (g)', val: protein, setter: setProtein },
                    { label: '脂肪 (g)', val: fat, setter: setFat },
                    { label: '飽和脂肪 (g)', val: saturatedFat, setter: setSaturatedFat },
                    { label: '反式脂肪 (g)', val: transFat, setter: setTransFat },
                    { label: '碳水化合物 (g)', val: carbs, setter: setCarbs },
                    { label: '糖 (g)', val: sugar, setter: setSugar },
                    { label: '鈉 (mg)', val: sodium, setter: setSodium },
                  ].map((nut, idx) => (
                    <div key={idx} className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500">{nut.label}</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 bg-white border border-border rounded-lg font-mono text-xs text-right font-bold"
                        value={nut.val}
                        onChange={(e) => nut.setter(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responsible corporate info */}
            {showResponsible && (
              <div className="border-t border-border/80 pt-4 space-y-3">
                <span className="text-[10px] font-black text-gray-800 uppercase tracking-wider">製造廠商/國內負責廠商</span>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-600">廠商名稱</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1 bg-muted border border-border rounded-xl font-bold text-xs"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-600">聯絡電話</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1 bg-muted border border-border rounded-xl font-bold text-xs"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-600">原產地</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1 bg-muted border border-border rounded-xl font-bold text-xs"
                        value={originCountry}
                        onChange={(e) => setOriginCountry(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-600">廠商地址</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1 bg-muted border border-border rounded-xl font-bold text-xs"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Barcode settings */}
            {showBarcode && (
              <div className="border-t border-border/80 pt-4 space-y-2">
                <label className="text-[10px] font-black text-gray-800 uppercase tracking-wider">條碼連結內容 (烹調說明/官網)</label>
                <input
                  type="text"
                  className="w-full px-3 py-1 bg-muted border border-border rounded-xl font-bold text-xs font-mono"
                  value={barcodeText}
                  onChange={(e) => setBarcodeText(e.target.value)}
                />
              </div>
            )}

          </div>

        </div>

        {/* Right Side: Adaptive thermal label preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-start p-8 bg-[#D1D4D9] rounded-3xl min-h-[75vh] relative overflow-hidden border border-border shadow-inner print:bg-transparent print:border-none print:shadow-none print:p-0">
          <div className="absolute top-4 left-6 text-gray-500 font-bold text-[10px] tracking-widest uppercase flex items-center gap-1.5 print:hidden">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            1 : 1 向量感熱標籤預覽區 (自適應排版)
          </div>

          {/* Sizing Container (for media query print sizing) */}
          {(() => {
            const { w: activeWidth, h: activeHeight } = getLabelDimensions();
            const upperGap = gapAlignment === 'top' ? labelGap : gapAlignment === 'center' ? labelGap / 2 : 0;
            const lowerGap = gapAlignment === 'bottom' ? labelGap : gapAlignment === 'center' ? labelGap / 2 : 0;
            return (
              <div className={cn(
                "w-full flex flex-col items-center justify-start min-h-0 print:overflow-visible print:max-h-none print:py-0 print:pr-0",
                previewContinuous ? "overflow-y-auto max-h-[62vh] py-8 pr-12 scrollbar-none print:pr-0 print:py-0" : "justify-center py-4"
              )}>
                {/* Simulated Continuous Backing Paper Roll Wrapper */}
                <div 
                  className={cn(
                    "continuous-backing-paper flex flex-col items-center relative transition-all duration-300",
                    previewContinuous 
                      ? "shadow-xl border-x-[1.5px] border-dashed border-[#D2C095] pt-[15mm] pb-[15mm] print:shadow-none print:border-none print:pt-0 print:pb-0" 
                      : "pt-0 pb-0"
                  )}
                  style={previewContinuous ? {
                    width: `${activeWidth + 8}mm`,
                    background: 'linear-gradient(to right, #F3E6C4 0%, #FAF1D7 8%, #FDF7E7 50%, #FAF1D7 92%, #F3E6C4 100%)',
                  } : {}}
                >
                  
                  {/* Dynamic Scale Ruler (Right Side) - Hidden in Print */}
                  {previewContinuous && (
                    <div className="absolute right-[-45px] top-0 bottom-0 w-[40px] flex flex-col items-start justify-center print:hidden text-slate-500 font-mono select-none">
                      {/* Label Height Indicator */}
                      <div className="absolute flex flex-col items-center justify-center"
                           style={{ 
                             top: `${35 + upperGap}mm`, 
                             height: `${activeHeight}mm`
                           }}
                      >
                        <div className="w-[1px] bg-slate-400 h-full relative flex items-center justify-center">
                          <div className="absolute top-0 w-2 h-[1px] bg-slate-400"></div>
                          <div className="bg-[#D1D4D9] px-1 py-0.5 text-[8px] font-black text-slate-600 rotate-90 whitespace-nowrap shadow-sm border border-slate-300 rounded">
                            標籤 {activeHeight}mm
                          </div>
                          <div className="absolute bottom-0 w-2 h-[1px] bg-slate-400"></div>
                        </div>
                      </div>
                      
                      {/* Upper Label Gap Indicator */}
                      {upperGap > 0 && (
                        <div className="absolute flex flex-col items-center justify-center animate-in fade-in duration-200"
                             style={{ 
                               top: `35mm`, 
                               height: `${upperGap}mm`
                             }}
                        >
                          <div className="w-[1px] bg-red-400 h-full relative flex items-center justify-center">
                            <div className="absolute top-0 w-2 h-[1px] bg-red-400"></div>
                            <div className="bg-red-50 text-red-600 px-1 py-0.5 text-[7px] font-black absolute left-2 whitespace-nowrap shadow-sm border border-red-200 rounded">
                              間距 {upperGap.toFixed(1).replace(/\.0$/, '')}mm
                            </div>
                            <div className="absolute bottom-0 w-2 h-[1px] bg-red-400"></div>
                          </div>
                        </div>
                      )}

                      {/* Lower Label Gap Indicator */}
                      {lowerGap > 0 && (
                        <div className="absolute flex flex-col items-center justify-center animate-in fade-in duration-200"
                             style={{ 
                               top: `${35 + upperGap + activeHeight}mm`, 
                               height: `${lowerGap}mm`
                             }}
                        >
                          <div className="w-[1px] bg-red-400 h-full relative flex items-center justify-center">
                            <div className="absolute top-0 w-2 h-[1px] bg-red-400"></div>
                            <div className="bg-red-50 text-red-600 px-1 py-0.5 text-[7px] font-black absolute left-2 whitespace-nowrap shadow-sm border border-red-200 rounded">
                              間距 {lowerGap.toFixed(1).replace(/\.0$/, '')}mm
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
                        height: '20mm',
                        marginBottom: `${upperGap}mm`,
                        overflow: 'hidden'
                      }}
                    >
                      <div className="w-full border-b border-black pb-1 flex justify-between items-center text-[5.5pt]">
                        <span className="font-bold">PREVIOUS LABEL</span>
                        <span className="font-mono">GAP: {upperGap.toFixed(1).replace(/\.0$/, '')}mm</span>
                      </div>
                    </div>
                  )}

                  {/* 2. Main Active Label */}
                  <div 
                    id="printable-label"
                    style={getLabelStyle()}
                    className="relative shadow-md print:shadow-none shrink-0 transition-shadow rounded-none"
                  >
            {/* 1. Header (Brand Logo, Product Title) */}
            {labelSize !== '70x50' ? (
              <div className="w-full border-b-[0.8mm] border-black pb-[1.5mm] flex justify-between items-center shrink-0">
                {showBranding && (
                  <div className="flex items-center gap-[2.5mm] overflow-hidden">
                    <div style={{ width: '12mm', height: '12mm' }} className="shrink-0 flex items-center justify-center border border-black rounded-lg p-1 bg-white">
                      {renderLabelLogo()}
                    </div>
                    <div className="flex flex-col justify-center text-black">
                      <span className="font-extrabold text-[12pt] tracking-wide leading-none text-black">{brandNameZh}</span>
                      <span className="font-bold text-[5.5pt] tracking-widest text-black uppercase mt-0.5 leading-none">{brandNameEn}</span>
                    </div>
                  </div>
                )}
                
                <div className="text-right flex-1 pl-[3mm] overflow-hidden">
                  {showProductZh && (
                    <h1 className="font-black text-[13pt] tracking-tight leading-none text-black break-words">
                      {productZh}
                    </h1>
                  )}
                  {showProductEn && (
                    <span className="font-extrabold text-[6.2pt] tracking-wide uppercase text-black block mt-1.5 leading-none truncate">
                      {productEn}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              // Mini Header layout (70x50)
              <div className="w-full border-b-[0.5mm] border-black pb-[0.5mm] flex justify-between items-end shrink-0">
                <span className="font-black text-[9pt] leading-none text-black">{productZh}</span>
                <span className="font-bold text-[5.5pt] text-black leading-none">{brandNameZh}</span>
              </div>
            )}

            {/* 2. Main content adaptive body */}
            {labelSize !== '70x50' ? (
              // Grid structure for big labels: Left (Reheating), Right (Ingredients/Nutrition/Info)
              // If showReheating is unchecked, it collapses to 1 full-width column to let items fill space horizontally!
              <div className={cn(
                "flex-1 grid gap-[3mm] py-[2mm] min-h-0 text-black",
                showReheating ? "grid-cols-[1.1fr_1fr]" : "grid-cols-1"
              )}>
                
                {/* Left Column: Reheating steps */}
                {showReheating && (
                  <div className="border-r-[0.3mm] border-black pr-[2mm] flex flex-col justify-between gap-[2.5mm] min-h-0 overflow-hidden text-black h-full">
                    <div className="flex justify-center">
                      <span 
                        style={{ fontSize: `${reheatingMainTitleSize}pt` }}
                        className="font-black bg-black text-white px-[2mm] py-[0.5mm] rounded-[0.5mm] text-center leading-none"
                      >
                        {reheatingMainTitle}
                      </span>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-around py-[1mm]">
                      {[
                        { title: airFryerTitle, steps: airFryerSteps },
                        { title: ovenTitle, steps: ovenSteps },
                        { title: panTitle, steps: panSteps }
                      ].map((m, idx) => (
                        <div key={idx} className="flex flex-col gap-[0.5mm] text-black">
                          <strong 
                            style={{ fontSize: `${reheatingSubTitleSize}pt` }}
                            className="font-extrabold text-black"
                          >
                            ├─ {m.title}
                          </strong>
                          <p 
                            style={{ fontSize: `${reheatingContentSize}pt` }}
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
                {/* h-full + flex + justify-between guarantees items stretch out evenly to fill empty vertical gaps! */}
                <div className="flex flex-col justify-between gap-[2.5mm] min-h-0 h-full text-black">
                  {/* Ingredients */}
                  {showIngredients && (
                    <div className="flex flex-col gap-[1mm] min-h-0 overflow-hidden text-black flex-1 justify-start">
                      <span className="font-black text-[7pt] bg-black text-white px-[1.5mm] py-[0.3mm] rounded-[0.3mm] self-start leading-none shrink-0 mb-1">
                        成分標示
                      </span>
                      <p className="font-semibold text-justify word-break break-all text-black pl-0.5 leading-[1.3] text-[6.6pt] overflow-y-auto">
                        {ingredientsText}
                      </p>
                    </div>
                  )}

                  {/* Expiry / Weight */}
                  {!shouldMoveInfoToBottomLeft && (showNetWeight || showStorage || showExpiry) && (
                    <div className="text-[6.8pt] leading-[1.35] font-bold space-y-[0.6mm] border-t-[0.2mm] border-dashed border-black pt-2 text-black shrink-0">
                      {showNetWeight && (
                        <div className="flex justify-between text-black">
                          <span>淨重或容量：</span>
                          <span className="font-mono">{netWeight}</span>
                        </div>
                      )}
                      {showStorage && (
                        <div className="flex justify-between text-black">
                          <span>保存條件：</span>
                          <span>{storageCondition}</span>
                        </div>
                      )}
                      {showExpiry && (
                        <>
                          <div className="flex justify-between text-black">
                            <span>保存期限：</span>
                            <span>{shelfLife}</span>
                          </div>
                          <div className="flex justify-between font-black text-black">
                            <span>有效日期：</span>
                            <span className="font-mono">
                              {expiryOption === 'printed' ? '標示於封口處' : expiryDate}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Allergen alert */}
                  {showAllergens && allergenWarning && (
                    <div className="text-[6pt] font-black text-black bg-white p-[1.2mm] rounded-[0.5mm] border-[0.25mm] border-black border-dashed leading-[1.2] shrink-0">
                      ⚠️ 警告：{allergenWarning}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              // Mini Label (70x50) compact body
              <div className="flex-1 py-[1mm] flex flex-col justify-between text-[5.8pt] leading-[1.2] font-extrabold text-black">
                {showIngredients && (
                  <p className="text-justify word-break break-all text-black font-semibold">
                    <span className="font-black text-black">成份：</span>{ingredientsText}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-[2mm] border-t-[0.1mm] border-black pt-[1mm] mt-[0.5mm]">
                  <div>
                    {showNetWeight && <p><span className="font-black">淨重：</span>{netWeight}</p>}
                    {showStorage && <p><span className="font-black">保存：</span>{storageCondition}</p>}
                    {showExpiry && <p><span className="font-black">效期：</span>{shelfLife}</p>}
                  </div>
                  <div className="text-right">
                    {showExpiry && (
                      <p className="font-black text-black">
                        有效：{expiryOption === 'printed' ? '標示於包裝' : expiryDate}
                      </p>
                    )}
                    {showOrigin && originCountry && <p><span className="font-black">產地：</span>{originCountry}</p>}
                  </div>
                </div>

                {showAllergens && (
                  <p className="text-[5pt] font-black text-black bg-white border-[0.1mm] border-dashed border-black p-0.5 mt-0.5">
                    過敏原：{allergenWarning.replace('本產品含有', '').replace('，不適合對其過敏體質者食用。', '')}
                  </p>
                )}
              </div>
            )}

            {/* 3. Bottom Row: Nutrition facts table & corporate details & QR code */}
            {labelSize !== '70x50' ? (
              // Dynamic Grid: If showNutrition is unchecked, this collapses to grid-cols-1, letting corporate details and QR code expand to full width!
              <div className={cn(
                "w-full border-t-[0.8mm] border-black pt-[2mm] grid gap-[3mm] shrink-0 items-end text-black",
                showNutrition ? "grid-cols-[1.1fr_1fr]" : "grid-cols-1"
              )}>
                
                {/* Bottom Left: Corporate Details + Barcode Area */}
                {/* If showNutrition is FALSE, we layout corporate details and QR code side-by-side using "flex justify-between" to fill up the bottom space perfectly! */}
                <div className={cn(
                  "overflow-hidden text-black w-full",
                  showNutrition ? "space-y-[2mm]" : "flex justify-between items-end gap-[4mm] border-b-[0.1mm] border-dashed border-slate-300 pb-1"
                )}>
                  {shouldMoveInfoToBottomLeft && (showNetWeight || showStorage || showExpiry) && (
                    <div className="text-[6.8pt] leading-[1.35] font-bold space-y-[0.6mm] border-b-[0.2mm] border-dashed border-black pb-2 mb-2 text-black shrink-0">
                      {showNetWeight && (
                        <div className="flex justify-between text-black">
                          <span>淨重或容量：</span>
                          <span className="font-mono">{netWeight}</span>
                        </div>
                      )}
                      {showStorage && (
                        <div className="flex justify-between text-black">
                          <span>保存條件：</span>
                          <span>{storageCondition}</span>
                        </div>
                      )}
                      {showExpiry && (
                        <>
                          <div className="flex justify-between text-black">
                            <span>保存期限：</span>
                            <span>{shelfLife}</span>
                          </div>
                          <div className="flex justify-between font-black text-black">
                            <span>有效日期：</span>
                            <span className="font-mono">
                              {expiryOption === 'printed' ? '標示於封口處' : expiryDate}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {showResponsible && (
                    <div className={cn(
                      "text-[6.2pt] leading-[1.3] text-black font-semibold",
                      showNutrition ? "" : "flex-1"
                    )}>
                      {showAddress && (
                        <div className="flex gap-[0.5mm]">
                          <span className="font-black text-black shrink-0">地址：</span>
                          <span>{companyAddress}</span>
                        </div>
                      )}
                      {showPhone && (
                        <div className="flex gap-[0.5mm]">
                          <span className="font-black text-black shrink-0">電話：</span>
                          <span className="font-mono">{companyPhone}</span>
                        </div>
                      )}
                      {showOrigin && (
                        <div className="flex gap-[0.5mm]">
                          <span className="font-black text-black shrink-0">原產地：</span>
                          <span className="font-extrabold text-black">{originCountry}</span>
                        </div>
                      )}
                      {showManufacturer && (
                        <div className="flex gap-[0.5mm] mt-0.5 text-[5.8pt] text-black">
                          <span>製造商：</span>
                          <span className="truncate">{companyName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code Barcode area (Real SVG dynamic vector QR code!) */}
                  {showBarcode && (
                    <div className={cn(
                      "flex items-center gap-[2mm] shrink-0",
                      showNutrition 
                        ? "border-t-[0.2mm] border-dashed border-black pt-[1.5mm]" 
                        : "border-l-[0.2mm] border-dashed border-black pl-[4mm] py-0.5"
                    )}>
                      <div className="p-0.5 bg-white border border-black shrink-0 flex items-center justify-center">
                        <QRCodeSVG 
                          value={barcodeText || "https://pizzastudio.com"} 
                          size={32}
                          level="M"
                          fgColor="#000000"
                          bgColor="#ffffff"
                        />
                      </div>
                      <span className="text-[5.2pt] font-sans font-black leading-tight text-black break-all">
                        掃碼查看<br />復熱教學影片
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Right: Taiwan Nutrition Facts Table */}
                {showNutrition && (
                  <div className="flex flex-col justify-end text-black shrink-0 border border-black p-1 bg-white">
                    {/* 營 養 標 示 標題，加粗並置中，下方一條粗線 */}
                    <div className="text-[7pt] font-black text-center border-b-[0.25mm] border-black pb-0.5 tracking-[1mm] text-black leading-none">
                      營 養 標 示
                    </div>
                    {/* 份量資訊獨立分行，下方有一條細線區隔 */}
                    <div className="text-[5.5pt] font-bold text-left py-1 leading-normal border-b-[0.15mm] border-black text-black">
                      每一份量 {portionSize} 公克<br />
                      本包裝含 {portionsPerPkg} 份
                    </div>
                    
                    {/* 表格：最左表頭空白，右邊是「每份」與標準中文「每 100 公克」 */}
                    <table className="w-full text-center border-collapse text-[5.8pt] font-black mt-0.5 text-black">
                      <thead>
                        <tr className="border-b-[0.15mm] border-black text-[5pt] text-black">
                          <th className="py-[0.2mm] text-left pl-[0.5mm] text-black font-black"></th>
                          <th className="py-[0.2mm] text-right pr-[0.5mm] text-black font-black w-[28%]">每份</th>
                          <th className="py-[0.2mm] text-right pr-[0.5mm] text-black font-black w-[36%]">每 100 公克</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-black">
                        {[
                          { name: '熱量', valPer100: Number(calories), unit: '大卡', isZeroLimit: 0 },
                          { name: '蛋白質', valPer100: Number(protein), unit: '公克', isZeroLimit: 0 },
                          { name: '脂肪', valPer100: Number(fat), unit: '公克', isZeroLimit: 0 },
                          { name: '  飽和脂肪', valPer100: Number(saturatedFat), unit: '公克', isZeroLimit: 0.1 },
                          { name: '  反式脂肪', valPer100: Number(transFat), unit: '公克', isZeroLimit: 0.3 },
                          { name: '碳水化合物', valPer100: Number(carbs), unit: '公克', isZeroLimit: 0 },
                          { name: '  糖', valPer100: Number(sugar), unit: '公克', isZeroLimit: 0.5 },
                          { name: '鈉', valPer100: Number(sodium), unit: '毫克', isZeroLimit: 5 },
                        ].map((row, idx) => {
                          const sizeRatio = Number(portionSize) / 100;
                          
                          // 計算每份與每百克數值
                          const valPerPortion = row.valPer100 * sizeRatio;
                          const val100 = row.valPer100;

                          // 格式化輸出數值，預設保留一位小數且過濾掉小數點後的零（例如 12.0 顯示 12）
                          let displayPortion = valPerPortion.toFixed(1).replace(/\.0$/, '');
                          let display100 = val100.toFixed(1).replace(/\.0$/, '');

                          // 套用台灣衛福部「零標示」與「鈉整數」防呆法規
                          if (row.name.trim() === '鈉') {
                            displayPortion = valPerPortion < 5 ? '0' : Math.round(valPerPortion).toString();
                            display100 = val100 < 5 ? '0' : Math.round(val100).toString();
                          } else if (row.isZeroLimit > 0) {
                            if (valPerPortion <= row.isZeroLimit) displayPortion = '0';
                            if (val100 <= row.isZeroLimit) display100 = '0';
                          }

                          // 依據法規標準樣式：橫線僅畫於主項目（蛋白質、脂肪、碳水化合物、鈉）上方，子項目（飽和/反式脂肪、糖）內部不畫線
                          const hasBorderTop = [1, 2, 5, 7].includes(idx);

                          return (
                            <tr 
                              key={idx} 
                              className={cn(
                                "text-black font-black",
                                hasBorderTop && "border-t-[0.1mm] border-black"
                              )}
                            >
                              <td className={cn(
                                "py-[0.2mm] text-left font-sans pl-[0.5mm] text-black",
                                row.name.startsWith('  ') ? "pl-[2mm] font-semibold text-black" : "font-black text-black"
                              )}>
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
              <div className="w-full border-t-[0.4mm] border-black pt-[0.5mm] flex justify-between items-center text-[5.2pt] text-black font-black shrink-0">
                {showResponsible && (
                  <span className="leading-none truncate max-w-[48mm]">
                    負責商：{companyName} · 電話: {companyPhone}
                  </span>
                )}
                {showBarcode && (
                  <span className="font-mono text-[4.2pt] leading-none shrink-0 font-black border-[0.1mm] border-black px-0.5 rounded-[0.2mm]">
                    QR: Cook Info
                  </span>
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
                height: '20mm',
                marginTop: `${lowerGap}mm`,
                overflow: 'hidden'
              }}
            >
              <div className="w-full border-b border-black pb-1 flex justify-between items-center text-[5.5pt]">
                <span className="font-bold">NEXT LABEL</span>
                <span className="font-mono">GAP: {lowerGap.toFixed(1).replace(/\.0$/, '')}mm</span>
              </div>
            </div>
          )}

                </div>
              </div>
            );
          })()}

          <p className="text-[10px] text-gray-500 font-bold mt-6 print:hidden">
            💡 提示：點擊右上角的「列印標籤」會調用瀏覽器列印。建議在列印設定中將邊距設為「無」，背景圖形設為「啟用」。
          </p>
        </div>

      </div>

      {/* Printing Media Style for Thermal Printer */}
      <style>{`
        /* Prevent scrollbars inside label rendering container */
        #printable-label::-webkit-scrollbar {
          display: none !important;
        }
        #printable-label {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        @media print {
          /* Force absolute sharp rectangular borders on all elements in print mode */
          * {
            border-radius: 0px !important;
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
            margin: ${
              gapAlignment === 'top' ? `${labelGap}mm auto 0` :
              gapAlignment === 'center' ? `${labelGap / 2}mm auto 0` :
              `0 auto`
            } !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            size: ${
              labelSize === '100x100' ? `100mm ${100 + (includeGapInPrint ? labelGap : 0)}mm` :
              labelSize === '80x80' ? `80mm ${80 + (includeGapInPrint ? labelGap : 0)}mm` :
              labelSize === '100x150' ? `100mm ${150 + (includeGapInPrint ? labelGap : 0)}mm` :
              `70mm ${50 + (includeGapInPrint ? labelGap : 0)}mm`
            };
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Labels;
