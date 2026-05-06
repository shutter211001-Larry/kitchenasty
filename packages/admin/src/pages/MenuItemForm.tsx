import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

interface OptionValue {
  name: string;
  nameTranslations?: Record<string, string>;
  priceModifier: number;
  isDefault: boolean;
  sortOrder: number;
}

interface MenuOption {
  name: string;
  nameTranslations?: Record<string, string>;
  displayType: 'SELECT' | 'RADIO' | 'CHECKBOX' | 'QUANTITY';
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  values: OptionValue[];
}

interface MenuItemData {
  name: string;
  nameTranslations: Record<string, string>;
  slug: string;
  description: string;
  descriptionTranslations: Record<string, string>;
  price: number;
  isActive: boolean;
  sortOrder: number;
  trackStock: boolean;
  stockQty: number;
  categoryId: string;
  unit: string;
  unitTranslations: Record<string, string>;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface AllergenOption {
  id: string;
  name: string;
}

interface MealtimeOption {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

const emptyItem: MenuItemData = {
  name: '',
  nameTranslations: {},
  slug: '',
  description: '',
  descriptionTranslations: {},
  price: 0,
  isActive: true,
  sortOrder: 0,
  trackStock: false,
  stockQty: 0,
  categoryId: '',
  unit: '份',
  unitTranslations: {},
};

const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文 (Traditional Chinese)' },
  { code: 'en', label: '英文 (English)' },
  { code: 'ja', label: '日文 (Japanese)' },
  { code: 'ko', label: '韓文 (Korean)' },
  { code: 'th', label: '泰文 (Thai)' },
  { code: 'tl', label: '菲律賓文 (Filipino)' },
  { code: 'vi', label: '越南文 (Vietnamese)' },
  { code: 'id', label: '印尼文 (Indonesian)' },
];

const emptyOptionValue: OptionValue = { name: '', priceModifier: 0, isDefault: false, sortOrder: 0 };
const emptyOption: MenuOption = {
  name: '',
  displayType: 'SELECT',
  isRequired: false,
  minSelect: 0,
  maxSelect: 1,
  sortOrder: 0,
  values: [{ ...emptyOptionValue }],
};

export default function MenuItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<MenuItemData>(emptyItem);
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedMealtimes, setSelectedMealtimes] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [allergens, setAllergens] = useState<AllergenOption[]>([]);
  const [mealtimes, setMealtimes] = useState<MealtimeOption[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ data: CategoryOption[] }>('/menu/categories'),
      api.get<{ data: AllergenOption[] }>('/menu/allergens'),
      api.get<{ data: MealtimeOption[] }>('/menu/mealtimes'),
    ]).then(([catRes, allRes, mtRes]) => {
      setCategories(catRes.data);
      setAllergens(allRes.data);
      setMealtimes(mtRes.data);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get<{ data: any }>(`/menu/items/${id}`)
      .then((res) => {
        const item = res.data;
        setForm({
          name: item.name,
          nameTranslations: item.nameTranslations || {},
          slug: item.slug,
          description: item.description || '',
          descriptionTranslations: item.descriptionTranslations || {},
          price: item.price,
          isActive: item.isActive,
          sortOrder: item.sortOrder,
          trackStock: item.trackStock,
          stockQty: item.stockQty,
          categoryId: item.categoryId,
          unit: item.unit || '份',
          unitTranslations: item.unitTranslations || {},
        });
        if (item.image) setImageUrl(item.image);
        if (item.options?.length) {
          setOptions(item.options.map((o: any) => ({
            name: o.name,
            nameTranslations: o.nameTranslations || {},
            displayType: o.displayType,
            isRequired: o.isRequired,
            minSelect: o.minSelect,
            maxSelect: o.maxSelect,
            sortOrder: o.sortOrder,
            values: o.values.map((v: any) => ({
              name: v.name,
              nameTranslations: v.nameTranslations || {},
              priceModifier: v.priceModifier,
              isDefault: v.isDefault,
              sortOrder: v.sortOrder,
            })),
          })));
        }
        if (item.allergens?.length) {
          setSelectedAllergens(item.allergens.map((a: any) => a.allergenId));
        }
        if (item.mealtimes?.length) {
          setSelectedMealtimes(item.mealtimes.map((m: any) => m.mealtimeId));
        }
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id, isEdit]);

  const updateField = (field: keyof MenuItemData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const autoSlug = (name: string) => {
    if (!isEdit) {
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // If slug becomes empty (e.g. all Chinese), don't auto-fill it to avoid dash-only slugs
      if (slug) {
        updateField('slug', slug);
      }
    }
  };

  const addOption = () => setOptions((prev) => [...prev, { ...emptyOption, values: [{ ...emptyOptionValue }] }]);
  const removeOption = (index: number) => setOptions((prev) => prev.filter((_, i) => i !== index));

  const updateOption = (index: number, field: keyof MenuOption, value: any) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addOptionValue = (optIndex: number) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[optIndex] = {
        ...updated[optIndex],
        values: [...updated[optIndex].values, { ...emptyOptionValue }],
      };
      return updated;
    });
  };

  const removeOptionValue = (optIndex: number, valIndex: number) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[optIndex] = {
        ...updated[optIndex],
        values: updated[optIndex].values.filter((_, i) => i !== valIndex),
      };
      return updated;
    });
  };

  const updateOptionValue = (optIndex: number, valIndex: number, field: keyof OptionValue, value: any) => {
    setOptions((prev) => {
      const updated = [...prev];
      const values = [...updated[optIndex].values];
      values[valIndex] = { ...values[valIndex], [field]: value };
      updated[optIndex] = { ...updated[optIndex], values };
      return updated;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.upload<{ data: { image: string } }>(`/menu/items/${id}/image`, formData);
      setImageUrl(res.data.image);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImageRemove = async () => {
    if (!id) return;
    setUploading(true);
    setError(null);
    try {
      await api.delete(`/menu/items/${id}/image`);
      setImageUrl(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const body = {
        ...form,
        price: Number(form.price),
        sortOrder: Number(form.sortOrder),
        stockQty: Number(form.stockQty),
        options: options.length > 0 ? options : undefined,
        allergenIds: selectedAllergens,
        mealtimeIds: selectedMealtimes,
      };

      if (isEdit) {
        const { slug: _, ...updateBody } = body;
        await api.patch(`/menu/items/${id}`, updateBody);
      } else {
        await api.post('/menu/items', body);
      }
      navigate('/menu/items');
    } catch (err: any) {
      setError(err.data || err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">載入中...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {isEdit ? '編輯產品' : '新增產品'}
        </h2>
        <button onClick={() => navigate('/menu/items')} className="text-gray-500 hover:text-gray-700 text-sm">
          返回產品列表
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {typeof error === 'string' ? error : (Array.isArray(error) ? (error as any).map((err: any, i: number) => <div key={i}>{err.message || JSON.stringify(err)}</div>) : JSON.stringify(error))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本資訊 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">基本資訊 (Basic Information)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名稱 (Name) *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => { updateField('name', e.target.value); autoSlug(e.target.value); }}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">網址別名 (Slug) *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                required
                disabled={isEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">描述 (Description)</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分類 (Category) *</label>
              <select
                value={form.categoryId}
                onChange={(e) => updateField('categoryId', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">請選擇分類</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">價格 (Price) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                required
                min={0}
                step={0.01}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">單位 (如：杯、份)</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => updateField('unit', e.target.value)}
                placeholder="預設單位"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序 (Sort Order)</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => updateField('sortOrder', e.target.value)}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-6 mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">上架 (Active)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.trackStock}
                  onChange={(e) => updateField('trackStock', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">追蹤庫存 (Track Stock)</span>
              </label>
              {form.trackStock && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">庫存數量:</label>
                  <input
                    type="number"
                    value={form.stockQty}
                    onChange={(e) => updateField('stockQty', e.target.value)}
                    min={0}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Unit Translations */}
            <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">單位翻譯 (Unit Translations)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {LANGUAGES.map((lang) => (
                  <div key={lang.code}>
                    <label className="block text-[9px] text-gray-400 uppercase">{lang.code}</label>
                    <input
                      type="text"
                      value={form.unitTranslations[lang.code] || ''}
                      onChange={(e) => {
                        const newTrans = { ...form.unitTranslations, [lang.code]: e.target.value };
                        updateField('unitTranslations', newTrans);
                      }}
                      placeholder={lang.label}
                      className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-1 focus:border-primary-300 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Translations */}
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">多語言翻譯 (Translations)</h3>
          <div className="space-y-6">
            {LANGUAGES.map((lang) => (
              <div key={lang.code} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-100 rounded-lg">
                <div className="md:col-span-2">
                  <span className="text-sm font-bold text-primary-600">{lang.label} ({lang.code})</span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">名稱 ({lang.code})</label>
                  <input
                    type="text"
                    value={form.nameTranslations[lang.code] || ''}
                    onChange={(e) => {
                      const newTrans = { ...form.nameTranslations, [lang.code]: e.target.value };
                      updateField('nameTranslations', newTrans);
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">描述 ({lang.code})</label>
                  <textarea
                    value={form.descriptionTranslations[lang.code] || ''}
                    onChange={(e) => {
                      const newTrans = { ...form.descriptionTranslations, [lang.code]: e.target.value };
                      updateField('descriptionTranslations', newTrans);
                    }}
                    rows={1}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Image Upload */}
        {isEdit && (
          <section className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">產品圖片 (Image)</h3>
            <div className="flex items-start gap-6">
              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt={form.name}
                    className="w-40 h-40 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    disabled={uploading}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                    aria-label="移除圖片"
                  >
                    X
                  </button>
                </div>
              ) : (
                <div className="w-40 h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-sm text-gray-400">尚未上傳圖片</span>
                </div>
              )}
              <div>
                <label className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 cursor-pointer disabled:opacity-50 transition-colors">
                  {uploading ? '上傳中...' : '上傳圖片'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">支援格式：JPEG, PNG, WebP, GIF。檔案大小上限 5MB。</p>
              </div>
            </div>
          </section>
        )}

        {/* 產品選項 */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">產品選項 (Menu Options)</h3>
            <button type="button" onClick={addOption} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              + 新增選項組
            </button>
          </div>
          {options.length === 0 && (
            <p className="text-sm text-gray-400">尚未設定選項。可以新增如「尺寸」、「甜度」、「配料」等選項組。</p>
          )}
          <div className="space-y-6">
            {options.map((opt, optIdx) => (
              <div key={optIdx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">選項組 #{optIdx + 1}</span>
                  <button type="button" onClick={() => removeOption(optIdx)} className="text-red-500 hover:text-red-700 text-sm">
                    刪除此組
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">名稱 *</label>
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => updateOption(optIdx, 'name', e.target.value)}
                      placeholder="例如：尺寸、甜度"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">顯示類型</label>
                    <select
                      value={opt.displayType}
                      onChange={(e) => updateOption(optIdx, 'displayType', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="SELECT">下拉選單 (Select)</option>
                      <option value="RADIO">單選按鈕 (Radio)</option>
                      <option value="CHECKBOX">複選框 (Checkbox)</option>
                      <option value="QUANTITY">數量選擇 (Quantity)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={opt.isRequired}
                        onChange={(e) => updateOption(optIdx, 'isRequired', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600"
                      />
                      <span className="text-xs text-gray-700">必填 (Required)</span>
                    </label>
                  </div>
                </div>

                {/* Option Group Translations */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-4 bg-gray-50 p-2 rounded">
                  {LANGUAGES.map((lang) => (
                    <div key={lang.code}>
                      <label className="block text-[10px] text-gray-400 uppercase">{lang.code}</label>
                      <input
                        type="text"
                        value={opt.nameTranslations?.[lang.code] || ''}
                        onChange={(e) => {
                          const newTrans = { ...(opt.nameTranslations || {}), [lang.code]: e.target.value };
                          updateOption(optIdx, 'nameTranslations', newTrans);
                        }}
                        placeholder={lang.label}
                        className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5 focus:border-primary-300 outline-none"
                      />
                    </div>
                  ))}
                </div>

                {/* 選項值 */}
                <div className="ml-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">選項內容 (Values)</span>
                    <button type="button" onClick={() => addOptionValue(optIdx)} className="text-primary-600 text-xs font-medium">
                      + 新增選項內容
                    </button>
                  </div>
                  {opt.values.map((val, valIdx) => (
                    <React.Fragment key={valIdx}>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={val.name}
                        onChange={(e) => updateOptionValue(optIdx, valIdx, 'name', e.target.value)}
                        placeholder="選項名稱 (如：大杯、半糖)"
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">+$</span>
                        <input
                          type="number"
                          value={val.priceModifier}
                          onChange={(e) => updateOptionValue(optIdx, valIdx, 'priceModifier', parseFloat(e.target.value) || 0)}
                          step={0.01}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={val.isDefault}
                          onChange={(e) => updateOptionValue(optIdx, valIdx, 'isDefault', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600"
                        />
                        <span className="text-xs text-gray-500">預設值</span>
                      </label>
                      {opt.values.length > 1 && (
                        <button type="button" onClick={() => removeOptionValue(optIdx, valIdx)} className="text-red-400 hover:text-red-600 text-xs" aria-label={`Remove value ${val.name || valIdx + 1}`}>
                          X
                        </button>
                      )}
                    </div>
                    {/* Value Translations */}
                    <div className="flex flex-wrap gap-2 mb-3 ml-2 border-l-2 border-gray-100 pl-2">
                      {LANGUAGES.map((lang) => (
                        <div key={lang.code} className="flex items-center gap-1">
                          <span className="text-[9px] text-gray-400 w-4">{lang.code}:</span>
                          <input
                            type="text"
                            value={val.nameTranslations?.[lang.code] || ''}
                            onChange={(e) => {
                              const newTrans = { ...(val.nameTranslations || {}), [lang.code]: e.target.value };
                              updateOptionValue(optIdx, valIdx, 'nameTranslations', newTrans);
                            }}
                            className="text-[9px] w-20 border border-gray-100 rounded px-1 py-0.5 focus:border-primary-200 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Allergens & Mealtimes */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 過敏原 (Allergens) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">過敏原 (Allergens)</h3>
              {allergens.length === 0 ? (
                <p className="text-sm text-gray-400">尚未設定過敏原。</p>
              ) : (
                <div className="space-y-2">
                  {allergens.map((a) => (
                    <label key={a.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedAllergens.includes(a.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAllergens((prev) => [...prev, a.id]);
                          } else {
                            setSelectedAllergens((prev) => prev.filter((id) => id !== a.id));
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{a.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 用餐時段 (Mealtimes) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">用餐時段 (Mealtimes)</h3>
              {mealtimes.length === 0 ? (
                <p className="text-sm text-gray-400">尚未設定用餐時段。</p>
              ) : (
                <div className="space-y-2">
                  {mealtimes.map((m) => (
                    <label key={m.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedMealtimes.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMealtimes((prev) => [...prev, m.id]);
                          } else {
                            setSelectedMealtimes((prev) => prev.filter((id) => id !== m.id));
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{m.name} ({m.startTime} - {m.endTime})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/menu/items')} className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            取消
          </button>
          <button type="submit" disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {saving ? '儲存中...' : isEdit ? '更新產品資料' : '建立新產品'}
          </button>
        </div>
      </form>
    </div>
  );
}
