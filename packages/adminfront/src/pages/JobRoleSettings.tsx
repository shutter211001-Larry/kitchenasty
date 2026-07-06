import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface User {
  id: string;
  name: string;
  email: string;
}

interface JobRole {
  id: string;
  name: string;
  users: User[];
}

export default function JobRoleSettings() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<JobRole | null>(null);
  const [allStaff, setAllStaff] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);

  const fetchRoles = async () => {
    try {
      const res = await api.get<{ data: JobRole[] }>('/job-roles');
      setRoles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      await api.post('/job-roles', { name: newRoleName });
      setNewRoleName('');
      fetchRoles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!window.confirm('確定要刪除此職位嗎？')) return;
    try {
      await api.delete(`/job-roles/${id}`);
      fetchRoles();
    } catch (err) {
      console.error(err);
    }
  };

  const openAssignModal = async (role: JobRole) => {
    setCurrentRole(role);
    setSelectedUserIds(new Set(role.users.map(u => u.id)));
    setIsModalOpen(true);
    setLoadingStaff(true);
    try {
      // 依據 Rule 7: AdminFront API Client Generics Requirement，提供明確的泛型參數
      const res = await api.get<{ data: User[] }>('/staff?limit=100');
      setAllStaff(res.data || []);
    } catch (err) {
      console.error('Failed to fetch staff', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const closeAssignModal = () => {
    setIsModalOpen(false);
    setCurrentRole(null);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleSaveAssignments = async () => {
    if (!currentRole) return;
    setSavingAssign(true);
    try {
      await api.post(`/job-roles/${currentRole.id}/assign`, {
        userIds: Array.from(selectedUserIds)
      });
      closeAssignModal();
      fetchRoles();
    } catch (err) {
      console.error('Failed to assign users', err);
      alert('指派失敗，請稍後再試');
    } finally {
      setSavingAssign(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-3xl">🧑‍🍳</span>
        職位與員工技能設定 (Job Roles)
      </h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium mb-4">新增職位</h2>
        <form onSubmit={handleCreateRole} className="flex gap-4">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="例如: 櫃檯、廚房、外送員..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            新增
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                職位名稱
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                具備此技能的員工數
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {role.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {role.users.length} 人
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openAssignModal(role)}
                    className="text-primary-600 hover:text-primary-900 mr-4 font-medium"
                  >
                    指派員工
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="text-red-600 hover:text-red-900 font-medium"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  尚無職位設定，請在上方新增
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && currentRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h3 className="text-lg font-medium text-gray-900">
                指派員工至「{currentRole.name}」
              </h3>
              <button 
                onClick={closeAssignModal} 
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none select-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                title="關閉"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-white">
              <p className="text-sm text-gray-500 mb-4">請勾選具備此技能/職位的員工，這將影響智能排班時的指派。</p>
              
              {loadingStaff ? (
                <div className="text-center py-8 text-gray-500">載入中...</div>
              ) : allStaff.length === 0 ? (
                <div className="text-center py-8 text-gray-500">尚無員工資料</div>
              ) : (
                <div className="space-y-2">
                  {allStaff.map(staff => (
                    <label key={staff.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors bg-white shadow-sm">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(staff.id)}
                        onChange={() => toggleUserSelection(staff.id)}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{staff.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{staff.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <button
                onClick={closeAssignModal}
                disabled={savingAssign}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveAssignments}
                disabled={savingAssign}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {savingAssign ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
