import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Plus, Trash2, AlertCircle, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const API = 'http://localhost:3000/api/dictionaries';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'actions' | 'units' | 'global'>('actions');
  const [actionGroups, setActionGroups] = useState<any[]>([]);
  const [unitGroups, setUnitGroups] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState({
    decimalPrecision: 1,
    autoUnitConversionThreshold: 1000
  });
  const [loading, setLoading] = useState(true);

  // Group CRUD state
  const [newGroupName, setNewGroupName] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Item CRUD state
  const [newItemName, setNewItemName] = useState('');

  // Expanded actions within a group
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [actRes, ugRes, settingsRes] = await Promise.all([
        axios.get(`${API}/actions`),
        axios.get(`${API}/units`),
        axios.get('http://localhost:3000/api/settings')
      ]);
      setActionGroups(actRes.data);
      setUnitGroups(ugRes.data);
      if (settingsRes.data) {
        setGlobalSettings(settingsRes.data);
      }
      if (actRes.data.length > 0) setActiveGroupId(actRes.data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitGroups = async () => {
    try {
      const [actRes, ugRes] = await Promise.all([
        axios.get(`${API}/units`),
        activeTab === 'units' ? axios.get(`${API}/units`) : axios.get(`${API}/actions`),
      ]);
      setUnitGroups(actRes.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    setActiveGroupId(null);
    setExpandedActionId(null);
    fetchAll();
  }, [activeTab]);

  // ── Group level default units (ActionGroup ↔ UnitGroup) ──
  const toggleGroupDefaultUnit = async (groupId: string, unitGroupId: string, currentIds: string[]) => {
    const newIds = currentIds.includes(unitGroupId)
      ? currentIds.filter(id => id !== unitGroupId)
      : [...currentIds, unitGroupId];
    await axios.put(`${API}/actions/groups/${groupId}/default-units`, { unitGroupIds: newIds });
    fetchAll();
  };

  // ── Action level default units (Action ↔ UnitGroup) ──
  const toggleActionDefaultUnit = async (actionId: string, unitGroupId: string, currentIds: string[]) => {
    const newIds = currentIds.includes(unitGroupId)
      ? currentIds.filter(id => id !== unitGroupId)
      : [...currentIds, unitGroupId];
    await axios.put(`${API}/actions/${actionId}/default-units`, { unitGroupIds: newIds });
    fetchAll();
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    const endpoint = activeTab === 'actions' ? `${API}/actions/groups` : `${API}/units/groups`;
    await axios.post(endpoint, { name: newGroupName, icon: activeTab === 'actions' ? 'LayoutList' : undefined });
    setNewGroupName('');
    fetchAll();
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('確定刪除這個群組？這會刪除底下所有項目！')) return;
    const endpoint = activeTab === 'actions' ? `${API}/actions/groups/${id}` : `${API}/units/groups/${id}`;
    await axios.delete(endpoint);
    fetchAll();
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !activeGroupId) return;
    const endpoint = activeTab === 'actions' ? `${API}/actions` : `${API}/units`;
    await axios.post(endpoint, { name: newItemName, groupId: activeGroupId });
    setNewItemName('');
    fetchAll();
  };

  const handleDeleteItem = async (id: string) => {
    const endpoint = activeTab === 'actions' ? `${API}/actions/${id}` : `${API}/units/${id}`;
    await axios.delete(endpoint);
    fetchAll();
  };

  const handleSaveGlobalSettings = async () => {
    try {
      await axios.put('http://localhost:3000/api/settings', globalSettings);
      alert('系統全域設定已儲存！');
    } catch (e) {
      console.error('Failed to save settings:', e);
      alert('儲存失敗，請重試。');
    }
  };

  const groups = activeTab === 'actions' ? actionGroups : unitGroups;
  const activeGroup = groups.find(g => g.id === activeGroupId);
  const items = activeTab === 'actions' ? (activeGroup?.actions || []) : (activeGroup?.units || []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-4xl font-black text-gray-800 tracking-tight mb-2">食譜動作設定</h2>
        <p className="text-muted-foreground font-medium">動態管理食譜編輯器中使用的各種參數與分類選項。</p>
      </header>

      <div className="bg-white rounded-[2rem] border border-border overflow-hidden shadow-sm flex flex-col min-h-[600px]">
        {/* Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap border-b border-border bg-muted/10 p-4 gap-2">
          <button onClick={() => setActiveTab('actions')} className={cn('flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer text-center justify-center flex', activeTab === 'actions' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-white')}>
            動作群組管理
          </button>
          <button onClick={() => setActiveTab('units')} className={cn('flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer text-center justify-center flex', activeTab === 'units' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-white')}>
            單位群組管理
          </button>
          <button onClick={() => setActiveTab('global')} className={cn('flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer text-center justify-center flex', activeTab === 'global' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-white')}>
            系統全域設定
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {activeTab === 'global' ? (
            <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-muted/5">
              <div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">系統偏好設定</h3>
                <p className="text-sm text-muted-foreground">管理全系統通用的數值顯示與單位進位規則。</p>
              </div>

              <div className="max-w-2xl space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
                  {/* Decimal Precision */}
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-800">數值顯示精確度 (小數點位數)</label>
                    <p className="text-xs text-muted-foreground">在介面上顯示庫存或食譜用量時，最多保留到小數點後幾位。例如：設定為 1 時，顯示 1.5；設定為 2 時，顯示 1.50。</p>
                    <input 
                      type="number" 
                      min="0" 
                      max="4" 
                      className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-gray-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      value={globalSettings.decimalPrecision}
                      onChange={e => setGlobalSettings({ ...globalSettings, decimalPrecision: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <hr className="border-border" />

                  {/* Auto Unit Conversion Threshold */}
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-800">自動單位進位閾值</label>
                    <p className="text-xs text-muted-foreground">當數量超過此設定值時，系統會在合適的介面中自動嘗試換算為較大的單位 (例如：超過 1000g 時，自動顯示為 1kg)。設為 0 表示不自動進位。</p>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        min="0" 
                        className="flex-1 px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-gray-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        value={globalSettings.autoUnitConversionThreshold}
                        onChange={e => setGlobalSettings({ ...globalSettings, autoUnitConversionThreshold: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">基本單位 (如 g, ml)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleSaveGlobalSettings}
                    className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl shadow-sm transition-all"
                  >
                    儲存系統設定
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Left: Group List */}
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border flex flex-col bg-muted/5 shrink-0 max-h-[260px] md:max-h-none">
            <div className="p-4 border-b border-border">
              <form onSubmit={handleCreateGroup} className="flex gap-2">
                <input type="text" placeholder="新增群組..." className="flex-1 px-3 py-2 text-sm bg-white border border-border rounded-lg outline-none focus:border-primary font-bold" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                <button type="submit" className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"><Plus className="w-4 h-4" /></button>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {loading ? <div className="py-10 text-center text-muted-foreground text-sm">載入中...</div> : groups.map(group => (
                <div key={group.id} onClick={() => setActiveGroupId(group.id)}
                  className={cn('group flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all border', activeGroupId === group.id ? 'bg-white border-primary shadow-sm' : 'border-transparent hover:bg-white')}
                >
                  <div>
                    <span className="font-bold text-sm">{group.name}</span>
                    {activeTab === 'actions' && group.defaultUnitGroups?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {group.defaultUnitGroups.map((ug: any) => (
                          <span key={ug.id} className="text-[9px] bg-primary/10 text-primary px-1.5 rounded font-bold">{ug.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeGroup ? (
              <>
                {/* Group Header */}
                <div className="p-4 sm:p-6 border-b border-border bg-muted/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-xl font-black text-gray-800">{activeGroup.name}</h3>
                    <form onSubmit={handleCreateItem} className="flex gap-2 w-full sm:w-auto shrink-0">
                      <input type="text" placeholder={`新增${activeTab === 'actions' ? '動作' : '單位'}...`}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-border rounded-xl outline-none focus:border-primary font-bold text-sm shadow-sm font-semibold"
                        value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                      <button type="submit" className="px-4 bg-primary text-white font-bold rounded-xl text-sm cursor-pointer shrink-0">新增</button>
                    </form>
                  </div>

                  {/* ActionGroup: Default Unit Groups (Group level) */}
                  {activeTab === 'actions' && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">群組通用預設單位（此群組所有動作都會繼承）</p>
                      <div className="flex flex-wrap gap-2">
                        {unitGroups.map(ug => {
                          const isSelected = activeGroup.defaultUnitGroups?.some((d: any) => d.id === ug.id);
                          const currentIds = activeGroup.defaultUnitGroups?.map((d: any) => d.id) || [];
                          return (
                            <button key={ug.id}
                              onClick={() => toggleGroupDefaultUnit(activeGroup.id, ug.id, currentIds)}
                              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all',
                                isSelected ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                              )}>
                              {isSelected && <Check className="w-3 h-3" />}
                              {ug.name}
                            </button>
                          );
                        })}
                        {unitGroups.length === 0 && <span className="text-xs text-muted-foreground">尚無單位群組</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-6">
                  {items.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-3xl">
                      <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      這個群組目前沒有任何項目。
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item: any) => (
                        <div key={item.id} className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm">
                          {/* Item header row */}
                          <div className="flex items-center justify-between p-4 group">
                            <div className="flex items-center gap-3 flex-1">
                              {activeTab === 'actions' && (
                                <button onClick={() => setExpandedActionId(expandedActionId === item.id ? null : item.id)}
                                  className="text-muted-foreground hover:text-primary transition-colors">
                                  {expandedActionId === item.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              )}
                              <span className="font-bold">{item.name}</span>
                              {/* Inherited unit tags */}
                              {activeTab === 'actions' && activeGroup.defaultUnitGroups?.map((ug: any) => (
                                <span key={ug.id} className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">↑ {ug.name}</span>
                              ))}
                              {/* Action-own unit tags */}
                              {activeTab === 'actions' && item.defaultUnitGroups?.map((ug: any) => (
                                <span key={ug.id} className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{ug.name}</span>
                              ))}
                            </div>
                            <button onClick={() => handleDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-1.5 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Expanded action: own default units */}
                          {activeTab === 'actions' && expandedActionId === item.id && (
                            <div className="border-t border-border bg-muted/5 p-4">
                              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
                                動作專屬追加單位（疊加在群組通用單位之上）
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {unitGroups.map(ug => {
                                  const isInherited = activeGroup.defaultUnitGroups?.some((d: any) => d.id === ug.id);
                                  const isOwn = item.defaultUnitGroups?.some((d: any) => d.id === ug.id);
                                  const currentOwnIds = item.defaultUnitGroups?.map((d: any) => d.id) || [];
                                  return (
                                    <button key={ug.id}
                                      disabled={isInherited}
                                      onClick={() => toggleActionDefaultUnit(item.id, ug.id, currentOwnIds)}
                                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all',
                                        isInherited ? 'bg-muted border-muted text-muted-foreground cursor-not-allowed opacity-60' :
                                        isOwn ? 'bg-primary text-white border-primary' :
                                        'bg-white text-muted-foreground border-border hover:border-primary/50'
                                      )}>
                                      {isInherited && '↑ '}
                                      {isOwn && !isInherited && <Check className="w-3 h-3" />}
                                      {ug.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
                <SettingsIcon className="w-16 h-16 opacity-10" />
                <p className="font-bold">請選擇或建立一個群組</p>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
