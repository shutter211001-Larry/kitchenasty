import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import ImageCropperModal from '../components/ImageCropperModal.js';
import { getFullUrl } from '../utils/url.js';

interface CategoryData {
  name: string;
  nameTranslations: Record<string, string>;
  slug: string;
  description: string;
  descriptionTranslations: Record<string, string>;
  image: string;
  sortOrder: number;
  isActive: boolean;
  parentId: string;
  locationId: string;
}

const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文 (Traditional Chinese)' },
  { code: 'en', label: '英文 (English)' },
  { code: 'ja', label: '日文 (Japanese)' },
  { code: 'ko', label: '韓文 (Korean)' },
  { code: 'th', label: '泰文 (Thai)' },
  { code: 'tl', label: '菲律賓文 (Filipino)' },
  { code: 'vi', label: '越南文 (Vietnamese)' },
  { code: 'id', label: '印尼文 (Indonesian)' },
  { code: 'es', label: '西班牙文 (Spanish)' },
  { code: 'fr', label: '法文 (French)' },
  { code: 'de', label: '德文 (German)' },
  { code: 'it', label: '義大利文 (Italian)' },
  { code: 'pt', label: '葡萄牙文 (Portuguese)' },
];

interface CategoryOption {
  id: string;
  name: string;
}

interface LocationOption {
  id: string;
  name: string;
}

const emptyCategory: CategoryData = {
  name: '',
  nameTranslations: {},
  slug: '',
  description: '',
  descriptionTranslations: {},
  image: '',
  sortOrder: 0,
  isActive: true,
  parentId: '',
  locationId: '',
};

export default function CategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { user } = useAuth();

  const [form, setForm] = useState<CategoryData>(emptyCategory);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  useEffect(() => {
    api.get<{ data: CategoryOption[] }>('/menu/categories')
      .then((res) => setCategories(res.data.filter((c) => c.id !== id)))
      .catch(() => {});

    api.get<{ data: LocationOption[] }>('/locations')
      .then((res) => setLocations(res.data || []))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!isEdit && user?.locationId) {
      updateField('locationId', user.locationId);
    }
  }, [user, isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    api.get<{ data: any }>(`/menu/categories/${id}`)
      .then((res) => {
        const cat = res.data;
        setForm({
          name: cat.name,
          nameTranslations: cat.nameTranslations || {},
          slug: cat.slug,
          description: cat.description || '',
          descriptionTranslations: cat.descriptionTranslations || {},
          image: cat.image || '',
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
          parentId: cat.parentId || '',
          locationId: cat.locationId || '',
        });
        if (cat.image) setImageUrl(cat.image);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id, isEdit]);

  const updateField = (field: keyof CategoryData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const autoSlug = (name: string) => {
    if (!isEdit) {
      updateField('slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!id || !originalFile) return;
    setCropSrc(null);
    setUploading(true);
    setError(null);
    try {
      const croppedFile = new File([croppedBlob], originalFile.name.replace(/\.[^/.]+$/, "") + "_cropped.jpg", {
        type: 'image/jpeg'
      });
      const formData = new FormData();
      formData.append('image', croppedFile);
      const res = await api.upload<{ data: { image: string } }>(`/menu/categories/${id}/image`, formData);
      setImageUrl(res.data.image);
      updateField('image', res.data.image);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      setOriginalFile(null);
    }
  };

  const handleImageRemove = async () => {
    if (!id) return;
    setUploading(true);
    setError(null);
    try {
      await api.delete(`/menu/categories/${id}/image`);
      setImageUrl(null);
      updateField('image', '');
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
        sortOrder: Number(form.sortOrder),
        parentId: form.parentId || undefined,
        locationId: form.locationId || null,
      };

      if (isEdit) {
        const { slug: _, ...updateBody } = body;
        await api.patch(`/menu/categories/${id}`, updateBody);
      } else {
        await api.post('/menu/categories', body);
      }
      navigate('/menu/categories');
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {isEdit ? '編輯分類' : '新增分類'}
        </h2>
        <button onClick={() => navigate('/menu/categories')} className="text-gray-500 hover:text-gray-700 text-sm">
          返回分類列表
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">分類基本資料 (Category Details)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名稱 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => { updateField('name', e.target.value); autoSlug(e.target.value); }}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">網址代稱 (Slug) *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述 (Description)
                <span className="ml-2 text-xs text-orange-500 font-normal">· 會顯示在 LINE 點餐卡片</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                placeholder="探索新鮮美味的主題餐點..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1 leading-normal">
                <span className="text-orange-500 font-medium">💡 LINE 推薦規格：此描述會顯示在 LINE 點餐的微型卡片 (Micro Bubble) 中，建議控制在 15-20 字以內，排版最為精緻。</span>
              </p>
            </div>
            {/* Image Section */}
            <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-4">
              {isEdit ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🖼️ 分類圖片 (Category Image)
                    <span className="ml-2 text-xs text-primary-600 font-normal">· 顯示於 LINE 輪播選單與 LIFF 介面</span>
                  </label>
                  <div className="flex items-start gap-6 bg-slate-50/50 p-4 rounded-xl border border-gray-100">
                    {imageUrl ? (
                      <div className="relative shrink-0">
                        <img
                          src={getFullUrl(imageUrl)!}
                          alt={form.name}
                          className="w-32 h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={handleImageRemove}
                          disabled={uploading}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50 shadow-md transition-all active:scale-90"
                          aria-label="移除圖片"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-24 bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] text-gray-400">尚未上傳</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-sm">
                        {uploading ? '上傳中...' : '上傳與裁切圖片'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        支援格式：JPEG, PNG, WebP。檔案上限 5MB。<br />
                        <span className="text-orange-500 font-medium">💡 LINE 推薦規格：建議裁切為 20:13 比例（800×520 px）。</span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🖼️ 分類圖片網址 (Image URL)
                    <span className="ml-2 text-xs text-orange-500 font-normal">· 顯示於 LINE 點餐選單卡片</span>
                  </label>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="url"
                        value={form.image}
                        onChange={(e) => updateField('image', e.target.value)}
                        placeholder="https://example.com/pizza.jpg"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <p className="text-xs text-gray-400 mt-1 leading-normal">
                        建議尺寸：800×520 px（20:13 橫幅）。<br />
                        <span className="text-primary-600">💡 提示：建立分類後，點擊編輯該分類即可解鎖「本地拖曳上傳與 20:13 LINE 完美裁切」功能！</span>
                      </p>
                    </div>
                    {form.image && (
                      <div className="relative shrink-0">
                        <img
                          src={form.image}
                          alt="分類預覽"
                          className="w-24 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => updateField('image', '')}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">父分類 (Parent Category)</label>
              <select
                value={form.parentId}
                onChange={(e) => updateField('parentId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">無 (頂層分類)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-750 mb-1">上架範圍 / 關聯分店 (Branch Availability)</label>
              {user?.role === 'SUPER_ADMIN' ? (
                <select
                  value={form.locationId}
                  onChange={(e) => updateField('locationId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium"
                >
                  <option value="">中央總部 (全分店上架 - 預設)</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600">
                  {locations.find((l) => l.id === form.locationId)?.name || '指定所屬分店'} (店長限製)
                </div>
              )}
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
            <div>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">啟用 (Active)</span>
              </label>
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

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/menu/categories')} className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            取消
          </button>
          <button type="submit" disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {saving ? '儲存中...' : isEdit ? '更新分類' : '建立分類'}
          </button>
        </div>
      </form>
      {cropSrc && (
        <ImageCropperModal
          src={cropSrc}
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
