import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface Allergen {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  _count?: { menuItems: number };
}

export default function AllergenList() {
  const { t } = useTranslation();
    const LANGUAGES = [
      { code: 'en', label: t('allergenList.english') },
      { code: 'ja', label: t('allergenList.japanese') },
      { code: 'ko', label: t('allergenList.korean') },
      { code: 'th', label: t('allergenList.thai') },
      { code: 'tl', label: t('allergenList.filipino') },
      { code: 'vi', label: t('allergenList.vietnamese') },
      { code: 'id', label: t('allergenList.indonesian') },
    ];
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNameTranslations, setNewNameTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAllergens();
  }, []);

  async function fetchAllergens() {
    try {
      const res = await api.get<{ data: Allergen[] }>('/menu/allergens');
      setAllergens(res.data);
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
      await api.post('/menu/allergens', {
        name: newName,
        nameTranslations: newNameTranslations,
      });
      setNewName('');
      setNewNameTranslations({});
      setIsAdding(false);
      fetchAllergens();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('allergenList.confirmDeleteAllergen'))) return;
    try {
      await api.delete(`/menu/allergens/${id}`);
      fetchAllergens();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <div className="p-6 text-gray-500 text-center">{t('allergenList.loading')}</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('allergenList.allergenManagement')}</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {isAdding ? t('allergenList.cancelAllergen') : t('allergenList.addAllergen')}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('allergenList.primaryNameDefault')}</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder={t('allergenList.allergenExamplePlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 bg-gray-50 p-4 rounded-lg">
              <p className="col-span-full text-xs font-bold text-gray-400 uppercase tracking-wider">{t('allergenList.translations')}</p>
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
              {isSaving ? t('allergenList.saving') : t('allergenList.saveAllergen')}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">{t('allergenList.name')}</th>
              <th className="px-6 py-3">{t('allergenList.translationsList')}</th>
              <th className="px-6 py-3">{t('allergenList.usedIn')}</th>
              <th className="px-6 py-3 text-right">{t('allergenList.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allergens.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">{t('allergenList.noAllergensCreated')}</td>
              </tr>
            )}
            {allergens.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900">{a.name}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(a.nameTranslations || {}).map(([code, val]) => (
                      val && (
                        <span key={code} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          {code}: {val}
                        </span>
                      )
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-500">{a._count?.menuItems || 0} {t('allergenList.itemCount')}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 text-sm">
                    {t('allergenList.delete')}
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
