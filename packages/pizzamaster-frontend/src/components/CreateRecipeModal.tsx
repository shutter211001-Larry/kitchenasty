import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Save, Search, Plus, Trash2, ChevronRight, GripVertical, LayoutList, ChevronDown, ChevronUp, Check, AlertTriangle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '../lib/utils';

interface Props {
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

// Removed hardcoded ACTION_GROUPS

interface UnitSelectorProps {
  value: string;
  onChange: (val: string) => void;
  availableGroups: any[];
  className?: string;
}

const UnitSelector = ({ value, onChange, availableGroups, className }: UnitSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [activeGroup, setActiveGroup] = useState<any | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    setActiveGroup(null);
  };

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handler = () => updateCoords();
      window.addEventListener('scroll', handler);
      window.addEventListener('resize', handler);
      return () => {
        window.removeEventListener('scroll', handler);
        window.removeEventListener('resize', handler);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (isOpen && 
          buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', clickOutside);
    return () => document.removeEventListener('click', clickOutside);
  }, [isOpen]);

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className="px-2 py-1 bg-muted/65 hover:bg-muted border border-border/50 rounded-lg text-[10px] font-bold text-gray-700 flex items-center gap-1 shadow-sm transition-all"
      >
        <span>{value}</span>
        <ChevronRight className="w-2.5 h-2.5 rotate-90 opacity-60" />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          id="unit-selector-dropdown"
          style={{ 
            position: 'absolute', 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            zIndex: 9999
          }}
          className="bg-white border border-border rounded-xl shadow-xl p-1.5 min-w-[130px] max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {activeGroup === null ? (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest">選擇類別</div>
              {availableGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveGroup(g); }}
                  className="w-full text-left px-2 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-all flex justify-between items-center"
                >
                  <span>{g.name}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveGroup(null); }}
                className="w-full text-left px-2 py-1 border-b border-border/50 text-[10px] font-black text-primary hover:bg-primary/5 rounded-t-lg transition-all flex items-center gap-1 mb-1"
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
                <span>返回選單</span>
              </button>
              {activeGroup.units.map((u: any) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(u.name); setIsOpen(false); }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-[11px] font-bold rounded-lg transition-all flex justify-between items-center",
                    value === u.name ? "bg-primary/5 text-primary" : "text-gray-700 hover:bg-muted/50 hover:text-primary"
                  )}
                >
                  <span>{u.name}</span>
                  {value === u.name && <Check className="w-3 h-3 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

const CreateRecipeModal = ({ initialData, onClose, onSuccess }: Props) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description] = useState(initialData?.description || '');
  const [yieldAmount, setYieldAmount] = useState(initialData?.yieldAmount || 1);
  const [yieldUnit, setYieldUnit] = useState(initialData?.yieldUnit || '份');
  const [isSubRecipe, setIsSubRecipe] = useState(initialData?.isSubRecipe || false);
  const [isProduct, setIsProduct] = useState(initialData?.isProduct !== false); // default to true
  const [bakingLossRate, setBakingLossRate] = useState(initialData?.bakingLossRate || 0);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [actionGroups, setActionGroups] = useState<any[]>([]);
  const [unitGroups, setUnitGroups] = useState<any[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDictionaries = async () => {
      try {
        const [actionsRes, unitsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/dictionaries/actions'),
          axios.get('http://localhost:3000/api/dictionaries/units')
        ]);
        setActionGroups(actionsRes.data);
        setUnitGroups(unitsRes.data);
        
        if (actionsRes.data.length > 0) {
          setOpenGroups([actionsRes.data[0].name]);
        }
      } catch (error) {
        console.error('Failed to fetch dictionaries', error);
      }
    };
    fetchDictionaries();
  }, []);

  useEffect(() => {
    if (initialData?.steps) {
      const mappedSteps = initialData.steps.map((s: any) => ({
        id: s.id,
        action: s.action,
        description: s.description || '',
        parameters: (s.parameters || []).map((p: any) => ({
          value: p.value,
          unit: p.unit
        })),
        items: (s.items || []).map((i: any) => ({
          id: i.id,
          type: i.ingredientId ? 'ingredient' : i.subRecipeId ? 'recipe' : 'step_output',
          name: i.ingredient?.name || i.subRecipe?.name || `(產出) 步驟參考`,
          sourceStepId: i.sourceStepId,
          data: i.ingredient || i.subRecipe,
          quantity: i.quantity,
          unit: i.unit || (i.ingredient ? i.ingredient.unit : 'g'),
          portionQuantity: i.portionQuantity,
          usePortion: !!i.portionQuantity
        }))
      }));
      setSteps(mappedSteps);
      if (mappedSteps.length > 0) setActiveStepId(mappedSteps[mappedSteps.length - 1].id);
    }
  }, [initialData]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const fetchResults = async () => {
      try {
        console.log('Searching for:', search);
        const [ingRes, recRes] = await Promise.all([
          axios.get(`http://localhost:3000/api/ingredients?search=${search}`),
          axios.get(`http://localhost:3000/api/recipes`)
        ]);
        
        console.log('Ing results:', ingRes.data.length);
        console.log('Rec results:', recRes.data.length);

        const ingredients = ingRes.data.map((i: any) => ({ ...i, type: 'ingredient' }));
        const recipes = recRes.data
          .filter((r: any) => r.name.toLowerCase().includes(search.toLowerCase()))
          .map((r: any) => ({ ...r, type: 'recipe' }));
        
        setSearchResults([...ingredients, ...recipes]);
      } catch (error) {
        console.error('Search failed detailed error:', error);
      }
    };
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const calculateStepOutput = (stepId: string, currentSteps: any[], visited: Set<string> = new Set()): { totalWeight: number, ingredients: Record<string, number> } => {
    if (visited.has(stepId)) return { totalWeight: 0, ingredients: {} };
    visited.add(stepId);

    const step = currentSteps.find(s => s.id === stepId);
    if (!step) return { totalWeight: 0, ingredients: {} };

    let totalWeight = 0;
    const ingredients: Record<string, number> = {};

    for (const item of step.items) {
      if (item.type === 'ingredient' && item.data) {
        let qty = Number(item.quantity) || 0;
        totalWeight += qty;
        ingredients[item.name] = (ingredients[item.name] || 0) + qty;
      } else if (item.type === 'step_output') {
        const sourceOut = calculateStepOutput(item.sourceStepId, currentSteps, visited);
        const ratio = (Number(item.quantity) || 0) / 100;
        
        totalWeight += sourceOut.totalWeight * ratio;
        for (const [ingName, ingQty] of Object.entries(sourceOut.ingredients)) {
          ingredients[ingName] = (ingredients[ingName] || 0) + (ingQty * ratio);
        }
      } else if (item.type === 'recipe') {
        let qty = item.usePortion ? (item.portionQuantity || 1) : (Number(item.quantity) || 0);
        totalWeight += item.usePortion ? 0 : qty;
        ingredients[item.name] = (ingredients[item.name] || 0) + qty;
      }
    }

    visited.delete(stepId);
    return { totalWeight, ingredients };
  };

  const calculateRemainingOutput = (stepId: string, currentSteps: any[]): number => {
    let usedPercentage = 0;
    for (const step of currentSteps) {
      for (const item of step.items) {
        if (item.type === 'step_output' && item.sourceStepId === stepId) {
          usedPercentage += Number(item.quantity) || 0;
        }
      }
    }
    return Math.max(0, 100 - usedPercentage);
  };

  const getGroupForUnit = (unitName: string) => {
    return unitGroups.find(g => g.units?.some((u: any) => u.name === unitName));
  };

  const addStep = (actionName: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const initialParams: any[] = [];
    
    for (const group of actionGroups) {
      const actionObj = group.actions?.find((a: any) => a.name === actionName);
      if (actionObj) {
        const mergedUnitGroupIds = new Set([
          ...(group.defaultUnitGroups || []).map((ug: any) => ug.id),
          ...(actionObj.defaultUnitGroups || []).map((ug: any) => ug.id),
        ]);
        for (const ug of unitGroups) {
          if (mergedUnitGroupIds.has(ug.id) && ug.units?.length > 0) {
            initialParams.push({ value: 0, unit: ug.units[0].name });
          }
        }
        break;
      }
    }

    if (initialParams.length === 0) {
      initialParams.push({ value: 0, unit: 'min' });
    }

    const newStep = {
      id: newId,
      action: actionName,
      description: '',
      parameters: initialParams,
      items: []
    };
    setSteps([...steps, newStep]);
    setActiveStepId(newId);
  };

  const addIngredientToStep = (stepId: string, item: any) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        return {
          ...s,
          items: [...s.items, {
            id: Math.random().toString(36).substr(2, 9),
            type: item.type,
            name: item.name,
            data: item,
            quantity: 100,
            unit: item.unit || 'g',
            portionQuantity: 1,
            usePortion: false
          }]
        };
      }
      return s;
    }));
    setSearch('');
    setSearchResults([]);
  };

  const addStepOutputToStep = (targetStepId: string, sourceStep: any) => {
    const remaining = calculateRemainingOutput(sourceStep.id, steps);
    if (remaining <= 0) {
      alert('該步驟產出已被完全引用 (100%)');
      return;
    }

    setSteps(steps.map(s => {
      if (s.id === targetStepId) {
        return {
          ...s,
          items: [...s.items, {
            id: Math.random().toString(36).substr(2, 9),
            type: 'step_output',
            name: `(產出) ${sourceStep.action}`,
            sourceStepId: sourceStep.id,
            quantity: remaining,
            usePortion: false
          }]
        };
      }
      return s;
    }));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const removeItemFromStep = (stepId: string, itemId: string) => {
    setSteps(steps.map(s => {
      if (s.id === stepId) {
        return { ...s, items: s.items.filter((i: any) => i.id !== itemId) };
      }
      return s;
    }));
  };

  const onDragEnd = (result: any) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;

    if (type === 'step' && source.droppableId === 'steps') {
      const newSteps = Array.from(steps);
      const [reordered] = newSteps.splice(source.index, 1);
      newSteps.splice(destination.index, 0, reordered);
      setSteps(newSteps);
      return;
    }

    if (source.droppableId.startsWith('library-')) {
      const itemData = JSON.parse(draggableId);
      
      if (itemData.isAction && destination.droppableId === 'steps') {
        const newId = Math.random().toString(36).substr(2, 9);
        const newStep = {
          id: newId,
          action: itemData.action,
          description: '',
          parameters: [{ value: 0, unit: itemData.action === '溫度' ? '℃' : itemData.action === '切片' ? 'cm' : 'min' }],
          items: []
        };
        const newSteps = Array.from(steps);
        newSteps.splice(destination.index, 0, newStep);
        setSteps(newSteps);
        setActiveStepId(newId);
      }
      
      if (!itemData.isAction && destination.droppableId !== 'steps') {
        const targetStepId = destination.droppableId;
        setSteps(steps.map(s => {
          if (s.id === targetStepId) {
            const newItem = {
              id: Math.random().toString(36).substr(2, 9),
              type: itemData.type,
              name: itemData.name,
              data: itemData,
              quantity: 100,
              unit: itemData.unit || 'g',
              portionQuantity: 1,
              usePortion: false
            };
            const newItems = Array.from(s.items);
            newItems.splice(destination.index, 0, newItem);
            return { ...s, items: newItems };
          }
          return s;
        }));
      }
      return;
    }

    if (type === 'item') {
      const sourceStepId = source.droppableId;
      const destStepId = destination.droppableId;
      
      let movedItem: any = null;
      const updatedSteps = steps.map(s => {
        if (s.id === sourceStepId) {
          const newItems = Array.from(s.items);
          [movedItem] = newItems.splice(source.index, 1);
          return { ...s, items: newItems };
        }
        return s;
      });

      if (movedItem) {
        setSteps(updatedSteps.map(s => {
          if (s.id === destStepId) {
            const newItems = Array.from(s.items);
            newItems.splice(destination.index, 0, movedItem);
            return { ...s, items: newItems };
          }
          return s;
        }));
      }
    }
  };

  const toggleGroup = (name: string) => {
    setOpenGroups(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (steps.length === 0) return alert('請至少加入一個製作步驟');
    try {
      setLoading(true);
      const data = {
        name,
        description,
        yieldAmount,
        yieldUnit,
        isSubRecipe,
        isProduct,
        bakingLossRate,
        steps: steps.map(s => ({
          id: s.id,
          action: s.action,
          description: s.description,
          parameters: s.parameters.map((p: any) => ({
            value: p.value,
            unit: p.unit
          })),
          items: s.items.map((i: any) => ({
            quantity: i.usePortion ? 0 : i.quantity,
            portionQuantity: i.usePortion ? i.portionQuantity : null,
            unit: i.unit || 'g',
            ingredientId: i.type === 'ingredient' ? i.data.id : null,
            subRecipeId: i.type === 'recipe' ? i.data.id : null,
            sourceStepId: i.type === 'step_output' ? i.sourceStepId : null,
          }))
        }))
      };

      // Debug: log each step's items before payload mapping
      steps.forEach((s, si) => {
        console.log(`[DEBUG] Step[${si}] "${s.action}" items:`, s.items.length);
        s.items.forEach((i: any, ii: number) => {
          console.log(`  item[${ii}] type=${i.type} data=`, i.data, 'sourceStepId=', i.sourceStepId);
        });
      });

      console.log('[DEBUG] Recipe payload:', JSON.stringify(data, null, 2));

      if (initialData?.id) {
        await axios.put(`http://localhost:3000/api/recipes/${initialData.id}`, data);
      } else {
        await axios.post('http://localhost:3000/api/recipes', data);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save recipe', error);
      alert(error.response?.data?.error || `儲存失敗：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    console.log('[DEBUG] handleDelete clicked!', { initialDataId: initialData?.id, initialDataName: initialData?.name });
    if (!initialData?.id) {
      console.log('[DEBUG] initialData?.id is falsy!');
      return;
    }
    const confirmed = window.confirm(`確定要刪除食譜「${initialData.name}」嗎？\n\n此操作無法復原！`);
    console.log('[DEBUG] confirm result:', confirmed);
    if (!confirmed) return;
    try {
      setLoading(true);
      console.log('[DEBUG] Sending DELETE request for recipe:', initialData.id);
      await axios.delete(`http://localhost:3000/api/recipes/${initialData.id}`);
      console.log('[DEBUG] Delete successful!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('[DEBUG] Failed to delete recipe', error);
      alert(error.response?.data?.error || '刪除食譜失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        <header className="p-8 pb-6 flex justify-between items-center border-b border-border bg-muted/20">
          <div>
            <h3 className="text-3xl font-black text-gray-800 tracking-tight">
              {initialData ? '編輯食譜內容' : '建立結構化食譜'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">先建立步驟，再將食材加入動作中</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full shadow-sm transition-all">
            <X className="w-8 h-8 text-muted-foreground" />
          </button>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-hidden flex">
            {/* Left Panel: Nested Steps */}
            <div className="flex-[1.5] p-8 overflow-y-auto border-r border-border bg-muted/5">
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">食譜名稱</label>
                    <input 
                      type="text" 
                      placeholder="例如: 義式經典披薩皮" 
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-base font-bold"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-1 space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">產出份數</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        className="flex-1 px-4 py-3 bg-white border border-border rounded-xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-base font-bold"
                        value={yieldAmount}
                        onChange={(e) => setYieldAmount(parseFloat(e.target.value) || 1)}
                        min="1"
                      />
                      <select
                        className="w-24 px-2 py-3 bg-white border border-border rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                        value={yieldUnit}
                        onChange={e => setYieldUnit(e.target.value)}
                      >
                        {unitGroups.filter((g: any) => ['重量', '數量', '容積'].includes(g.name)).map((g: any) => (
                          <optgroup key={g.id} label={g.name}>
                            {g.units.map((u: any) => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-span-1 space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">烤焙損耗率 (%)</label>
                    <input 
                      type="number" 
                      placeholder="無損耗" 
                      className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-base font-bold"
                      value={bakingLossRate || ''}
                      onChange={(e) => setBakingLossRate(Math.max(0, Math.min(99, parseFloat(e.target.value) || 0)))}
                      min="0"
                      max="99"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* isSubRecipe toggle checkbox */}
                  <div className="bg-primary/5 border border-primary/10 px-5 py-3.5 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="flex items-center gap-3 cursor-pointer select-none w-full">
                      <input
                        type="checkbox"
                        checked={isSubRecipe}
                        onChange={(e) => {
                          setIsSubRecipe(e.target.checked);
                          if (e.target.checked) {
                            setIsProduct(false);
                          }
                        }}
                        className="w-4 h-4 accent-primary rounded border-border focus:ring-primary/20 cursor-pointer shrink-0"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                          📦 標記為半成品食譜 (Sub-recipe)
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5 leading-normal">
                          此食譜將收合至清單右側「半成品」，並可在其他步驟中被引用。
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* isProduct toggle checkbox */}
                  <div className="bg-primary/5 border border-primary/10 px-5 py-3.5 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="flex items-center gap-3 cursor-pointer select-none w-full">
                      <input
                        type="checkbox"
                        checked={isProduct}
                        onChange={(e) => {
                          setIsProduct(e.target.checked);
                          if (e.target.checked) {
                            setIsSubRecipe(false);
                          }
                        }}
                        className="w-4 h-4 accent-primary rounded border-border focus:ring-primary/20 cursor-pointer shrink-0"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                          🛒 標記為商品 (Product)
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5 leading-normal">
                          有此屬性才會出現在綁定食譜（線上接單整合）與標籤列印中。
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <Droppable droppableId="steps" type="step">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                      {steps.length === 0 ? (
                        <div className="py-20 border-2 border-dashed border-border rounded-[2rem] text-center text-muted-foreground flex flex-col items-center gap-4 bg-white/50">
                          <LayoutList className="w-12 h-12 opacity-10" />
                          <p className="font-bold">尚未加入步驟，請點擊右側動作卡片。</p>
                        </div>
                      ) : (
                        steps.map((step, index) => (
                          <Draggable key={step.id} draggableId={step.id} index={index}>
                            {(provided) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.draggableProps} 
                                onClick={() => setActiveStepId(step.id)}
                                className={cn(
                                  "bg-white border rounded-[2rem] shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer",
                                  activeStepId === step.id ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border"
                                )}
                              >
                                <div className="p-6 bg-muted/20 flex items-center gap-4 border-b border-border">
                                  <div {...provided.dragHandleProps} className="text-muted-foreground"><GripVertical className="w-5 h-5" /></div>
                                  <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold shrink-0">{index + 1}</div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-primary text-white rounded text-[10px] font-black uppercase">{step.action}</span>
                                      <input 
                                        type="text" 
                                        className="font-bold text-sm bg-transparent outline-none border-b border-transparent focus:border-primary w-full"
                                        placeholder="步驟補充說明..."
                                        value={step.description}
                                        onChange={(e) => setSteps(steps.map(s => s.id === step.id ? { ...s, description: e.target.value } : s))}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {index > 0 && (
                                      <div className="flex gap-1 mr-2">
                                        {steps.slice(0, index).map((prevStep, psIdx) => {
                                          const remaining = calculateRemainingOutput(prevStep.id, steps);
                                          if (remaining <= 0) return null;
                                          return (
                                            <button 
                                              key={prevStep.id}
                                              onClick={(e) => { e.stopPropagation(); addStepOutputToStep(step.id, prevStep); }}
                                              className="px-2 py-1 bg-muted hover:bg-gray-800 hover:text-white rounded text-[10px] font-bold transition-all"
                                              title={`加入步驟 ${psIdx + 1} (${prevStep.action}) 的產出 (剩餘 ${remaining}%)`}
                                            >
                                              + 步驟 {psIdx + 1}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                      {step.parameters.map((param: any, pIdx: number) => (
                                        <div key={pIdx} className="flex items-center bg-muted rounded-lg p-0.5 border border-border/50">
                                          <input 
                                            type="number" 
                                            className="w-12 bg-transparent px-1 py-1 text-xs text-right font-bold outline-none"
                                            value={param.value}
                                            onChange={(e) => {
                                              const newParams = [...step.parameters];
                                              newParams[pIdx].value = parseFloat(e.target.value) || 0;
                                              setSteps(steps.map(s => s.id === step.id ? { ...s, parameters: newParams } : s));
                                            }}
                                          />
                                          <UnitSelector
                                            className="ml-1"
                                            value={param.unit}
                                            onChange={(val) => {
                                              const newParams = [...step.parameters];
                                              newParams[pIdx].unit = val;
                                              setSteps(steps.map(s => s.id === step.id ? { ...s, parameters: newParams } : s));
                                            }}
                                            availableGroups={(() => {
                                              const otherUnits = step.parameters.filter((_: any, idx: number) => idx !== pIdx).map((p: any) => p.unit);
                                              const usedGroupIds = otherUnits.map((u: string) => getGroupForUnit(u)?.id).filter(Boolean);
                                              return unitGroups.filter(g => !usedGroupIds.includes(g.id));
                                            })()}
                                          />
                                          {step.parameters.length > 1 && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newParams = step.parameters.filter((_: any, i: number) => i !== pIdx);
                                                setSteps(steps.map(s => s.id === step.id ? { ...s, parameters: newParams } : s));
                                              }}
                                              className="p-1 hover:text-destructive text-muted-foreground transition-colors"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSteps(steps.map(s => s.id === step.id ? { ...s, parameters: [...s.parameters, { value: 0, unit: 'min' }] } : s));
                                        }}
                                        className="p-2 bg-muted/50 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-all"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </div>

                                <Droppable droppableId={step.id} type="item">
                                  {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="p-4 bg-white/50 min-h-[50px] space-y-2">
                                      {step.items.length === 0 ? (
                                        <div className="py-4 text-center text-[10px] text-muted-foreground border border-dashed border-border rounded-xl italic">
                                          將食材拖曳至此，或在搜尋結果中點擊「+」加入此步驟
                                        </div>
                                      ) : (
                                        step.items.map((item: any, iIdx: number) => (
                                          <Draggable key={item.id} draggableId={item.id} index={iIdx}>
                                            {(itemProvided, itemSnapshot) => (
                                              <div 
                                                ref={itemProvided.innerRef}
                                                {...itemProvided.draggableProps}
                                                className={cn(
                                                  "flex flex-col bg-white p-3 rounded-xl border border-border shadow-sm group transition-shadow w-full",
                                                  itemSnapshot.isDragging && "shadow-lg ring-2 ring-primary/20"
                                                )}
                                              >
                                                <div className="flex items-center gap-3 w-full">
                                                  <div {...itemProvided.dragHandleProps} className="text-muted-foreground/30 hover:text-primary transition-colors cursor-grab active:cursor-grabbing px-1 shrink-0">
                                                    <GripVertical className="w-4 h-4" />
                                                  </div>
                                                  <div className={cn(
                                                    "w-2 h-2 rounded-full shrink-0", 
                                                    item.type === 'ingredient' ? "bg-primary" : 
                                                    item.type === 'recipe' ? "bg-orange-500" : "bg-gray-800"
                                                  )} />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-xs truncate">{item.name}</p>
                                                  </div>
                                                  <div className="flex items-center gap-2 shrink-0">
                                                    {item.type === 'step_output' ? (
                                                      <div className="flex items-center gap-1.5 mr-2">
                                                        <input 
                                                          type="number"
                                                          min="0"
                                                          max="100"
                                                          className="w-14 bg-muted px-1.5 py-1 text-xs text-right font-bold rounded-lg border border-border/50 outline-none focus:border-primary transition-colors"
                                                          value={item.quantity}
                                                          onChange={(e) => {
                                                            const newQty = parseFloat(e.target.value) || 0;
                                                            setSteps(steps.map(s => s.id === step.id ? { ...s, items: s.items.map((it: any) => it.id === item.id ? { ...it, quantity: newQty } : it) } : s));
                                                          }}
                                                        />
                                                        <span className="text-[10px] font-bold text-muted-foreground">%</span>
                                                      </div>
                                                    ) : (
                                                      <div className="flex items-center gap-1.5">
                                                        {item.type === 'recipe' && (
                                                          <div className="flex bg-muted rounded-lg p-0.5">
                                                            <button 
                                                              type="button"
                                                              onClick={() => setSteps(steps.map(s => s.id === step.id ? { ...s, items: s.items.map((it: any) => it.id === item.id ? { ...it, usePortion: false } : it) } : s))}
                                                              className={cn("px-1.5 py-0.5 text-[8px] font-bold rounded", !item.usePortion ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                                                            >重</button>
                                                            <button 
                                                              type="button"
                                                              onClick={() => setSteps(steps.map(s => s.id === step.id ? { ...s, items: s.items.map((it: any) => it.id === item.id ? { ...it, usePortion: true } : it) } : s))}
                                                              className={cn("px-1.5 py-0.5 text-[8px] font-bold rounded", item.usePortion ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
                                                            >份</button>
                                                          </div>
                                                        )}
                                                        <input 
                                                          type="number" 
                                                          className="w-16 px-1.5 py-1 bg-muted rounded text-right font-mono font-bold text-xs outline-none"
                                                          value={item.usePortion ? item.portionQuantity : item.quantity}
                                                          onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setSteps(steps.map(s => {
                                                              if (s.id === step.id) {
                                                                return { ...s, items: s.items.map((it: any) => it.id === item.id ? (item.usePortion ? { ...it, portionQuantity: val } : { ...it, quantity: val }) : it) };
                                                              }
                                                              return s;
                                                            }));
                                                          }}
                                                        />
                                                        {item.usePortion ? (
                                                          <span className="text-[10px] font-bold text-muted-foreground w-6">份</span>
                                                        ) : (
                                                          <UnitSelector
                                                            value={item.unit || 'g'}
                                                            onChange={(val) => {
                                                              setSteps(steps.map(s => {
                                                                if (s.id === step.id) {
                                                                  return { ...s, items: s.items.map((it: any) => it.id === item.id ? { ...it, unit: val } : it) };
                                                                }
                                                                return s;
                                                              }));
                                                            }}
                                                            availableGroups={unitGroups.filter((g: any) => ['重量', '數量', '容積'].includes(g.name))}
                                                          />
                                                        )}
                                                      </div>
                                                    )}
                                                    <button type="button" onClick={() => removeItemFromStep(step.id, item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                                                  </div>
                                                </div>

                                                {/* Second Row: Conversion Helper & Warnings & Step Output Details */}
                                                {item.type === 'step_output' && (() => {
                                                  const sourceOut = calculateStepOutput(item.sourceStepId, steps);
                                                  const ratio = (Number(item.quantity) || 0) / 100;
                                                  const usedWeight = sourceOut.totalWeight * ratio;
                                                  
                                                  const ingList = Object.entries(sourceOut.ingredients)
                                                    .map(([name, qty]) => `${name} ${(qty * ratio).toFixed(1)}g`)
                                                    .join(', ');

                                                  return (
                                                    <div className="mt-1.5 pl-6 flex flex-col gap-1 text-[10px] text-gray-500 font-bold self-start animate-in slide-in-from-top-1 duration-100">
                                                      <span>等同約 {usedWeight.toFixed(1)}g 產出量</span>
                                                      {ingList && <span className="text-gray-400">包含: {ingList}</span>}
                                                    </div>
                                                  );
                                                })()}
                                                {item.type === 'ingredient' && item.data && item.unit !== item.data.unit && (() => {
                                                  const ingredient = item.data;
                                                  const itemUnit = item.unit;
                                                  const baseUnit = ingredient.unit;
                                                  
                                                  const conv = (ingredient.unitConversions || []).find(
                                                    (c: any) => c.fromUnit === itemUnit && c.toUnit === baseUnit
                                                  );
                                                  const revConv = (ingredient.unitConversions || []).find(
                                                    (c: any) => c.fromUnit === baseUnit && c.toUnit === itemUnit
                                                  );

                                                  if (conv) {
                                                    const convertedQty = (item.quantity * conv.multiplier).toFixed(1);
                                                    return (
                                                      <div className="mt-1.5 pl-6 flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50/50 py-0.5 px-2 rounded-md border border-emerald-100/50 w-fit self-start animate-in slide-in-from-top-1 duration-100">
                                                        <span>✓ {item.quantity} {itemUnit} ≈ {convertedQty} {baseUnit} (已換算)</span>
                                                      </div>
                                                    );
                                                  } else if (revConv) {
                                                    const convertedQty = (item.quantity / revConv.multiplier).toFixed(1);
                                                    return (
                                                      <div className="mt-1.5 pl-6 flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50/50 py-0.5 px-2 rounded-md border border-emerald-100/50 w-fit self-start animate-in slide-in-from-top-1 duration-100">
                                                        <span>✓ {item.quantity} {itemUnit} ≈ {convertedQty} {baseUnit} (已換算)</span>
                                                      </div>
                                                    );
                                                  } else {
                                                    return (
                                                      <div className="mt-1.5 pl-6 flex items-center gap-1.5 text-[10px] text-amber-600 font-black bg-amber-50/80 py-1 px-2.5 rounded-md border border-amber-100 w-fit self-start animate-in slide-in-from-top-1 duration-100">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                        <span>您引用的食材數量是抽象單位，請到食材管理增加換算，否則不計入營養標示</span>
                                                      </div>
                                                    );
                                                  }
                                                })()}
                                              </div>
                                            )}
                                          </Draggable>
                                        ))
                                      )}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>

            {/* Right Panel: Modular Library */}
            <div className="flex-1 bg-white p-8 overflow-y-auto border-l border-border">
              <div className="space-y-10">
                {/* Grouped Actions - Accordion */}
                <section className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                    <LayoutList className="w-4 h-4" />
                    動作模組 (點擊加入步驟)
                  </label>
                  {actionGroups.map((group: any) => {
                    const isOpen = openGroups.includes(group.name);
                    return (
                      <div key={group.name} className="border border-border rounded-2xl overflow-hidden shadow-sm">
                        <button 
                          onClick={() => toggleGroup(group.name)}
                          className="w-full flex items-center justify-between p-4 bg-muted/10 hover:bg-muted/20 transition-all"
                        >
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <LayoutList className="w-4 h-4 text-primary" />
                            {group.name}
                          </div>
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {isOpen && (
                          <Droppable droppableId={`library-actions-${group.name}`} isDropDisabled={true} type="step">
                            {(provided) => (
                              <div 
                                {...provided.droppableProps} 
                                ref={provided.innerRef} 
                                className="p-3 grid grid-cols-2 gap-2 bg-white animate-in slide-in-from-top-2 duration-200"
                              >
                                {group.actions.map((actionObj: any, idx: number) => (
                                  <Draggable 
                                    key={actionObj.id} 
                                    draggableId={JSON.stringify({ isAction: true, action: actionObj.name })} 
                                    index={idx}
                                  >
                                    {(provided, snapshot) => (
                                      <>
                                          <div 
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={cn(
                                            "bg-muted/30 hover:bg-white rounded-xl border border-transparent hover:border-primary transition-all overflow-hidden",
                                            snapshot.isDragging && "opacity-50 ring-2 ring-primary"
                                          )}
                                        >
                                          <div className="flex items-center">
                                            <div {...provided.dragHandleProps} className="p-3 text-muted-foreground/30 hover:text-primary cursor-grab active:cursor-grabbing border-r border-border/50">
                                              <GripVertical className="w-3.5 h-3.5" />
                                            </div>
                                            <button 
                                              onClick={() => addStep(actionObj.name)}
                                              className="flex-1 py-3 px-3 text-left text-xs font-bold text-gray-700 hover:text-primary transition-all flex justify-between items-center group"
                                            >
                                              {actionObj.name}
                                              <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                            </button>
                                          </div>
                                        </div>
                                        {snapshot.isDragging && (
                                          <div className="py-3 px-3 bg-primary text-white rounded-xl text-xs font-bold flex justify-between items-center">
                                            {actionObj.name}
                                            <Plus className="w-3 h-3" />
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        )}
                      </div>
                    );
                  })}
                </section>

                {/* Ingredients Search */}
                <section className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    食材搜尋 (加入至最後步驟)
                  </label>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="搜尋食材或子食譜..." 
                        className="w-full pl-10 pr-4 py-3 bg-muted/40 border border-border rounded-xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <Droppable droppableId="library-ingredients" isDropDisabled={true} type="item">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {searchResults.map((item, idx) => (
                            <Draggable 
                              key={item.id} 
                              draggableId={JSON.stringify({ ...item, isAction: false })} 
                              index={idx}
                            >
                              {(provided, snapshot) => (
                                <>
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      "bg-white rounded-xl border border-border shadow-sm transition-all overflow-hidden",
                                      snapshot.isDragging && "opacity-50"
                                    )}
                                  >
                                    <div className="flex items-center">
                                      <div {...provided.dragHandleProps} className="p-3 text-muted-foreground/30 hover:text-primary cursor-grab active:cursor-grabbing border-r border-border/50">
                                        <GripVertical className="w-3.5 h-3.5" />
                                      </div>
                                      <button 
                                        onClick={() => activeStepId && addIngredientToStep(activeStepId, item)}
                                        className="flex-1 text-left p-3 hover:bg-orange-50 hover:text-primary rounded-r-xl transition-all group flex justify-between items-center"
                                        disabled={!activeStepId}
                                      >
                                        <div>
                                          <p className="font-bold text-xs">{item.name}</p>
                                          <p className="text-[10px] opacity-70 uppercase font-medium">{item.type === 'recipe' ? '食譜' : item.category}</p>
                                        </div>
                                        <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                      </button>
                                    </div>
                                  </div>
                                  {snapshot.isDragging && (
                                    <div className="p-3 bg-orange-500 text-white rounded-xl border border-orange-600 shadow-lg flex justify-between items-center">
                                      <p className="font-bold text-xs">{item.name}</p>
                                      <Plus className="w-3 h-3" />
                                    </div>
                                  )}
                                </>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </DragDropContext>

        <footer className="p-8 border-t border-border bg-muted/20 flex justify-between items-center">
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">預估總時間</p>
              <p className="text-2xl font-black text-primary">
                {steps.reduce((sum, s) => {
                  const mins = s.parameters
                    .filter((p: any) => p.unit === 'min')
                    .reduce((pSum: number, p: any) => pSum + p.value, 0);
                  const hrs = s.parameters
                    .filter((p: any) => p.unit === 'hr')
                    .reduce((pSum: number, p: any) => pSum + p.value, 0);
                  return sum + mins + (hrs * 60);
                }, 0)} min
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">配方項目</p>
              <p className="text-2xl font-black text-gray-700">
                {steps.reduce((sum, s) => sum + s.items.length, 0)} 個
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            {initialData?.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-6 py-4 border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white rounded-2xl font-bold transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                刪除食譜
              </button>
            )}
            <button onClick={onClose} className="px-8 py-4 border border-border rounded-2xl font-bold text-gray-600 hover:bg-white transition-all">取消</button>
            <button 
              onClick={handleSubmit}
              disabled={loading || !name}
              className="px-10 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? '儲存中...' : initialData ? '確認修改' : '儲存結構化食譜'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CreateRecipeModal;
