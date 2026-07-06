import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface JobRole {
  id: string;
  name: string;
}

interface ShiftRequirement {
  id?: string;
  jobRoleId: string;
  startTime: string;
  endTime: string;
  count: number;
}

interface ShiftRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
}

export default function ShiftRequirementsModal({ isOpen, onClose, locationId }: ShiftRequirementsModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Defaults to today
  );
  const [requirements, setRequirements] = useState<ShiftRequirement[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && locationId) {
      fetchJobRoles();
    }
  }, [isOpen, locationId]);

  useEffect(() => {
    if (isOpen && locationId && selectedDate) {
      fetchRequirements();
    }
  }, [isOpen, locationId, selectedDate]);

  const fetchJobRoles = async () => {
    try {
      const res = await api.get<{ data: JobRole[] }>(`/job-roles?locationId=${locationId}`);
      setJobRoles(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      // API expects startDate and endDate. We can pass the same date for both.
      const res = await api.get<{ data: ShiftRequirement[] }>(
        `/roster/requirements?locationId=${locationId}&startDate=${selectedDate}&endDate=${selectedDate}`
      );
      // Map existing requirements, stripping the ID if we just want to replace them
      // Actually, since it's a bulk save, we don't necessarily need IDs on the frontend.
      const existing = res.data || [];
      setRequirements(existing.map(r => ({
        jobRoleId: r.jobRoleId,
        startTime: r.startTime,
        endTime: r.endTime,
        count: r.count
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequirement = () => {
    if (jobRoles.length === 0) {
      alert('請先在設定中新增職位');
      return;
    }
    setRequirements([...requirements, {
      jobRoleId: jobRoles[0].id,
      startTime: '10:00',
      endTime: '18:00',
      count: 1
    }]);
  };

  const handleUpdateRequirement = (index: number, field: keyof ShiftRequirement, value: any) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const handleRemoveRequirement = (index: number) => {
    const updated = requirements.filter((_, i) => i !== index);
    setRequirements(updated);
  };

  const handleSave = async () => {
    if (!locationId || !selectedDate) return;
    setSaving(true);
    try {
      await api.post('/roster/requirements', {
        locationId,
        date: selectedDate,
        requirements
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            門市人力需求設定 (Staffing Requirements)
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">
          <p className="text-sm text-gray-500">
            請選擇一個日期，並設定當天每個時段需要的人數。這將用於自動排班演算法的計算依據。
          </p>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">選擇日期</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 text-lg">{selectedDate} 的人力需求</h3>
              <button
                onClick={handleAddRequirement}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition-all"
              >
                + 新增需求時段
              </button>
            </div>

            {loading ? (
              <p className="text-gray-500 text-sm py-4">載入中...</p>
            ) : requirements.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl border-dashed">
                <p className="text-gray-500 text-sm">此日期尚未設定任何人力需求</p>
                <button
                  onClick={handleAddRequirement}
                  className="mt-4 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-medium transition-colors"
                >
                  立即新增
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {requirements.map((req, index) => (
                  <div key={index} className="flex flex-wrap md:flex-nowrap items-end gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50 shadow-sm relative group">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-medium text-gray-500 mb-1">職位 (Job Role)</label>
                      <select
                        value={req.jobRoleId}
                        onChange={(e) => handleUpdateRequirement(index, 'jobRoleId', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {jobRoles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">開始時間</label>
                      <input
                        type="time"
                        value={req.startTime}
                        onChange={(e) => handleUpdateRequirement(index, 'startTime', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">結束時間</label>
                      <input
                        type="time"
                        value={req.endTime}
                        onChange={(e) => handleUpdateRequirement(index, 'endTime', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div className="w-24">
                      <label className="block text-xs font-medium text-gray-500 mb-1">需求人數</label>
                      <input
                        type="number"
                        min="1"
                        value={req.count}
                        onChange={(e) => handleUpdateRequirement(index, 'count', parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <button
                      onClick={() => handleRemoveRequirement(index)}
                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 bg-white shadow-sm self-end"
                      title="移除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedDate}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                儲存中...
              </>
            ) : '儲存人力需求'}
          </button>
        </div>
      </div>
    </div>
  );
}
