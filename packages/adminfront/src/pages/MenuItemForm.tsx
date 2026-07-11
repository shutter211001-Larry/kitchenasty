import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { getFullUrl } from '../utils/url.js';
import { useAuth } from '../context/AuthContext.js';
import ImageCropperModal from '../components/ImageCropperModal.js';

interface OptionValue {
  name: string;
  nameTranslations?: Record<string, string>;
  priceModifier: number;
  isDefault: boolean;
  sortOrder: number;
  trackStock?: boolean;
  stockQty?: number;
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
  locationId: string;
  isRewardItem?: boolean;
  rewardPointsPrice?: number;
  cropData?: any;
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

interface DietaryOption {
  id: string;
  name: string;
}

interface LocationOption {
  id: string;
  name: string;
}

interface ErpRecipe {
  id: string;
  name: string;
  description: string;
  yieldAmount: number;
  yieldUnit: string;
  allergens?: string[];
}

const emptyOptionValue: OptionValue = { name: '', priceModifier: 0, isDefault: false, sortOrder: 0, trackStock: false, stockQty: 0 };
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
  const { t } = useTranslation();
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
      unit: t('menuItemForm.portion'),
      unitTranslations: {},
      locationId: '',
      isRewardItem: false,
      rewardPointsPrice: 0,
    };
    const LANGUAGES = [
      { code: 'zh-TW', label: t('menuItemForm.traditionalChinese') },
      { code: 'en', label: t('menuItemForm.english') },
      { code: 'ja', label: t('menuItemForm.japanese') },
      { code: 'ko', label: t('menuItemForm.korean') },
      { code: 'th', label: t('menuItemForm.thai') },
      { code: 'tl', label: t('menuItemForm.filipino') },
      { code: 'vi', label: t('menuItemForm.vietnamese') },
      { code: 'id', label: t('menuItemForm.indonesian') },
      { code: 'es', label: t('menuItemForm.spanish') },
      { code: 'fr', label: t('menuItemForm.french') },
      { code: 'de', label: t('menuItemForm.german') },
      { code: 'it', label: t('menuItemForm.italian') },
      { code: 'pt', label: t('menuItemForm.portuguese') },
    ];

  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { user } = useAuth();

  const [form, setForm] = useState<MenuItemData>(emptyItem);
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedMealtimes, setSelectedMealtimes] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [allergens, setAllergens] = useState<AllergenOption[]>([]);
  const [mealtimes, setMealtimes] = useState<MealtimeOption[]>([]);
  const [dietary, setDietary] = useState<DietaryOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const [erpRecipes, setErpRecipes] = useState<ErpRecipe[]>([]);
  const [selectedErpRecipeId, setSelectedErpRecipeId] = useState<string>('');
  const [imageAspectRatio, setImageAspectRatio] = useState<string>('h-40');

  const imgClass = `${imageAspectRatio === 'h-40' ? 'h-40' : imageAspectRatio === 'aspect-auto' ? 'aspect-video' : imageAspectRatio} w-40 object-cover rounded-lg border border-gray-200`;
  const placeholderClass = `${imageAspectRatio === 'h-40' ? 'h-40' : imageAspectRatio === 'aspect-auto' ? 'aspect-video' : imageAspectRatio} w-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center p-2 text-center`;

  useEffect(() => {
    Promise.all([
      api.get<{ data: CategoryOption[] }>('/menu/categories'),
      api.get<{ data: AllergenOption[] }>('/menu/allergens'),
      api.get<{ data: MealtimeOption[] }>('/menu/mealtimes'),
      api.get<{ data: DietaryOption[] }>('/menu/dietary'),
      api.get<{ data: LocationOption[] }>('/locations'),
    ]).then(([catRes, allRes, mtRes, dieRes, locRes]) => {
      setCategories(catRes.data);
      setAllergens(allRes.data);
      setMealtimes(mtRes.data);
      setDietary(dieRes.data);
      setLocations(locRes.data || []);
    }).catch(() => { });

    api.get<{ data: ErpRecipe[] }>('/menu/erp/product-recipes')
      .then((res) => {
        setErpRecipes(res.data || []);
      })
      .catch(() => console.error('Failed to load ERP recipes'));

    api.get<{ data: any }>('/settings')
      .then((res) => {
        if (res.data?.menuSection) {
          try {
            const menuSetting = JSON.parse(res.data.menuSection);
            if (menuSetting.imageAspectRatio) {
              setImageAspectRatio(menuSetting.imageAspectRatio);
            }
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit && user?.locationId) {
      updateField('locationId', user.locationId);
    }
  }, [user, isEdit]);

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
          unit: item.unit || t('menuItemForm.portion'),
          unitTranslations: item.unitTranslations || {},
          locationId: item.locationId || '',
          isRewardItem: item.isRewardItem || false,
          rewardPointsPrice: item.rewardPointsPrice || 0,
          cropData: item.cropData || {},
        });
        if (item.image) setImageUrl(item.image);
        if (item.recipeId) {
          setSelectedErpRecipeId(item.recipeId);
        }
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
              trackStock: v.trackStock || false,
              stockQty: v.stockQty || 0,
            })),
          })));
        }
        if (item.allergens?.length) {
          setSelectedAllergens(item.allergens.map((a: any) => a.allergenId));
        }
        if (item.mealtimes?.length) {
          setSelectedMealtimes(item.mealtimes.map((m: any) => m.mealtimeId));
        }
        if (item.dietaryPreferences?.length) {
          setSelectedDietary(item.dietaryPreferences.map((d: any) => d.dietaryPreferenceId));
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    setUploading(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUploading(false);
          return;
        }

        let width = img.width;
        let height = img.height;
        const MIN_EDGE_MAX_SIZE = 1920;

        // Scale down if both edges are larger than 1920, capping the shorter edge at 1920
        if (width > MIN_EDGE_MAX_SIZE && height > MIN_EDGE_MAX_SIZE) {
          if (width < height) {
            // width is the shorter edge
            height = Math.round((height * MIN_EDGE_MAX_SIZE) / width);
            width = MIN_EDGE_MAX_SIZE;
          } else {
            // height is the shorter edge
            width = Math.round((width * MIN_EDGE_MAX_SIZE) / height);
            height = MIN_EDGE_MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            setUploading(false);
            return;
          }

          const webpFile = new File([blob], file.name.replace(/\\.[^/.]+$/, "") + '_master.webp', { type: 'image/webp' });
          const formData = new FormData();
          formData.append('image', webpFile);

          try {
            const res = await api.upload<{ data: { image: string } }>(`/menu/items/${id}/image`, formData);
            setImageUrl(res.data.image);
            setCropSrc(res.data.image);
          } catch (err: any) {
            setError(err.message);
          } finally {
            setUploading(false);
          }
        }, 'image/webp', 0.85);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlobs: Record<string, Blob>, cropData: any) => {
    if (!id || !imageUrl) return;
    setCropSrc(null);
    setUploading(true);
    setError(null);
    try {
      let finalImageUrl = imageUrl;
      
      for (const [ratio, blob] of Object.entries(croppedBlobs)) {
        const croppedFile = new File([blob], `cropped_${ratio.replace(/[:\\/]/g, '_')}.webp`, {
          type: 'image/webp'
        });
        const formData = new FormData();
        formData.append('image', croppedFile);
        const res = await api.upload<{ data: { image: string } }>(`/menu/items/${id}/image?ratio=${encodeURIComponent(ratio)}`, formData);
        
        if (ratio === imageAspectRatio) {
          finalImageUrl = res.data.image;
        }
      }
      
      await api.patch(`/menu/items/${id}`, { cropData });
      setForm(prev => ({ ...prev, cropData }));
      
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
        isRewardItem: !!form.isRewardItem,
        rewardPointsPrice: Number(form.rewardPointsPrice || 0),
        options,
        allergenIds: selectedAllergens,
        mealtimeIds: selectedMealtimes,
        dietaryPreferenceIds: selectedDietary,
        locationId: form.locationId || null,
      };

      if (selectedErpRecipeId) {
        const selectedRecipe = erpRecipes.find(r => r.id === selectedErpRecipeId);
        if (selectedRecipe) {
          (body as any).recipeId = selectedRecipe.id;
          (body as any).recipeName = selectedRecipe.name;
        }
      } else {
        (body as any).recipeId = null;
        (body as any).recipeName = null;
      }

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

  if (loading) return <p className="text-gray-500">{t('menuItemForm.loading')}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {isEdit ? t('menuItemForm.editProduct') : t('menuItemForm.addProduct')}
        </h2>
        <button onClick={() => navigate('/menu/items')} className="text-gray-500 hover:text-gray-700 text-sm">
          {t('menuItemForm.backToProductList')}
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t('menuItemForm.basicInformation')}</h3>
            {erpRecipes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary-600 font-bold bg-primary-50 px-2 py-1 rounded">
                  {isEdit ? t('menuItemForm.linkErpRecipe') : t('menuItemForm.importFromErpRecipe')}
                </span>
                <select
                  value={selectedErpRecipeId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedErpRecipeId(id);
                    if (id) {
                      const recipe = erpRecipes.find(r => r.id === id);
                      if (recipe) {
                        if (!isEdit) {
                          updateField('name', recipe.name);
                          autoSlug(recipe.name);
                          updateField('description', recipe.description || '');
                          updateField('unit', recipe.yieldUnit || t('menuItemForm.portion'));
                          
                          // Auto-fill allergens by matching names
                          if (recipe.allergens && recipe.allergens.length > 0) {
                            const matchedIds = recipe.allergens
                              .map(aName => allergens.find(localA => localA.name === aName)?.id)
                              .filter(Boolean) as string[];
                            if (matchedIds.length > 0) {
                              setSelectedAllergens(prev => {
                                const newSet = new Set([...prev, ...matchedIds]);
                                return Array.from(newSet);
                              });
                            }
                          }
                        }
                      }
                    }
                  }}
                  className="border border-primary-200 text-sm rounded-lg px-2 py-1 focus:ring-primary-500 outline-none"
                >
                  <option value="">-- {isEdit ? t('menuItemForm.selectErpRecipeAutoUpdate') : t('menuItemForm.selectErpRecipeAutoBind')} --</option>
                  {erpRecipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuItemForm.nameRequired')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => { updateField('name', e.target.value); autoSlug(e.target.value); }}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuItemForm.slugRequired')}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuItemForm.description')}</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuItemForm.categoryRequired')}</label>
              <select
                value={form.categoryId}
                onChange={(e) => updateField('categoryId', e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">{t('menuItemForm.pleaseSelectCategory')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-750 mb-1">{t('menuItemForm.branchAvailability')}</label>
              {user?.role === 'SUPER_ADMIN' ? (
                <select
                  value={form.locationId}
                  onChange={(e) => updateField('locationId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium"
                >
                  <option value="">{t('menuItemForm.centralHeadquartersAllBranches')}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600">
                  {locations.find((l) => l.id === form.locationId)?.name || t('menuItemForm.assignToBranch')} {t('menuItemForm.storeManagerRestriction')}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuItemForm.priceRequired')}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuItemForm.unitExample')}</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => updateField('unit', e.target.value)}
                placeholder={t('menuItemForm.defaultUnit')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('menuItemForm.sortOrder')}</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => updateField('sortOrder', e.target.value)}
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-6 mt-4 flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{t('menuItemForm.active')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.trackStock}
                  onChange={(e) => updateField('trackStock', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{t('menuItemForm.trackStock')}</span>
              </label>
              {form.trackStock && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">{t('menuItemForm.stockQuantity')}</label>
                  <input
                    type="number"
                    value={form.stockQty}
                    onChange={(e) => updateField('stockQty', e.target.value)}
                    min={0}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
              
              <label className="flex items-center gap-2 cursor-pointer bg-orange-50/50 p-2.5 rounded-lg border border-orange-100/50">
                <input
                  type="checkbox"
                  checked={form.isRewardItem || false}
                  onChange={(e) => {
                    updateField('isRewardItem', e.target.checked);
                    if (!e.target.checked) {
                      updateField('rewardPointsPrice', 0);
                    }
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-bold text-orange-950">{t('menuItemForm.setAsRewardItem')}</span>
                  <p className="text-[10px] text-orange-750 mt-0.5">{t('menuItemForm.rewardRedemptionDescription')}</p>
                </div>
              </label>
              
              {form.isRewardItem && (
                <div className="flex items-center gap-2 animate-fadeIn">
                  <label className="text-sm font-semibold text-orange-950">{t('menuItemForm.requiredRewardPoints')}</label>
                  <input
                    type="number"
                    value={form.rewardPointsPrice || 0}
                    onChange={(e) => updateField('rewardPointsPrice', parseInt(e.target.value) || 0)}
                    min={0}
                    required
                    className="w-24 border border-orange-300 rounded-lg px-2.5 py-1 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
            </div>

            {/* Unit Translations */}
            <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">{t('menuItemForm.unitTranslations')}</p>
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('menuItemForm.translations')}</h3>
          <div className="space-y-6">
            {LANGUAGES.map((lang) => (
              <div key={lang.code} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-100 rounded-lg">
                <div className="md:col-span-2">
                  <span className="text-sm font-bold text-primary-600">{lang.label} ({lang.code})</span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('menuItemForm.nameLabel')}{lang.code})</label>
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
                  <label className="block text-xs text-gray-500 mb-1">{t('menuItemForm.descriptionLabel')}{lang.code})</label>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('menuItemForm.productImage')}</h3>
            <div className="flex items-start gap-6">
              {imageUrl ? (
                <div className="relative group">
                  <img
                    src={getFullUrl(imageUrl)!}
                    alt={form.name}
                    className={imgClass}
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setCropSrc(imageUrl)}
                      disabled={uploading}
                      className="bg-primary-500 text-white rounded-full p-2 shadow-md hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center"
                      title={t('menuItemForm.editCrop', '重新裁切')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleImageRemove}
                      disabled={uploading}
                      className="bg-red-500 text-white rounded-full p-2 shadow-md hover:bg-red-600 disabled:opacity-50 flex items-center justify-center"
                      title={t('menuItemForm.removeImage')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={placeholderClass}>
                  <span className="text-sm text-gray-400">{t('menuItemForm.noImageUploaded')}</span>
                </div>
              )}
              <div>
                <label className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 cursor-pointer disabled:opacity-50 transition-colors">
                  {uploading ? t('menuItemForm.uploading') : t('menuItemForm.uploadImage')}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">{t('menuItemForm.supportedImageFormatsHint')}</p>
              </div>
            </div>
          </section>
        )}

        {/* 產品選項 */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t('menuItemForm.productMenuOptions')}</h3>
            <button type="button" onClick={addOption} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              {t('menuItemForm.addOptionGroup')}
            </button>
          </div>
          {options.length === 0 && (
            <p className="text-sm text-gray-400">{t('menuItemForm.noOptionsConfiguredHint')}</p>
          )}
          <div className="space-y-6">
            {options.map((opt, optIdx) => (
              <div key={optIdx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">{t('menuItemForm.optionGroupNumber')}{optIdx + 1}</span>
                  <button type="button" onClick={() => removeOption(optIdx)} className="text-red-500 hover:text-red-700 text-sm">
                    {t('menuItemForm.deleteThisGroup')}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('menuItemForm.requiredName')}</label>
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => updateOption(optIdx, 'name', e.target.value)}
                      placeholder={t('menuItemForm.exampleSizeSweetness')}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('menuItemForm.displayType')}</label>
                    <select
                      value={opt.displayType}
                      onChange={(e) => updateOption(optIdx, 'displayType', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="SELECT">{t('menuItemForm.selectDropdown')}</option>
                      <option value="RADIO">{t('menuItemForm.radioButton')}</option>
                      <option value="CHECKBOX">{t('menuItemForm.checkbox')}</option>
                      <option value="QUANTITY">{t('menuItemForm.quantitySelector')}</option>
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
                      <span className="text-xs text-gray-700">{t('menuItemForm.isRequired')}</span>
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
                    <span className="text-xs font-medium text-gray-500">{t('menuItemForm.optionValues')}</span>
                    <button type="button" onClick={() => addOptionValue(optIdx)} className="text-primary-600 text-xs font-medium">
                      {t('menuItemForm.addOptionValue')}
                    </button>
                  </div>
                  {opt.values.map((val, valIdx) => (
                    <React.Fragment key={valIdx}>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={val.name}
                        onChange={(e) => updateOptionValue(optIdx, valIdx, 'name', e.target.value)}
                        placeholder={t('menuItemForm.optionNamePlaceholder')}
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
                        <span className="text-xs text-gray-500">{t('menuItemForm.defaultValue')}</span>
                      </label>
                      <label className="flex items-center gap-1 ml-2">
                        <input
                          type="checkbox"
                          checked={val.trackStock || false}
                          onChange={(e) => updateOptionValue(optIdx, valIdx, 'trackStock', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600"
                        />
                        <span className="text-xs text-gray-500">{t('menuItemForm.trackStock')}</span>
                      </label>
                      {val.trackStock && (
                        <div className="flex items-center gap-1 ml-1">
                          <span className="text-xs text-gray-500">{t('menuItemForm.quantityLabel')}</span>
                          <input
                            type="number"
                            value={val.stockQty || 0}
                            onChange={(e) => updateOptionValue(optIdx, valIdx, 'stockQty', parseInt(e.target.value) || 0)}
                            min={0}
                            className="w-16 border border-gray-300 rounded px-1 py-1 text-xs"
                          />
                        </div>
                      )}
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

        {/* Allergens & Mealtimes & Dietary */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 過敏原 (Allergens) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t('menuItemForm.allergens')}</h3>
              {allergens.length === 0 ? (
                <p className="text-sm text-gray-400">{t('menuItemForm.noAllergensConfigured')}</p>
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

            {/* 忌口項目 (Dietary Preferences) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t('menuItemForm.dietaryRestrictions')}</h3>
              {dietary.length === 0 ? (
                <p className="text-sm text-gray-400">{t('menuItemForm.noDietaryRestrictionsConfigured')}</p>
              ) : (
                <div className="space-y-2">
                  {dietary.map((d) => (
                    <label key={d.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDietary.includes(d.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDietary((prev) => [...prev, d.id]);
                          } else {
                            setSelectedDietary((prev) => prev.filter((id) => id !== d.id));
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{d.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 用餐時段 (Mealtimes) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t('menuItemForm.mealtimes')}</h3>
              {mealtimes.length === 0 ? (
                <p className="text-sm text-gray-400">{t('menuItemForm.noMealtimesConfigured')}</p>
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
            {t('menuItemForm.cancel')}
          </button>
          <button type="submit" disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {saving ? t('menuItemForm.saving') : isEdit ? t('menuItemForm.updateProductDetails') : t('menuItemForm.createNewProduct')}
          </button>
        </div>
      </form>
      {cropSrc && (
        <ImageCropperModal
          src={cropSrc}
          systemRatio={imageAspectRatio}
          initialCropData={form.cropData}
          onCrop={handleCropComplete}
          onClose={() => {
            setCropSrc(null);
            setOriginalFile(null);
          }}
        />
      )}
    </div>
  );
}
