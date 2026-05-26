import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, ShieldAlert, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

interface Allergen {
  id: string;
  name: string;
}

interface AllergenManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAllergens?: () => void;
}

export const AllergenManagerModal: React.FC<AllergenManagerModalProps> = ({
  isOpen,
  onClose,
  onRefreshAllergens
}) => {
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAllergens = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/allergens');
      setAllergens(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch allergens', err);
      setError('載入過敏原標籤失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllergens();
    }
  }, [isOpen]);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      setLoading(true);
      setError('');
      const response = await axios.post('http://localhost:3000/api/allergens', {
        name: newTagName.trim()
      });
      setAllergens(prev => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagName('');
      if (onRefreshAllergens) onRefreshAllergens();
    } catch (err: any) {
      console.error('Failed to create allergen tag', err);
      setError(err.response?.data?.error || '建立標籤失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (id: string, name: string) => {
    if (!confirm(`確認刪除過敏原標籤「${name}」？此操作將會移除所有食材與此標籤的連結。`)) return;

    try {
      setLoading(true);
      setError('');
      await axios.delete(`http://localhost:3000/api/allergens/${id}`);
      setAllergens(prev => prev.filter(t => t.id !== id));
      if (onRefreshAllergens) onRefreshAllergens();
    } catch (err) {
      console.error('Failed to delete allergen tag', err);
      setError('刪除標籤失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-500 border border-rose-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-800">過敏原標籤管理</h3>
              <p className="text-[10px] text-muted-foreground font-bold">自訂與維護食材中可供選取的過敏原種類</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-3 text-xs font-bold flex gap-2 animate-in slide-in-from-top-1">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Add tag form */}
          <form onSubmit={handleAddTag} className="flex gap-2">
            <div className="flex-1 flex items-center bg-muted border border-border rounded-xl px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-300 transition-all">
              <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
              <input 
                type="text" 
                placeholder="例如: 麩質 (Gluten), 堅果 (Nuts)"
                className="w-full bg-transparent text-xs font-bold outline-none text-gray-800"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !newTagName.trim()}
              className="px-4 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 hover:shadow-lg hover:shadow-rose-500/20 transition-all flex items-center gap-1 shrink-0 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Plus className="w-4 h-4" />
              <span>新增</span>
            </button>
          </form>

          {/* Tag List */}
          <div className="space-y-2 flex-1 flex flex-col">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">現有過敏原標籤 ({allergens.length})</h4>
            <div className="border border-border rounded-2xl bg-muted/10 p-3 flex-1 overflow-y-auto max-h-[350px] min-h-[150px] space-y-1.5">
              {loading && allergens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground font-medium text-xs">
                  <div className="w-5 h-5 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                  <span>載入中...</span>
                </div>
              ) : allergens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground italic">
                  <Tag className="w-8 h-8 mb-2 text-gray-300" />
                  <p className="text-xs">尚無任何過敏原標籤</p>
                  <p className="text-[9px] mt-0.5">請在上方欄位輸入並點擊「新增」</p>
                </div>
              ) : (
                allergens.map((tag) => (
                  <div 
                    key={tag.id}
                    className="flex items-center justify-between bg-white border border-border p-2.5 rounded-xl hover:shadow-sm hover:border-rose-200 group transition-all"
                  >
                    <span className="text-xs font-bold text-gray-700">{tag.name}</span>
                    <button 
                      type="button"
                      onClick={() => handleDeleteTag(tag.id, tag.name)}
                      className="p-1 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
