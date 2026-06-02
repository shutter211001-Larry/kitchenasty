import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, AlertTriangle, Scale, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { AllergenManagerModal } from './AllergenManagerModal';

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
  ingredient: Ingredient | 'new';
  onClose: () => void;
  onSuccess: () => void;
}

const EditIngredientModal = ({ ingredient, onClose, onSuccess }: Props) => {
  const isCreate = ingredient === 'new';
  
  const [activeTab, setActiveTab] = useState<'basic' | 'nutrition' | 'conversions'>('basic');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [isAllergenMgrOpen, setIsAllergenMgrOpen] = useState(false);
  
  // Master lists
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allAllergens, setAllAllergens] = useState<Allergen[]>([]);

  // Form State
  const [formData, setFormData] = useState<Ingredient>({
    name: '',
    category: '麵粉類',
    unit: 'g',
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
    allergenType: '',
    unitConversions: [],
    components: ''
  });

  // Purchase Package Price State
  const [priceInfo, setPriceInfo] = useState({
    packageSize: '',
    packageUnit: 'kg',
    price: '',
    supplierId: ''
  });

  // Selected Allergen IDs
  const [allergenIds, setAllergenIds] = useState<string[]>([]);

  // Conversion Row State
  const [newFromUnit, setNewFromUnit] = useState('');
  const [newMultiplier, setNewMultiplier] = useState<number | ''>('');

  const loadSuppliersAndAllergens = async () => {
    try {
      const [suppRes, allerRes] = await Promise.all([
        axios.get('http://localhost:3000/api/suppliers'),
        axios.get('http://localhost:3000/api/allergens')
      ]);
      setSuppliers(suppRes.data);
      setAllAllergens(allerRes.data);
    } catch (error) {
      console.error('Failed to load suppliers or allergens', error);
    }
  };

  const fetchIngredientDetails = async () => {
    if (isCreate || !ingredient.id) return;
    try {
      setFetchLoading(true);
      const response = await axios.get(`http://localhost:3000/api/ingredients/${ingredient.id}`);
      const data = response.data;
      setFormData({
        ...data,
        category: data.category || '',
        allergenType: data.allergenType || '',
        unitConversions: data.unitConversions || []
      });

      // Load allergen tags relations
      if (data.allergens) {
        setAllergenIds(data.allergens.map((a: Allergen) => a.id));
      }

      // Load package pricing
      if (data.prices && data.prices.length > 0) {
        const defaultPrice = data.prices.find((p: any) => p.isDefault) || data.prices[0];
        setPriceInfo({
          packageSize: String(defaultPrice.packageSize),
          packageUnit: defaultPrice.packageUnit,
          price: String(defaultPrice.price),
          supplierId: defaultPrice.supplierId || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch full ingredient details', error);
    } finally {
      setFetchLoading(false);
    }
  };

  // Helper unit multiplier
  const getUnitMultiplier = (packageUnit: string, baseUnit: string): number => {
    const pu = packageUnit.trim().toLowerCase();
    const bu = baseUnit.trim().toLowerCase();
    
    if (bu === 'g') {
      if (pu === 'kg' || pu === '公斤') return 1000;
      if (pu === 'g' || pu === '公克') return 1;
      if (pu === '台斤' || pu === '斤') return 600;
    }
    if (bu === 'ml') {
      if (pu === 'l' || pu === '公升') return 1000;
      if (pu === 'ml' || pu === '毫升') return 1;
    }
    return 1;
  };

  // Live Unit Cost calculator
  const calculateLiveUnitPrice = (): string | null => {
    const size = parseFloat(priceInfo.packageSize);
    const pVal = parseFloat(priceInfo.price);
    if (!isNaN(size) && !isNaN(pVal) && size > 0 && pVal > 0) {
      const multiplier = getUnitMultiplier(priceInfo.packageUnit, formData.unit);
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
        name: '',
        category: '麵粉類',
        unit: 'g',
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
        allergenType: '',
        unitConversions: [],
        components: ''
      });
      setPriceInfo({
        packageSize: '',
        packageUnit: 'kg',
        price: '',
        supplierId: ''
      });
      setAllergenIds([]);
    } else {
      setFormData({
        ...ingredient,
        category: ingredient.category || '',
        allergenType: ingredient.allergenType || '',
        unitConversions: ingredient.unitConversions || []
      });
      fetchIngredientDetails();
    }
  }, [ingredient]);

  // Handle unit updates and sync pricing package options
  const handleUnitChange = (newUnit: string) => {
    setFormData(prev => ({ ...prev, unit: newUnit }));
    // Update default package units depending on the base unit
    if (newUnit === 'g') {
      setPriceInfo(prev => ({ ...prev, packageUnit: 'kg' }));
    } else if (newUnit === 'ml') {
      setPriceInfo(prev => ({ ...prev, packageUnit: 'L' }));
    } else {
      setPriceInfo(prev => ({ ...prev, packageUnit: '個' }));
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
        safetyStock: formData.safetyStock !== null && (formData.safetyStock as any) !== '' ? Number(formData.safetyStock) : null,
        calories: formData.calories != null ? Number(formData.calories) : null,
        protein: formData.protein != null ? Number(formData.protein) : null,
        fat: formData.fat != null ? Number(formData.fat) : null,
        carbohydrates: formData.carbohydrates != null ? Number(formData.carbohydrates) : null,
        sodium: formData.sodium != null ? Number(formData.sodium) : null,
        saturatedFat: formData.saturatedFat != null ? Number(formData.saturatedFat) : null,
        transFat: formData.transFat != null ? Number(formData.transFat) : null,
        sugar: formData.sugar != null ? Number(formData.sugar) : null,
        isAllergen: formData.isAllergen || false,
        allergenType: formData.isAllergen ? formData.allergenType || null : null,
        allergenIds: formData.isAllergen ? allergenIds : [],
        components: formData.components || null,
        priceInfo: priceInfo.packageSize && priceInfo.price ? {
          packageSize: Number(priceInfo.packageSize),
          packageUnit: priceInfo.packageUnit,
          price: Number(priceInfo.price),
          supplierId: priceInfo.supplierId || null
        } : null
      };

      if (isCreate) {
        await axios.post('http://localhost:3000/api/ingredients', payload);
      } else {
        await axios.patch(`http://localhost:3000/api/ingredients/${(ingredient as Ingredient).id}`, payload);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save ingredient', error);
      const errMsg = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`儲存失敗: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (ingredient === 'new' || !ingredient?.id) return;
    if (!window.confirm(`確定要刪除食材「${ingredient.name}」嗎？\n\n注意：此操作無法復原，且會一併刪除該食材的所有報價合約。`)) return;
    
    try {
      setLoading(true);
      await axios.delete(`http://localhost:3000/api/ingredients/${ingredient.id}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to delete ingredient', error);
      alert(error.response?.data?.error || '刪除失敗，該食材可能正在被使用');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConversion = async () => {
    if (!newFromUnit || newMultiplier === '' || Number(newMultiplier) <= 0) {
      alert('請填入有效的來源單位與換算比例');
      return;
    }
    if (isCreate || !ingredient.id) return;

    const exists = (formData.unitConversions || []).some(
      (c: any) => c.fromUnit.trim().toLowerCase() === newFromUnit.trim().toLowerCase()
    );
    if (exists) {
      alert('該單位已存在換算');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`http://localhost:3000/api/ingredients/${ingredient.id}/conversions`, {
        fromUnit: newFromUnit,
        toUnit: formData.unit,
        multiplier: Number(newMultiplier)
      });
      
      setFormData(prev => ({
        ...prev,
        unitConversions: [...(prev.unitConversions || []), response.data]
      }));
      setNewFromUnit('');
      setNewMultiplier('');
    } catch (error) {
      console.error('Failed to add conversion', error);
      alert('新增換算失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversion = async (convId: string) => {
    if (isCreate || !ingredient.id) return;
    if (!confirm('確認刪除此單位換算規則？')) return;

    try {
      setLoading(true);
      await axios.delete(`http://localhost:3000/api/ingredients/${ingredient.id}/conversions/${convId}`);
      setFormData(prev => ({
        ...prev,
        unitConversions: (prev.unitConversions || []).filter(c => c.id !== convId)
      }));
    } catch (error) {
      console.error('Failed to delete conversion', error);
      alert('刪除換算失敗');
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
              {isCreate ? '新增原料食材' : `編輯 - ${formData.name}`}
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              {isCreate ? '建立' : '維護'}
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
            onClick={() => setActiveTab('basic')}
            className={cn(
              "flex-1 py-3 text-xs font-bold border-b-2 transition-all",
              activeTab === 'basic' ? "border-primary text-primary bg-white" : "border-transparent text-muted-foreground hover:text-gray-800"
            )}
          >
            基本與庫存
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nutrition')}
            className={cn(
              "flex-1 py-3 text-xs font-bold border-b-2 transition-all",
              activeTab === 'nutrition' ? "border-primary text-primary bg-white" : "border-transparent text-muted-foreground hover:text-gray-800"
            )}
          >
            營養標示
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('conversions')}
            className={cn(
              "flex-1 py-3 text-xs font-bold border-b-2 transition-all",
              activeTab === 'conversions' ? "border-primary text-primary bg-white" : "border-transparent text-muted-foreground hover:text-gray-800"
            )}
          >
            單位換算
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
          {fetchLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground font-medium">載入中...</span>
            </div>
          ) : (
            <div className="flex-1 space-y-4">
              {/* Tab 1: Basic Information & Stock */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-gray-700">食材名稱 <span className="text-destructive">*</span></label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="例如: 蘭花莫札瑞拉起司"
                      />
                    </div>
                    
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-gray-700">食材內容物 (以逗號分隔，用於標籤展開)</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        value={formData.components || ''}
                        onChange={(e) => setFormData({ ...formData, components: e.target.value })}
                        placeholder="例如: 小麥麵粉, 水, 鹽, 酵母"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">分類</label>
                      <select
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="麵粉類">麵粉類</option>
                        <option value="肉類">肉類</option>
                        <option value="蔬菜類">蔬菜類</option>
                        <option value="醬料類">醬料類</option>
                        <option value="起司乳酪">起司乳酪</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">庫存基礎單位 <span className="text-destructive">*</span></label>
                      <select
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                        value={formData.unit}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        required
                      >
                        <option value="g">g (公克)</option>
                        <option value="ml">ml (毫升)</option>
                        <option value="個">個 (件/顆/片)</option>
                      </select>
                    </div>
                  </div>

                  {/* Pricing packaging section */}
                  <div className="border-t border-border/60 my-2 pt-4 space-y-4 animate-in fade-in duration-200">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">採購包裝與價格 (採購防呆計價)</h4>
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 border border-border rounded-2xl">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">包裝大小 (規格)</label>
                        <input 
                          type="number" 
                          step="any"
                          placeholder="例如: 2.5, 600"
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-sm text-right"
                          value={priceInfo.packageSize}
                          onChange={(e) => setPriceInfo({ ...priceInfo, packageSize: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">包裝單位</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                          value={priceInfo.packageUnit}
                          onChange={(e) => setPriceInfo({ ...priceInfo, packageUnit: e.target.value })}
                        >
                          {formData.unit === 'g' ? (
                            <>
                              <option value="kg">kg (公斤)</option>
                              <option value="g">g (公克)</option>
                              <option value="台斤">台斤 (600g)</option>
                            </>
                          ) : formData.unit === 'ml' ? (
                            <>
                              <option value="L">L (公升)</option>
                              <option value="ml">ml (毫升)</option>
                            </>
                          ) : (
                            <option value="個">個 (Pcs)</option>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">包裝價格 (NT$)</label>
                        <input 
                          type="number" 
                          step="any"
                          placeholder="例如: 800"
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-sm text-right"
                          value={priceInfo.price}
                          onChange={(e) => setPriceInfo({ ...priceInfo, price: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">供應商 (選填)</label>
                        <select
                          className="w-full px-3 py-2 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                          value={priceInfo.supplierId}
                          onChange={(e) => setPriceInfo({ ...priceInfo, supplierId: e.target.value })}
                        >
                          <option value="">-- 無 (建立預設供應商) --</option>
                          {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      {calculateLiveUnitPrice() && (
                        <div className="col-span-2 mt-1 py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
                          <span className="text-[10px] text-emerald-600 font-bold">自動計算基礎單價：</span>
                          <span className="text-xs font-black text-emerald-700 font-mono">{calculateLiveUnitPrice()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border/60 my-2 pt-4 space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">庫存與警戒線</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">當前庫存 ({formData.unit})</label>
                        <input 
                          type="number" 
                          step="any"
                          className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-sm text-right"
                          value={formData.currentStock}
                          onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                          required
                          disabled={!isCreate}
                        />
                        {!isCreate && (
                          <p className="text-[10px] text-muted-foreground">編輯模式下庫存由進出料管理</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">安全水位 ({formData.unit})</label>
                        <input 
                          type="number" 
                          step="any"
                          className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-sm text-right"
                          value={formData.safetyStock !== null && formData.safetyStock !== undefined ? formData.safetyStock : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData({ 
                              ...formData, 
                              safetyStock: val === '' ? null : (parseFloat(val) || 0) 
                            });
                          }}
                          placeholder="未啟用警戒"
                        />
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                          庫存低於此數值將警示補貨
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Nutrition Information */}
              {activeTab === 'nutrition' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 flex gap-2.5">
                    <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[11px] text-amber-800 leading-normal font-extrabold uppercase">
                        每 100g / 100ml 之營養含量輸入 (法規必要項目)
                      </p>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        請翻到產品包裝後面的營養標示，輸入其「每一百克」或「每一百毫升」所對應的含量數值。依食藥署規定，包裝食品必須強制標示包括熱量、蛋白質、脂肪、飽和脂肪、反式脂肪、碳水化合物、糖、鈉之「八大營養素」，以供食譜配方加總與標籤輸出。
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">熱量 (kcal / 100g) <span className="text-destructive font-black">*</span></label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="未填寫"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.calories ?? ''}
                        onChange={(e) => setFormData({ ...formData, calories: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">鈉 (mg / 100g) <span className="text-destructive font-black">*</span></label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="未填寫"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.sodium ?? ''}
                        onChange={(e) => setFormData({ ...formData, sodium: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">蛋白質 (g / 100g) <span className="text-destructive font-black">*</span></label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="未填寫"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.protein ?? ''}
                        onChange={(e) => setFormData({ ...formData, protein: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">碳水化合物 (g / 100g) <span className="text-destructive font-black">*</span></label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="未填寫"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.carbohydrates ?? ''}
                        onChange={(e) => setFormData({ ...formData, carbohydrates: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">脂肪 (g / 100g) <span className="text-destructive font-black">*</span></label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="未填寫"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm text-right"
                        value={formData.fat ?? ''}
                        onChange={(e) => setFormData({ ...formData, fat: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">飽和脂肪 (g / 100g) <span className="text-rose-500 font-black">*</span></label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="例如: 12.5"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-mono text-sm text-right"
                        value={formData.saturatedFat ?? ''}
                        onChange={(e) => setFormData({ ...formData, saturatedFat: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">反式脂肪 (g / 100g) <span className="text-rose-500 font-black">*</span></label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="無則輸入 0"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-mono text-sm text-right"
                        value={formData.transFat ?? ''}
                        onChange={(e) => setFormData({ ...formData, transFat: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">糖 (g / 100g) <span className="text-rose-500 font-black">*</span></label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="例如: 4.5"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-mono text-sm text-right"
                        value={formData.sugar ?? ''}
                        onChange={(e) => setFormData({ ...formData, sugar: e.target.value === '' ? null : parseFloat(e.target.value) })}
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
                          onChange={(e) => setFormData({ ...formData, isAllergen: e.target.checked })}
                        />
                        <label htmlFor="isAllergen" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                          此食材含有過敏原
                        </label>
                      </div>
                      
                      {formData.isAllergen && (
                        <button
                          type="button"
                          onClick={() => setIsAllergenMgrOpen(true)}
                          className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-all"
                        >
                          ⚙️ 管理過敏原標籤
                        </button>
                      )}
                    </div>

                    {formData.isAllergen && (
                      <div className="space-y-2 animate-in slide-in-from-top-1 duration-150">
                        <label className="text-[10px] font-bold text-gray-500 block">選取的過敏原種類 (可多選)</label>
                        {allAllergens.length === 0 ? (
                          <div className="text-[10px] text-muted-foreground italic py-4 text-center border border-dashed border-border rounded-xl">
                            尚未建立任何過敏原標籤。請點擊右上角「⚙️ 管理過敏原標籤」新增。
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
                                      setAllergenIds(prev => prev.filter(id => id !== tag.id));
                                    } else {
                                      setAllergenIds(prev => [...prev, tag.id]);
                                    }
                                  }}
                                  className={cn(
                                    "px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-150 active:scale-95",
                                    selected 
                                      ? "bg-rose-500 text-white border-rose-600 shadow-sm" 
                                      : "bg-white text-gray-600 border-border hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
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
              {activeTab === 'conversions' && (
                <div className="space-y-4">
                  {isCreate ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-muted-foreground border border-dashed border-border rounded-2xl p-6 bg-muted/5">
                      <ShieldAlert className="w-10 h-10 mb-2.5 text-gray-400" />
                      <p className="text-xs font-bold text-gray-600">請先建立食材！</p>
                      <p className="text-[10px] mt-1">單位換算需要將規則鏈結到已建立的食材ID，請先填妥「基本與庫存」並點擊下方的【確認建立】，隨後即可進行進階的單位換算設定。</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex gap-2.5">
                        <Scale className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[11px] text-primary/80 leading-normal font-medium">
                          此處可定義「抽象計量單位」與「基礎儲存單位 ({formData.unit})」之間的換算公式。例如當配方中使用 1「杯」時，系統能自動得知為多少 <strong>{formData.unit}</strong>，以便計算熱量與扣減庫存。
                        </p>
                      </div>

                      {/* Add new conversion row */}
                      <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-gray-700">新增自訂單位換算規則</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center bg-white border border-border rounded-xl px-3 py-1.5 gap-2 shadow-sm">
                            <span className="text-xs text-muted-foreground font-bold shrink-0">1</span>
                            <input 
                              type="text"
                              placeholder="來源單位 (如: 杯, 顆)"
                              className="w-full bg-transparent text-xs font-bold outline-none text-gray-800"
                              value={newFromUnit}
                              onChange={(e) => setNewFromUnit(e.target.value)}
                            />
                          </div>
                          <span className="text-xs font-black text-gray-400">=</span>
                          <div className="w-24 flex items-center bg-white border border-border rounded-xl px-3 py-1.5 gap-1 shadow-sm font-mono">
                            <input 
                              type="number"
                              placeholder="數量"
                              className="w-full bg-transparent text-xs font-bold outline-none text-right"
                              value={newMultiplier}
                              onChange={(e) => setNewMultiplier(e.target.value === '' ? '' : parseFloat(e.target.value))}
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
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">已設定的換算規則</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(formData.unitConversions || []).length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic text-center py-6 border border-dashed border-border rounded-xl">
                              尚未新增任何單位換算規則，食譜引用非 {formData.unit} 單位時將無法計算營養。
                            </p>
                          ) : (
                            (formData.unitConversions || []).map((c) => (
                              <div 
                                key={c.id} 
                                className="flex items-center justify-between bg-white border border-border p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-0.5 bg-primary/10 rounded text-primary text-[10px] font-bold">公式</div>
                                  <span className="text-xs font-bold text-gray-800">
                                    1 {c.fromUnit} = <span className="font-mono text-emerald-600">{c.multiplier}</span> {c.toUnit}
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
                title="刪除此食材"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl font-bold text-xs text-gray-600 hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button 
              type="submit" 
              disabled={loading || fetchLoading}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? '儲存中...' : isCreate ? '確認建立' : '確認儲存'}
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
