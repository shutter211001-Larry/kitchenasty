import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface Mealtime {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  startTime: string;
  endTime: string;
  days: number[];
  isActive: boolean;
}

export default function MealtimeList() {
  const { t } = useTranslation();
    const LANGUAGES = [
      { code: 'en', label: t('autoGen.admin.key837') },
      { code: 'ja', label: t('autoGen.admin.key838') },
      { code: 'ko', label: t('autoGen.admin.key839') },
      { code: 'th', label: t('autoGen.admin.key840') },
      { code: 'tl', label: t('autoGen.admin.key841') },
      { code: 'vi', label: t('autoGen.admin.key842') },
      { code: 'id', label: t('autoGen.admin.key843') },
    ];
    const DAYS = [t('autoGen.admin.key844'), t('autoGen.admin.key845'), t('autoGen.admin.key846'), t('autoGen.admin.key847'), t('autoGen.admin.key848'), t('autoGen.admin.key849'), t('autoGen.admin.key850')];

  const [mealtimes, setMealtimes] = useState<Mealtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    nameTranslations: {} as Record<string, string>,
    startTime: '09:00',
    endTime: '22:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    isActive: true,
  });

  useEffect(() => {
    fetchMealtimes();
  }, []);

  async function fetchMealtimes() {
    try {
      const res = await api.get<{ data: Mealtime[] }>('/menu/mealtimes');
      setMealtimes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/menu/mealtimes', form);
      setIsAdding(false);
      setForm({ name: '', nameTranslations: {}, startTime: '09:00', endTime: '22:00', days: [0, 1, 2, 3, 4, 5, 6], isActive: true });
      fetchMealtimes();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/menu/mealtimes/${id}`);
      fetchMealtimes();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">{t('autoGen.admin.key851')}</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('autoGen.admin.key852')}</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          {isAdding ? t('autoGen.admin.key853') : t('autoGen.admin.key854')}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key855')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={t('autoGen.admin.key856')}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key857')}</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key858')}</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 bg-gray-50 p-4 rounded-lg">
            <p className="col-span-full text-xs font-bold text-gray-400 uppercase">{t('autoGen.admin.key859')}</p>
            {LANGUAGES.map((lang) => (
              <div key={lang.code}>
                <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">{lang.code}</label>
                <input
                  type="text"
                  value={form.nameTranslations[lang.code] || ''}
                  onChange={(e) => setForm({ ...form, nameTranslations: { ...form.nameTranslations, [lang.code]: e.target.value } })}
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:border-primary-300 outline-none"
                  placeholder={lang.label}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('autoGen.admin.key860')}</label>
            <div className="flex gap-2">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const newDays = form.days.includes(i) ? form.days.filter(d => d !== i) : [...form.days, i];
                    setForm({ ...form, days: newDays });
                  }}
                  className={`flex-1 py-2 text-xs rounded border transition-colors ${
                    form.days.includes(i) ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-primary-600 text-white px-8 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {isSaving ? t('autoGen.admin.key861') : t('autoGen.admin.key862')}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mealtimes.map((m) => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-primary-300 transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{m.name}</h3>
                <p className="text-xs text-primary-600 font-medium">{m.startTime} - {m.endTime}</p>
              </div>
              <button onClick={() => handleDelete(m.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {t('autoGen.admin.key863')}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-3">
              {Object.entries(m.nameTranslations || {}).map(([code, val]) => (
                val && (
                  <span key={code} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">
                    {code}: {val}
                  </span>
                )
              ))}
            </div>

            <div className="mt-4 flex gap-1">
              {DAYS.map((day, i) => (
                <span key={day} className={`text-[10px] w-6 h-6 flex items-center justify-center rounded-full ${m.days.includes(i) ? 'bg-primary-100 text-primary-700 font-bold' : 'bg-gray-50 text-gray-300'}`}>
                  {day[0]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
