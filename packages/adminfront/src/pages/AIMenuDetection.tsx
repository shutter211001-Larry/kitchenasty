import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { api } from '../lib/api.js';

interface ParsedOptionValue {
  name: string;
  priceModifier: number;
}

interface ParsedOption {
  name: string;
  isRequired: boolean;
  maxSelect?: number;
  values: ParsedOptionValue[];
}

interface ParsedItem {
  name: string;
  price: number;
  description: string;
  options?: ParsedOption[];
}

interface ParsedCategory {
  action?: 'MERGE' | 'CREATE';
  targetCategoryId?: string;
  name: string;
  items: ParsedItem[];
}

export default function AIMenuDetection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ParsedCategory[] | null>(null);
  const [existingCategories, setExistingCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get<{ data: { id: string; name: string }[] }>('/menu/categories')
      .then(res => setExistingCategories(res.data))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let width = img.width;
        let height = img.height;
        
        // Scale so that short edge is 1920px
        const shortEdge = Math.min(width, height);
        const scale = 1920 / shortEdge;
        
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Blob conversion failed'));
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
            type: 'image/webp',
            lastModified: Date.now()
          }));
        }, 'image/webp', 0.8);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = url;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 10) {
        setError('單次上傳上限為 10 張');
        return;
      }
      setError(null);
      setFiles(selectedFiles);
    }
  };

  const handleDetect = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      // Compress files
      const compressedFiles = await Promise.all(files.map(compressImage));
      
      const formData = new FormData();
      compressedFiles.forEach(file => {
        formData.append('images', file);
      });

      const res = await api.upload<{ data: { categories: ParsedCategory[] } }>('/menu/ai-detect', formData);

      setCategories(res.data.categories);
    } catch (err: any) {
      setError(err.message || '辨識失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!categories) return;
    setImporting(true);
    setError(null);

    try {
      await api.post('/menu/ai-detect/import', { categories });
      navigate('/menu/items');
    } catch (err: any) {
      setError(err.message || '匯入失敗');
      setImporting(false);
    }
  };

  const updateCategoryName = (cIndex: number, val: string) => {
    const newCats = [...categories!];
    newCats[cIndex].name = val;
    setCategories(newCats);
  };

  const updateItem = (cIndex: number, iIndex: number, field: keyof ParsedItem, val: string | number) => {
    const newCats = [...categories!];
    newCats[cIndex].items[iIndex] = { ...newCats[cIndex].items[iIndex], [field]: val };
    setCategories(newCats);
  };

  const updateOption = (cIndex: number, iIndex: number, oIndex: number, field: keyof ParsedOption, val: any) => {
    const newCats = [...categories!];
    const opts = newCats[cIndex].items[iIndex].options;
    if (opts && opts[oIndex]) {
      opts[oIndex] = { ...opts[oIndex], [field]: val };
    }
    setCategories(newCats);
  };

  const updateOptionValue = (cIndex: number, iIndex: number, oIndex: number, vIndex: number, field: keyof ParsedOptionValue, val: any) => {
    const newCats = [...categories!];
    const opts = newCats[cIndex].items[iIndex].options;
    if (opts && opts[oIndex] && opts[oIndex].values[vIndex]) {
      opts[oIndex].values[vIndex] = { ...opts[oIndex].values[vIndex], [field]: val };
    }
    setCategories(newCats);
  };

  const addOption = (cIndex: number, iIndex: number) => {
    const newCats = [...categories!];
    const item = newCats[cIndex].items[iIndex];
    if (!item.options) item.options = [];
    item.options.push({ name: '新選項', isRequired: false, maxSelect: 1, values: [{ name: '選項值', priceModifier: 0 }] });
    setCategories(newCats);
  };

  const removeOption = (cIndex: number, iIndex: number, oIndex: number) => {
    const newCats = [...categories!];
    const opts = newCats[cIndex].items[iIndex].options;
    if (opts) opts.splice(oIndex, 1);
    setCategories(newCats);
  };

  const addOptionValue = (cIndex: number, iIndex: number, oIndex: number) => {
    const newCats = [...categories!];
    const opts = newCats[cIndex].items[iIndex].options;
    if (opts && opts[oIndex]) {
      opts[oIndex].values.push({ name: '選項值', priceModifier: 0 });
    }
    setCategories(newCats);
  };

  const removeOptionValue = (cIndex: number, iIndex: number, oIndex: number, vIndex: number) => {
    const newCats = [...categories!];
    const opts = newCats[cIndex].items[iIndex].options;
    if (opts && opts[oIndex]) {
      opts[oIndex].values.splice(vIndex, 1);
    }
    setCategories(newCats);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">AI 菜單偵測</h2>
        <button
          onClick={() => navigate('/menu/items')}
          className="text-gray-600 hover:text-gray-900"
        >
          取消
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {!categories ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 cursor-pointer hover:border-primary-500 transition-colors mb-6"
          >
            <div className="text-gray-500">
              <p className="text-lg mb-2">點擊選擇菜單照片</p>
              <p className="text-sm">支援 JPG, PNG (上限 10 張)</p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mb-6 text-left bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">已選擇 {files.length} 張圖片:</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {files.map((f, i) => <li key={i}>{f.name}</li>)}
              </ul>
            </div>
          )}

          <button
            onClick={handleDetect}
            disabled={files.length === 0 || loading}
            className="w-full sm:w-auto bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'AI 辨識中...' : '開始偵測'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">辨識結果預覽</h3>
            <div className="text-sm text-gray-500">
              請確認欄位並修改，完成後點擊匯入
            </div>
          </div>
          
          <div className="p-6">
            {categories.map((cat, cIndex) => (
              <div key={cIndex} className="mb-8 last:mb-0">
                <div className="flex items-center gap-4 mb-4 bg-gray-50 p-3 rounded-lg">
                  <label className="font-medium text-gray-700 w-24">分類名稱</label>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => updateCategoryName(cIndex, e.target.value)}
                      className="w-1/2 border-gray-300 rounded px-3 py-1"
                      disabled={cat.action === 'MERGE'}
                    />
                    <select
                      value={cat.action === 'MERGE' ? cat.targetCategoryId : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newCats = [...categories!];
                        if (val === '') {
                          newCats[cIndex].action = 'CREATE';
                          newCats[cIndex].targetCategoryId = undefined;
                        } else {
                          newCats[cIndex].action = 'MERGE';
                          newCats[cIndex].targetCategoryId = val;
                          const selectedCat = existingCategories.find(c => c.id === val);
                          if (selectedCat) newCats[cIndex].name = selectedCat.name;
                        }
                        setCategories(newCats);
                      }}
                      className="w-1/2 border-gray-300 rounded px-3 py-1 bg-white"
                    >
                      <option value="">✨ 建立為新類別</option>
                      {existingCategories.map(ec => (
                        <option key={ec.id} value={ec.id}>🔗 合併至現有：{ec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-sm">
                      <th className="p-3 font-medium">品項名稱</th>
                      <th className="p-3 font-medium w-32">價格</th>
                      <th className="p-3 font-medium">說明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item, iIndex) => (
                      <tr key={iIndex} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3 align-top">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(cIndex, iIndex, 'name', e.target.value)}
                            className="w-full border-gray-300 rounded px-2 py-1"
                          />
                          <div className="mt-2 space-y-2">
                            {item.options?.map((opt, oIdx) => (
                              <div key={oIdx} className="bg-white border border-gray-200 rounded p-2 shadow-sm relative group">
                                <button onClick={() => removeOption(cIndex, iIndex, oIdx)} className="absolute top-1 right-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <div className="flex flex-wrap items-center gap-2 mb-2 pr-4">
                                  <input type="text" value={opt.name} onChange={e => updateOption(cIndex, iIndex, oIdx, 'name', e.target.value)} className="w-24 text-xs border-gray-300 rounded px-1.5 py-1 font-medium text-indigo-600" placeholder="選項名稱" />
                                  <label className="flex items-center text-[10px] text-gray-500 gap-1"><input type="checkbox" checked={opt.isRequired} onChange={e => updateOption(cIndex, iIndex, oIdx, 'isRequired', e.target.checked)} className="rounded text-indigo-600 w-3 h-3" />必選</label>
                                  <label className="flex items-center text-[10px] text-gray-500 gap-1">至多選<input type="number" min={1} max={99} value={opt.maxSelect || 1} onChange={e => updateOption(cIndex, iIndex, oIdx, 'maxSelect', Number(e.target.value))} className="w-10 border-gray-300 rounded px-1 py-0.5 text-center" />項</label>
                                </div>
                                <div className="space-y-1">
                                  {opt.values.map((v, vIdx) => (
                                    <div key={vIdx} className="flex items-center gap-1">
                                      <input type="text" value={v.name} onChange={e => updateOptionValue(cIndex, iIndex, oIdx, vIdx, 'name', e.target.value)} className="flex-1 text-xs border-gray-300 rounded px-1.5 py-1" placeholder="選項值" />
                                      <span className="text-[10px] text-gray-400">+$</span>
                                      <input type="number" value={v.priceModifier} onChange={e => updateOptionValue(cIndex, iIndex, oIdx, vIdx, 'priceModifier', Number(e.target.value))} className="w-14 text-xs border-gray-300 rounded px-1.5 py-1" placeholder="0" />
                                      <button onClick={() => removeOptionValue(cIndex, iIndex, oIdx, vIdx)} className="text-gray-400 hover:text-red-500 px-1 flex items-center justify-center"><X className="w-4 h-4" /></button>
                                    </div>
                                  ))}
                                </div>
                                <button onClick={() => addOptionValue(cIndex, iIndex, oIdx)} className="text-[10px] text-indigo-600 hover:text-indigo-800 mt-2 flex items-center gap-0.5">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>新增選項值
                                </button>
                              </div>
                            ))}
                            <button onClick={() => addOption(cIndex, iIndex)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 py-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>新增選項
                            </button>
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(cIndex, iIndex, 'price', Number(e.target.value))}
                            className="w-full border-gray-300 rounded px-2 py-1"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => updateItem(cIndex, iIndex, 'description', e.target.value)}
                            className="w-full border-gray-300 rounded px-2 py-1"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
            <button
              onClick={() => setCategories(null)}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              disabled={importing}
            >
              重新上傳
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {importing && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {importing ? '正在匯入並產生多國語系...' : '確認匯入'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
