import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

interface CategoryData {
  name: string;
  nameTranslations: Record<string, string>;
  slug: string;
  description: string;
  descriptionTranslations: Record<string, string>;
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
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
          parentId: cat.parentId || '',
          locationId: cat.locationId || '',
        });
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
              <label className="block text-sm font-medium text-gray-700 mb-1">描述 (Description)</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
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
    </div>
  );
}
