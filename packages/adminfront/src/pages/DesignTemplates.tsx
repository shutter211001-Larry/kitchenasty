import { useState, useEffect } from 'react';

interface TemplateDef {
  id: string;
  name: string;
  description: string;
}

const templates: TemplateDef[] = [
  { id: 'classic', name: '經典 (Classic)', description: '簡潔的漸層主視覺、三欄式特色介紹、簡單明瞭的行動呼籲。' },
  { id: 'elegant', name: '優雅 (Elegant)', description: '置中頁首、帶有遮罩的全螢幕主圖、圖示卡片式特色介紹。' },
  { id: 'bold', name: '粗獷 (Bold)', description: '大型粗體排版、分割式主視覺、橫向特色條。' },
  { id: 'minimal', name: '極簡 (Minimal)', description: '超淨感設計、純文字主視覺、簡約列表式特色。' },
  { id: 'cozy', name: '溫馨 (Cozy)', description: '圓潤溫暖感、卡片式主視覺、圓角特色卡片。' },
  { id: 'modern', name: '現代 (Modern)', description: '磨砂玻璃頁首、不對稱主視覺、網格特色、幾何圖形行動呼籲。' },
  { id: 'rustic', name: '鄉村 (Rustic)', description: '大地色系溫暖頁首、質感紋理主視覺、大地色特色卡片。' },
  { id: 'vibrant', name: '活力 (Vibrant)', description: '漸層頁首、動態漸層主視覺、色彩鮮豔的特色卡片。' },
  { id: 'sleek', name: '俐落 (Sleek)', description: '深色頁首、帶有光暈效果的深色主視覺、深色特色卡片。' },
  { id: 'retro', name: '復古 (Retro)', description: '復古風頁首、帶有徽章的復古主視覺、懷舊風行動呼籲。' },
];

/* ── Miniature CSS previews ─────────────────────────────────── */

function PreviewClassic() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="h-2 bg-white flex items-center px-1.5">
        <div className="w-3 h-1 rounded-sm bg-orange-500 opacity-60" />
        <div className="flex gap-0.5 ml-auto">
          <div className="w-1.5 h-0.5 rounded-full bg-gray-300" />
          <div className="w-1.5 h-0.5 rounded-full bg-gray-300" />
          <div className="w-1.5 h-0.5 rounded-full bg-gray-300" />
        </div>
      </div>
      <div className="flex-1 bg-gradient-to-br from-orange-500 to-orange-700 px-2 py-2 flex flex-col justify-center">
        <div className="w-10 h-1 bg-white rounded-full mb-1" />
        <div className="w-7 h-0.5 bg-white/60 rounded-full mb-1.5" />
        <div className="flex gap-0.5">
          <div className="w-4 h-1.5 bg-white rounded-sm" />
          <div className="w-4 h-1.5 border border-white/60 rounded-sm" />
        </div>
      </div>
      <div className="py-1.5 px-2 flex gap-1 justify-center">
        <div className="w-4 h-4 bg-orange-50 rounded-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /></div>
        <div className="w-4 h-4 bg-orange-50 rounded-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /></div>
        <div className="w-4 h-4 bg-orange-50 rounded-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /></div>
      </div>
      <div className="py-1 bg-gray-100 flex items-center justify-center">
        <div className="w-6 h-1.5 bg-orange-500 rounded-sm" />
      </div>
      <div className="h-2 bg-gray-900" />
    </div>
  );
}

function PreviewElegant() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="h-2 bg-white flex items-center justify-center">
        <div className="w-5 h-0.5 bg-gray-800 rounded-full" />
      </div>
      <div className="h-0.5 flex justify-center"><div className="flex gap-1"><div className="w-2 h-[1px] bg-gray-300" /><div className="w-2 h-[1px] bg-gray-300" /><div className="w-2 h-[1px] bg-gray-300" /></div></div>
      <div className="flex-1 bg-gradient-to-b from-gray-800 to-gray-600 px-2 py-2 flex flex-col items-center justify-center">
        <div className="w-0.5 h-1.5 bg-amber-400/60 mb-0.5" />
        <div className="w-9 h-1 bg-white rounded-full mb-0.5" />
        <div className="w-6 h-0.5 bg-white/50 rounded-full mb-1" />
        <div className="w-5 h-1.5 border border-white/50 rounded-full" />
      </div>
      <div className="py-1.5 px-2 flex gap-1 justify-center">
        <div className="w-4 h-4 border border-gray-200 rounded-sm flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-gray-300" /></div>
        <div className="w-4 h-4 border border-gray-200 rounded-sm flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-gray-300" /></div>
        <div className="w-4 h-4 border border-gray-200 rounded-sm flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-gray-300" /></div>
      </div>
      <div className="h-2 bg-gray-50 flex items-center justify-center"><div className="w-4 h-0.5 bg-gray-400 rounded-full" /></div>
    </div>
  );
}

function PreviewBold() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="h-2 bg-gray-950 flex items-center px-1.5">
        <div className="w-4 h-1 bg-white rounded-sm font-black" />
        <div className="flex gap-0.5 ml-auto"><div className="w-2 h-0.5 bg-gray-600" /><div className="w-2 h-0.5 bg-gray-600" /></div>
      </div>
      <div className="flex-1 flex">
        <div className="w-1/2 bg-white px-1.5 py-2 flex flex-col justify-center">
          <div className="w-full h-1.5 bg-gray-900 rounded-sm mb-0.5" />
          <div className="w-3/4 h-1.5 bg-gray-900 rounded-sm mb-1" />
          <div className="w-5 h-0.5 bg-gray-400 rounded-full mb-1" />
          <div className="w-4 h-1.5 bg-gray-900 rounded-sm" />
        </div>
        <div className="w-1/2 bg-gradient-to-br from-orange-500 to-orange-700" />
      </div>
      <div className="h-3 bg-gray-100 flex items-center justify-around px-1">
        <div className="w-2 h-0.5 bg-gray-900 rounded-full" />
        <div className="w-[1px] h-2 bg-gray-300" />
        <div className="w-2 h-0.5 bg-gray-900 rounded-full" />
        <div className="w-[1px] h-2 bg-gray-300" />
        <div className="w-2 h-0.5 bg-gray-900 rounded-full" />
      </div>
      <div className="h-2.5 bg-gray-950 flex items-center justify-center"><div className="w-5 h-1 bg-orange-500 rounded-sm" /></div>
    </div>
  );
}

function PreviewMinimal() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="h-2 flex items-center px-2">
        <div className="w-3 h-0.5 bg-gray-800 rounded-full" />
        <div className="flex gap-1 ml-auto"><div className="w-1.5 h-[1px] bg-gray-300" /><div className="w-1.5 h-[1px] bg-gray-300" /></div>
      </div>
      <div className="flex-1 px-3 flex flex-col items-center justify-center">
        <div className="w-10 h-0.5 bg-gray-800 rounded-full mb-1" />
        <div className="w-6 h-[1px] bg-gray-300 rounded-full mb-1.5" />
        <div className="w-4 h-[1px] bg-gray-800 rounded-full" />
      </div>
      <div className="py-1.5 px-3 space-y-0.5">
        <div className="flex items-center gap-1"><div className="w-0.5 h-0.5 bg-gray-400 rounded-full" /><div className="w-6 h-[1px] bg-gray-300 rounded-full" /></div>
        <div className="flex items-center gap-1"><div className="w-0.5 h-0.5 bg-gray-400 rounded-full" /><div className="w-5 h-[1px] bg-gray-300 rounded-full" /></div>
        <div className="flex items-center gap-1"><div className="w-0.5 h-0.5 bg-gray-400 rounded-full" /><div className="w-7 h-[1px] bg-gray-300 rounded-full" /></div>
      </div>
      <div className="py-1 flex items-center justify-center">
        <div className="w-5 h-[1px] bg-gray-800 rounded-full" />
      </div>
      <div className="h-1 border-t border-gray-100 flex items-center justify-center"><div className="w-3 h-[1px] bg-gray-300 rounded-full" /></div>
    </div>
  );
}

function PreviewCozy() {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#fffbeb' }}>
      <div className="h-2 flex items-center px-1.5" style={{ backgroundColor: '#fffbeb' }}>
        <div className="w-3 h-1 rounded-full bg-orange-500 opacity-60" />
        <div className="flex gap-0.5 ml-auto"><div className="w-1.5 h-0.5 rounded-full bg-amber-300" /><div className="w-1.5 h-0.5 rounded-full bg-amber-300" /></div>
      </div>
      <div className="flex-1 px-2 py-1.5 flex items-center justify-center">
        <div className="w-full bg-white rounded-lg shadow-sm p-1.5 flex flex-col items-center">
          <div className="w-8 h-0.5 bg-gray-800 rounded-full mb-0.5" />
          <div className="w-5 h-[1px] bg-amber-400 rounded-full mb-1" />
          <div className="w-5 h-1.5 bg-orange-500 rounded-full" />
        </div>
      </div>
      <div className="py-1 px-2 flex gap-1 justify-center">
        <div className="w-4 h-3 bg-white rounded-lg shadow-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-amber-200" /></div>
        <div className="w-4 h-3 bg-white rounded-lg shadow-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-amber-200" /></div>
        <div className="w-4 h-3 bg-white rounded-lg shadow-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-amber-200" /></div>
      </div>
      <div className="h-2 flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}><div className="w-4 h-1 bg-orange-500 rounded-full" /></div>
    </div>
  );
}

function PreviewModern() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="h-2 bg-white/80 backdrop-blur flex items-center px-1.5 border-b border-gray-100">
        <div className="w-3 h-1 rounded-md bg-gradient-to-r from-orange-500 to-purple-500" />
        <div className="flex gap-0.5 ml-auto"><div className="w-1.5 h-0.5 rounded bg-gray-200" /><div className="w-1.5 h-0.5 rounded bg-gray-200" /></div>
      </div>
      <div className="flex-1 relative px-2 py-1.5 overflow-hidden">
        <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-purple-200 opacity-40 -translate-y-1 translate-x-2" />
        <div className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-orange-200 opacity-40 translate-y-1 -translate-x-1" />
        <div className="relative z-10 flex flex-col justify-center h-full">
          <div className="w-8 h-1 bg-gray-900 rounded-full mb-0.5" />
          <div className="w-5 h-0.5 bg-gray-400 rounded-full mb-1" />
          <div className="w-5 h-1.5 bg-gradient-to-r from-orange-500 to-purple-500 rounded-md" />
        </div>
      </div>
      <div className="py-1 px-1.5 grid grid-cols-3 gap-0.5">
        <div className="h-3 bg-gray-50/80 rounded border border-gray-100" />
        <div className="h-3 bg-gray-50/80 rounded border border-gray-100" />
        <div className="h-3 bg-gray-50/80 rounded border border-gray-100" />
      </div>
      <div className="h-2 bg-gray-900" />
    </div>
  );
}

function PreviewRustic() {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#f5f0e8' }}>
      <div className="h-2 flex items-center px-1.5" style={{ backgroundColor: '#e8e0d0', borderBottom: '1px solid #d4c8b0' }}>
        <div className="w-4 h-0.5 rounded bg-stone-700" />
        <div className="flex gap-0.5 ml-auto"><div className="w-1.5 h-0.5 bg-stone-400" /><div className="w-1.5 h-0.5 bg-stone-400" /></div>
      </div>
      <div className="flex-1 px-2 py-1.5 flex flex-col justify-center" style={{ backgroundColor: '#d4c0a0' }}>
        <div className="w-1.5 h-[1px] bg-stone-600 mx-auto mb-0.5" />
        <div className="w-9 h-1 bg-stone-800 rounded-sm mx-auto mb-0.5" style={{ fontVariant: 'small-caps' }} />
        <div className="w-6 h-0.5 bg-stone-600/60 rounded-sm mx-auto mb-1" />
        <div className="w-5 h-1.5 bg-stone-700 rounded-sm mx-auto" />
      </div>
      <div className="py-1 px-2 flex gap-1 justify-center" style={{ backgroundColor: '#f5f0e8' }}>
        <div className="w-4 h-3 rounded-sm border border-stone-300 bg-white flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-stone-300" /></div>
        <div className="w-4 h-3 rounded-sm border border-stone-300 bg-white flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-stone-300" /></div>
        <div className="w-4 h-3 rounded-sm border border-stone-300 bg-white flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-stone-300" /></div>
      </div>
      <div className="h-2" style={{ backgroundColor: '#5c4a36' }} />
    </div>
  );
}

function PreviewVibrant() {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-orange-500 via-purple-500 to-orange-500 flex items-center px-1.5">
        <div className="w-3 h-1 bg-white/30 rounded" />
        <div className="flex gap-0.5 ml-auto"><div className="w-1.5 h-0.5 bg-white/50" /><div className="w-1.5 h-0.5 bg-white/50" /></div>
      </div>
      <div className="flex-1 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 px-2 py-2 flex flex-col items-center justify-center">
        <div className="w-10 h-1 bg-white rounded-full mb-0.5" />
        <div className="w-6 h-0.5 bg-white/60 rounded-full mb-1" />
        <div className="flex gap-0.5">
          <div className="w-4 h-1.5 bg-white rounded-full" />
          <div className="w-4 h-1.5 border border-white/60 rounded-full" />
        </div>
      </div>
      <div className="py-1 px-1.5 bg-white flex gap-0.5 justify-center">
        <div className="w-4 h-3 rounded bg-gradient-to-b from-pink-100 to-pink-50 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-pink-400" /></div>
        <div className="w-4 h-3 rounded bg-gradient-to-b from-purple-100 to-purple-50 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-purple-400" /></div>
        <div className="w-4 h-3 rounded bg-gradient-to-b from-orange-100 to-orange-50 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-orange-400" /></div>
      </div>
      <div className="h-2 bg-gradient-to-r from-purple-700 via-pink-600 to-orange-500" />
    </div>
  );
}

function PreviewSleek() {
  return (
    <div className="w-full h-full flex flex-col bg-gray-950 overflow-hidden">
      <div className="h-2 border-b border-gray-800 flex items-center px-1.5">
        <div className="w-3 h-1 rounded bg-cyan-500/20 border border-cyan-500/30" />
        <div className="flex gap-0.5 ml-auto"><div className="w-1.5 h-0.5 bg-gray-600" /><div className="w-1.5 h-0.5 bg-gray-600" /></div>
      </div>
      <div className="flex-1 relative px-2 py-2 flex flex-col justify-center">
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500/10 blur-sm" />
        <div className="relative z-10">
          <div className="w-9 h-1 bg-white rounded-full mb-0.5" />
          <div className="w-6 h-0.5 bg-gray-500 rounded-full mb-1" />
          <div className="w-5 h-1.5 bg-cyan-500 rounded-sm shadow-sm shadow-cyan-500/30" />
        </div>
      </div>
      <div className="py-1 px-1.5 flex gap-0.5 justify-center">
        <div className="w-4 h-3 bg-gray-900 rounded border border-gray-800 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-cyan-500/40" /></div>
        <div className="w-4 h-3 bg-gray-900 rounded border border-gray-800 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-cyan-500/40" /></div>
        <div className="w-4 h-3 bg-gray-900 rounded border border-gray-800 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-cyan-500/40" /></div>
      </div>
      <div className="h-2 bg-gray-950 border-t border-gray-800" />
    </div>
  );
}

function PreviewRetro() {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#fef3c7' }}>
      <div className="h-2 flex items-center px-1.5" style={{ backgroundColor: '#fde68a', borderBottom: '2px solid #d97706' }}>
        <div className="w-4 h-1 bg-amber-800 rounded-sm" />
        <div className="flex gap-0.5 ml-auto"><div className="w-1.5 h-0.5 bg-amber-600" /><div className="w-1.5 h-0.5 bg-amber-600" /></div>
      </div>
      <div className="flex-1 px-1.5 py-1 flex flex-col items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
        <div className="relative w-full flex flex-col items-center border border-dashed border-amber-400 p-1 rounded-sm">
          <div className="w-8 h-1 bg-amber-900 rounded-sm mb-0.5" />
          <div className="w-5 h-0.5 bg-amber-600/60 rounded-sm mb-1" />
          <div className="flex gap-0.5">
            <div className="w-4 h-1.5 bg-amber-700 rounded-sm" />
            <div className="w-4 h-1.5 border border-amber-600 rounded-sm" />
          </div>
        </div>
      </div>
      <div className="py-1 px-1.5 flex gap-1 justify-center">
        <div className="w-4 h-3 border border-dashed border-amber-400 rounded-sm bg-white flex items-center justify-center"><div className="w-1 h-1 text-amber-600 text-[4px] leading-none">*</div></div>
        <div className="w-4 h-3 border border-dashed border-amber-400 rounded-sm bg-white flex items-center justify-center"><div className="w-1 h-1 text-amber-600 text-[4px] leading-none">*</div></div>
        <div className="w-4 h-3 border border-dashed border-amber-400 rounded-sm bg-white flex items-center justify-center"><div className="w-1 h-1 text-amber-600 text-[4px] leading-none">*</div></div>
      </div>
      <div className="h-2" style={{ backgroundColor: '#78350f' }} />
    </div>
  );
}

const previewComponents: Record<string, React.FC> = {
  classic: PreviewClassic,
  elegant: PreviewElegant,
  bold: PreviewBold,
  minimal: PreviewMinimal,
  cozy: PreviewCozy,
  modern: PreviewModern,
  rustic: PreviewRustic,
  vibrant: PreviewVibrant,
  sleek: PreviewSleek,
  retro: PreviewRetro,
};

/* ── Main page ──────────────────────────────────────────────── */

export default function DesignTemplates() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [current, setCurrent] = useState('classic');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setCurrent(res.data.storefrontTemplate || 'classic');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleApply(id: string) {
    setSaving(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storefrontTemplate: id }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrent(id);
        setSuccess(`模板 "${templates.find((t) => t.id === id)?.name}" 已成功套用`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : '無法套用模板');
      }
    } catch {
      setError('網路連線錯誤');
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">載入中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模板設定 (Templates)</h1>
          <p className="text-sm text-gray-500 mt-1">選擇前台商店的版面佈局模板。這將改變頁首、主視覺、特色介紹、行動呼籲以及頁尾的風格。</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templates.map((tpl) => {
          const isActive = current === tpl.id;
          const isSaving = saving === tpl.id;
          const Preview = previewComponents[tpl.id];

          return (
            <div
              key={tpl.id}
              className={`relative bg-white rounded-lg border-2 transition-all ${
                isActive
                  ? 'border-primary-500 ring-2 ring-primary-100'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {/* Active badge */}
              {isActive && (
                <div className="absolute -top-2.5 -right-2.5 z-10 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Preview thumbnail */}
              <div className="aspect-[4/3] rounded-t-md overflow-hidden border-b border-gray-100">
                {Preview && <Preview />}
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">{tpl.name}</h3>
                  {isActive && (
                    <span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full">使用中</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{tpl.description}</p>
                <button
                  onClick={() => handleApply(tpl.id)}
                  disabled={isActive || isSaving}
                  className={`w-full text-xs font-medium py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
                  }`}
                >
                  {isSaving ? '套用中...' : isActive ? '目前模板' : '套用此模板'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
