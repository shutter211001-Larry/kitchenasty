import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface DietaryPreference {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  _count?: { menuItems: number };
}

const LANGUAGES = [
  { code: 'en', label: '英文 (English)' },
  { code: 'ja', label: '日文 (Japanese)' },
  { code: 'ko', label: '韓文 (Korean)' },
  { code: 'th', label: '泰文 (Thai)' },
  { code: 'tl', label: '菲律賓文 (Filipino)' },
  { code: 'vi', label: '越南文 (Vietnamese)' },
  { code: 'id', label: '印尼文 (Indonesian)' },
  { code: 'fr', label: '法文 (French)' },
  { code: 'es', label: '西班牙文 (Spanish)' },
];

export default function DietaryPreferenceList() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<DietaryPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNameTranslations, setNewNameTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPreferences();
  }, []);

  async function fetchPreferences() {
    try {
      const res = await api.get<{ data: DietaryPreference[] }>('/menu/dietary');
      setPreferences(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return;

    setIsSaving(true);
    try {
      await api.post('/menu/dietary', {
        name: newName,
        nameTranslations: newNameTranslations,
      });
      setNewName('');
      setNewNameTranslations({});
      setIsAdding(false);
      fetchPreferences();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除嗎？使用此忌口項目的產品將會同步更新。')) return;
    try {
      await api.delete(`/menu/dietary/${id}`);
      fetchPreferences();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <div className="p-6 text-gray-500 text-center">載入中...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">忌口管理 (Dietary Preferences)</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {isAdding ? '取消' : '+ 新增忌口項目'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">主要名稱 (預設)</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="例如：不吃牛、素食、不加辛辣"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <p className="mt-1 text-xs text-gray-400 italic">* 儲存後系統會自動為您翻譯成各國語言</p>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 bg-gray-50 p-4 rounded-lg">
              <p className="col-span-full text-xs font-bold text-gray-400 uppercase tracking-wider">手動修正翻譯 (Optional Translations)</p>
              {LANGUAGES.map((lang) => (
                <div key={lang.code}>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">{lang.label}</label>
                  <input
                    type="text"
                    value={newNameTranslations[lang.code] || ''}
                    onChange={(e) => setNewNameTranslations({ ...newNameTranslations, [lang.code]: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:border-primary-300 outline-none"
                    placeholder={lang.code}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 disabled:opacity-50"
            >
              {isSaving ? '儲存中...' : '儲存項目'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">名稱</th>
              <th className="px-6 py-3">各國翻譯</th>
              <th className="px-6 py-3">使用於</th>
              <th className="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {preferences.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">尚未建立忌口項目。</td>
              </tr>
            )}
            {preferences.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900">{p.name}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(p.nameTranslations || {}).map(([code, val]) => (
                      val && (
                        <span key={code} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          {code}: {val}
                        </span>
                      )
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-500">{p._count?.menuItems || 0} 個品項</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-sm">
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
