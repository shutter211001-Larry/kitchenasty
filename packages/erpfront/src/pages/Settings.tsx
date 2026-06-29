import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n";
import { useAuth } from "../context/AuthContext";
const API = "http://localhost:3000/api/dictionaries";
export default function Settings() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"actions" | "units" | "global">(
    "actions",
  );
  const [actionGroups, setActionGroups] = useState<any[]>([]);
  const [unitGroups, setUnitGroups] = useState<any[]>([]);
  const [language, setLanguage] = useState(
    user?.preferredLanguage || i18n.language || "zh-TW",
  );
  const [globalSettings, setGlobalSettings] = useState({
    decimalPrecision: 1,
    autoUnitConversionThreshold: 1000,
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user?.preferredLanguage) {
      setLanguage(user.preferredLanguage);
    }
  }, [user?.preferredLanguage]);

  // Group CRUD state
  const [newGroupName, setNewGroupName] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Item CRUD state
  const [newItemName, setNewItemName] = useState("");

  // Expanded actions within a group
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [actRes, ugRes, settingsRes] = await Promise.all([
        axios.get(`${API}/actions`),
        axios.get(`${API}/units`),
        axios.get("http://localhost:3000/api/settings"),
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
  useEffect(() => {
    setActiveGroupId(null);
    setExpandedActionId(null);
    fetchAll();
  }, [activeTab]);

  // ── Group level default units (ActionGroup ↔ UnitGroup) ──
  const toggleGroupDefaultUnit = async (
    groupId: string,
    unitGroupId: string,
    currentIds: string[],
  ) => {
    const newIds = currentIds.includes(unitGroupId)
      ? currentIds.filter((id) => id !== unitGroupId)
      : [...currentIds, unitGroupId];
    await axios.put(`${API}/actions/groups/${groupId}/default-units`, {
      unitGroupIds: newIds,
    });
    fetchAll();
  };

  // ── Action level default units (Action ↔ UnitGroup) ──
  const toggleActionDefaultUnit = async (
    actionId: string,
    unitGroupId: string,
    currentIds: string[],
  ) => {
    const newIds = currentIds.includes(unitGroupId)
      ? currentIds.filter((id) => id !== unitGroupId)
      : [...currentIds, unitGroupId];
    await axios.put(`${API}/actions/${actionId}/default-units`, {
      unitGroupIds: newIds,
    });
    fetchAll();
  };
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    const endpoint =
      activeTab === "actions" ? `${API}/actions/groups` : `${API}/units/groups`;
    await axios.post(endpoint, {
      name: newGroupName,
      icon: activeTab === "actions" ? "LayoutList" : undefined,
    });
    setNewGroupName("");
    fetchAll();
  };
  const handleDeleteGroup = async (id: string) => {
    const { t } = useTranslation();
    if (!window.confirm(t("erp_784"))) return;
    const endpoint =
      activeTab === "actions"
        ? `${API}/actions/groups/${id}`
        : `${API}/units/groups/${id}`;
    await axios.delete(endpoint);
    fetchAll();
  };
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !activeGroupId) return;
    const endpoint =
      activeTab === "actions" ? `${API}/actions` : `${API}/units`;
    await axios.post(endpoint, {
      name: newItemName,
      groupId: activeGroupId,
    });
    setNewItemName("");
    fetchAll();
  };
  const handleDeleteItem = async (id: string) => {
    const endpoint =
      activeTab === "actions" ? `${API}/actions/${id}` : `${API}/units/${id}`;
    await axios.delete(endpoint);
    fetchAll();
  };
  const handleSaveGlobalSettings = async () => {
    const { t } = useTranslation();
    try {
      const p1 = axios.put(
        "http://localhost:3000/api/settings",
        globalSettings,
      );
      const p2 = axios.patch("http://localhost:3000/api/auth/me/language", {
        language,
      });
      await Promise.all([p1, p2]);
      i18n.changeLanguage(language);

      // Need to re-check auth to update context user if needed (although checkAuth isn't exported directly, we can just trigger a reload or rely on next refresh)
      alert(t("erp_785"));
    } catch (e) {
      console.error("Failed to save settings:", e);
      alert(t("erp_786"));
    }
  };
  const groups = activeTab === "actions" ? actionGroups : unitGroups;
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const items =
    activeTab === "actions"
      ? activeGroup?.actions || []
      : activeGroup?.units || [];
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-4xl font-black text-gray-800 tracking-tight mb-2">
          {t("erp_195")}
        </h2>
        <p className="text-muted-foreground font-medium">{t("erp_787")}</p>
      </header>

      <div className="bg-white rounded-[2rem] border border-border overflow-hidden shadow-sm flex flex-col min-h-[600px]">
        {/* Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap border-b border-border bg-muted/10 p-4 gap-2">
          <button
            onClick={() => setActiveTab("actions")}
            className={cn(
              "flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer text-center justify-center flex",
              activeTab === "actions"
                ? "bg-primary text-white shadow-md"
                : "text-muted-foreground hover:bg-white",
            )}
          >
            {t("erp_788")}
          </button>
          <button
            onClick={() => setActiveTab("units")}
            className={cn(
              "flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer text-center justify-center flex",
              activeTab === "units"
                ? "bg-primary text-white shadow-md"
                : "text-muted-foreground hover:bg-white",
            )}
          >
            {t("erp_789")}
          </button>
          <button
            onClick={() => setActiveTab("global")}
            className={cn(
              "flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer text-center justify-center flex",
              activeTab === "global"
                ? "bg-primary text-white shadow-md"
                : "text-muted-foreground hover:bg-white",
            )}
          >
            {t("erp_790")}
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {activeTab === "global" ? (
            <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-muted/5">
              <div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">
                  {t("erp_791")}
                </h3>
                <p className="text-sm text-muted-foreground">{t("erp_792")}</p>
              </div>

              <div className="max-w-2xl space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
                  {/* Decimal Precision */}
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-800">
                      {t("erp_793")}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t("erp_794")}
                    </p>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-gray-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      value={globalSettings.decimalPrecision}
                      onChange={(e) =>
                        setGlobalSettings({
                          ...globalSettings,
                          decimalPrecision: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <hr className="border-border" />

                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-800">
                      {t("erp_795")}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t("erp_796")}
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        className="flex-1 px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-gray-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        value={globalSettings.autoUnitConversionThreshold}
                        onChange={(e) =>
                          setGlobalSettings({
                            ...globalSettings,
                            autoUnitConversionThreshold:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                        {t("erp_797")}
                      </span>
                    </div>
                  </div>

                  <hr className="border-border" />

                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-800">
                      {t("erp_798")}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t("erp_799")}
                    </p>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-gray-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    >
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.flag} {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveGlobalSettings}
                    className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl shadow-sm transition-all"
                  >
                    {t("erp_800")}
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
                    <input
                      type="text"
                      placeholder={t("erp_801")}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-border rounded-lg outline-none focus:border-primary font-bold"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {loading ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">
                      {t("erp_10")}
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div
                        key={group.id}
                        onClick={() => setActiveGroupId(group.id)}
                        className={cn(
                          "group flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all border",
                          activeGroupId === group.id
                            ? "bg-white border-primary shadow-sm"
                            : "border-transparent hover:bg-white",
                        )}
                      >
                        <div>
                          <span className="font-bold text-sm">
                            {group.name}
                          </span>
                          {activeTab === "actions" &&
                            group.defaultUnitGroups?.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {group.defaultUnitGroups.map((ug: any) => (
                                  <span
                                    key={ug.id}
                                    className="text-[9px] bg-primary/10 text-primary px-1.5 rounded font-bold"
                                  >
                                    {ug.name}
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {activeGroup ? (
                  <>
                    {/* Group Header */}
                    <div className="p-4 sm:p-6 border-b border-border bg-muted/5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h3 className="text-xl font-black text-gray-800">
                          {activeGroup.name}
                        </h3>
                        <form
                          onSubmit={handleCreateItem}
                          className="flex gap-2 w-full sm:w-auto shrink-0"
                        >
                          <input
                            type="text"
                            placeholder={`新增${activeTab === "actions" ? t("erp_802") : t("erp_803")}...`}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-border rounded-xl outline-none focus:border-primary font-bold text-sm shadow-sm font-semibold"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="px-4 bg-primary text-white font-bold rounded-xl text-sm cursor-pointer shrink-0"
                          >
                            {t("erp_8")}
                          </button>
                        </form>
                      </div>

                      {/* ActionGroup: Default Unit Groups (Group level) */}
                      {activeTab === "actions" && (
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
                            {t("erp_804")}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {unitGroups.map((ug) => {
                              const isSelected =
                                activeGroup.defaultUnitGroups?.some(
                                  (d: any) => d.id === ug.id,
                                );
                              const currentIds =
                                activeGroup.defaultUnitGroups?.map(
                                  (d: any) => d.id,
                                ) || [];
                              return (
                                <button
                                  key={ug.id}
                                  onClick={() =>
                                    toggleGroupDefaultUnit(
                                      activeGroup.id,
                                      ug.id,
                                      currentIds,
                                    )
                                  }
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all",
                                    isSelected
                                      ? "bg-primary text-white border-primary"
                                      : "bg-white text-muted-foreground border-border hover:border-primary/50",
                                  )}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                  {ug.name}
                                </button>
                              );
                            })}
                            {unitGroups.length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                {t("erp_805")}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {items.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-3xl">
                          <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          {t("erp_806")}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {items.map((item: any) => (
                            <div
                              key={item.id}
                              className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm"
                            >
                              {/* Item header row */}
                              <div className="flex items-center justify-between p-4 group">
                                <div className="flex items-center gap-3 flex-1">
                                  {activeTab === "actions" && (
                                    <button
                                      onClick={() =>
                                        setExpandedActionId(
                                          expandedActionId === item.id
                                            ? null
                                            : item.id,
                                        )
                                      }
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                    >
                                      {expandedActionId === item.id ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                  <span className="font-bold">{item.name}</span>
                                  {/* Inherited unit tags */}
                                  {activeTab === "actions" &&
                                    activeGroup.defaultUnitGroups?.map(
                                      (ug: any) => (
                                        <span
                                          key={ug.id}
                                          className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold"
                                        >
                                          ↑ {ug.name}
                                        </span>
                                      ),
                                    )}
                                  {/* Action-own unit tags */}
                                  {activeTab === "actions" &&
                                    item.defaultUnitGroups?.map((ug: any) => (
                                      <span
                                        key={ug.id}
                                        className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold"
                                      >
                                        {ug.name}
                                      </span>
                                    ))}
                                </div>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-1.5 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Expanded action: own default units */}
                              {activeTab === "actions" &&
                                expandedActionId === item.id && (
                                  <div className="border-t border-border bg-muted/5 p-4">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
                                      {t("erp_807")}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {unitGroups.map((ug) => {
                                        const isInherited =
                                          activeGroup.defaultUnitGroups?.some(
                                            (d: any) => d.id === ug.id,
                                          );
                                        const isOwn =
                                          item.defaultUnitGroups?.some(
                                            (d: any) => d.id === ug.id,
                                          );
                                        const currentOwnIds =
                                          item.defaultUnitGroups?.map(
                                            (d: any) => d.id,
                                          ) || [];
                                        return (
                                          <button
                                            key={ug.id}
                                            disabled={isInherited}
                                            onClick={() =>
                                              toggleActionDefaultUnit(
                                                item.id,
                                                ug.id,
                                                currentOwnIds,
                                              )
                                            }
                                            className={cn(
                                              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all",
                                              isInherited
                                                ? "bg-muted border-muted text-muted-foreground cursor-not-allowed opacity-60"
                                                : isOwn
                                                  ? "bg-primary text-white border-primary"
                                                  : "bg-white text-muted-foreground border-border hover:border-primary/50",
                                            )}
                                          >
                                            {isInherited && "↑ "}
                                            {isOwn && !isInherited && (
                                              <Check className="w-3 h-3" />
                                            )}
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
                    <p className="font-bold">{t("erp_808")}</p>
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
