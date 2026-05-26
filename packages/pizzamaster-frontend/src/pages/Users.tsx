import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users as UsersIcon, Shield, UserCheck, Trash2, Edit, Plus, 
  X, AlertCircle, Key, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('http://localhost:3000/api/users');
      setUsers(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || '載入使用者帳號失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('STAFF');
    setSubmitError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: any) => {
    setModalMode('edit');
    setSelectedUser(user);
    setName(user.name || '');
    setEmail(user.email || '');
    setPassword(''); // leave blank if unchanged
    setRole(user.role || 'STAFF');
    setSubmitError(null);
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert('安全保護：您不能刪除您目前登入的帳號！');
      return;
    }

    if (!window.confirm('確定要永久刪除此使用者帳號嗎？刪除後該人員將無法登入系統。')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/users/${userId}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || '刪除帳號失敗');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) {
      setSubmitError('請填寫所有必要欄位');
      return;
    }

    if (modalMode === 'create' && (!email || !password)) {
      setSubmitError('請填寫帳號與密碼');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      if (modalMode === 'create') {
        await axios.post('http://localhost:3000/api/users', {
          name,
          email,
          password,
          role
        });
      } else {
        await axios.put(`http://localhost:3000/api/users/${selectedUser.id}`, {
          name,
          role,
          password: password.trim() !== '' ? password : undefined
        });
      }

      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.response?.data?.error || '提交失敗，請重試');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const staffCount = users.filter(u => u.role === 'STAFF').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">系統帳號管理</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">管理店內廚房人員的登入帳號、權限角色及密碼變更</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary to-orange-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>新增系統帳號</span>
        </button>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1 */}
        <div className="bg-white border border-border p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">系統總註冊帳號</span>
            <div className="text-3xl font-black text-gray-800">{totalCount} <span className="text-xs text-muted-foreground font-bold">人</span></div>
          </div>
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
            <UsersIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-border p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">系統管理員</span>
            <div className="text-3xl font-black text-orange-600">{adminCount} <span className="text-xs text-muted-foreground font-bold">人</span></div>
          </div>
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-border p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">一般廚房員工</span>
            <div className="text-3xl font-black text-blue-600">{staffCount} <span className="text-xs text-muted-foreground font-bold">人</span></div>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-border/60">
          <h3 className="text-lg font-black text-gray-800">人員名冊與權限</h3>
          <button 
            onClick={fetchUsers}
            className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-xs font-bold leading-normal">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-primary" />
            <span className="text-xs font-bold">讀取使用者名冊中...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-center">
            <UsersIcon className="w-12 h-12 mb-3 text-gray-300" />
            <span className="text-sm font-black">目前系統內無任何使用者帳號</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  <th className="py-4 px-4">人員姓名</th>
                  <th className="py-4 px-4">電子郵件 (帳號)</th>
                  <th className="py-4 px-4">系統角色權限</th>
                  <th className="py-4 px-4">建立時間</th>
                  <th className="py-4 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-bold text-gray-700">
                {users.map(u => {
                  const isSelf = u.id === currentUser?.id;
                  
                  return (
                    <tr key={u.id} className="hover:bg-muted/10 transition-all rounded-xl">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center font-black text-gray-600 text-xs shadow-sm">
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-black text-gray-800 block">{u.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded uppercase">
                                您自己
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-gray-600">{u.email}</td>
                      <td className="py-4 px-4">
                        {u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl font-black text-[10px] shadow-sm">
                            <Shield className="w-3 h-3" />
                            系統管理員
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-black text-[10px] shadow-sm">
                            <UserCheck className="w-3 h-3" />
                            一般員工
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 hover:bg-muted text-primary rounded-xl transition-all border border-border shadow-sm cursor-pointer"
                            title="編輯帳號"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={isSelf}
                            className={`p-2 rounded-xl transition-all border shadow-sm cursor-pointer ${
                              isSelf 
                                ? 'opacity-40 bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                                : 'hover:bg-red-50 text-red-600 border-red-100'
                            }`}
                            title={isSelf ? '不能刪除自己' : '刪除帳號'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create or Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <header className="p-8 pb-6 border-b border-border bg-muted/20 relative">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border bg-primary/10 border-primary/20 text-primary`}>
                    <UsersIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800">
                      {modalMode === 'create' ? '新增系統帳號' : '編輯帳號資料'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {modalMode === 'create' ? '為店內新增一個廚房同仁的登入帳號' : '修改現有同仁的資訊或更換登入密碼'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full shadow-sm transition-all border border-transparent hover:border-border/50">
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>
            </header>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-5">
                
                {submitError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span className="text-xs font-bold leading-normal">{submitError}</span>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
                    人員姓名
                  </label>
                  <input
                    type="text"
                    placeholder="請輸入姓名 (例如: 小王)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-muted/20 border border-border focus:border-primary/50 text-gray-800 rounded-2xl py-3.5 px-5 text-sm font-bold placeholder:text-muted-foreground/60 outline-none transition-all focus:ring-4 focus:ring-primary/5 focus:bg-white"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
                    電子郵件 (作為登入帳號)
                  </label>
                  <input
                    type="email"
                    placeholder="例如: example@pizzamaster.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={modalMode === 'edit'}
                    className={`w-full border text-sm font-bold rounded-2xl py-3.5 px-5 outline-none transition-all focus:ring-4 focus:ring-primary/5 ${
                      modalMode === 'edit'
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-muted/20 border-border focus:border-primary/50 text-gray-800 focus:bg-white'
                    }`}
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1 flex items-center justify-between">
                    <span>登入密碼</span>
                    {modalMode === 'edit' && (
                      <span className="text-[9px] text-primary lowercase font-black">
                        *若不變更密碼請留空
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder={modalMode === 'edit' ? "若需重設密碼請在此輸入新密碼" : "請輸入 6 位數以上登入密碼"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-muted/20 border border-border focus:border-primary/50 text-gray-800 rounded-2xl py-3.5 pl-11 pr-5 text-sm font-bold placeholder:text-muted-foreground/60 outline-none transition-all focus:ring-4 focus:ring-primary/5 focus:bg-white"
                      required={modalMode === 'create'}
                    />
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                </div>

                {/* Role selection */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
                    系統角色權限分配
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('STAFF')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        role === 'STAFF'
                          ? 'border-blue-500 bg-blue-500/5 text-blue-700 shadow-sm'
                          : 'border-border bg-white text-gray-500 hover:bg-muted/40'
                      }`}
                    >
                      <UserCheck className="w-6 h-6" />
                      <div className="text-xs font-black">一般員工</div>
                      <p className="text-[9px] text-muted-foreground text-center font-bold">
                        可查詢、進出庫與印標籤，限制核心修改
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('ADMIN')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        role === 'ADMIN'
                          ? 'border-orange-500 bg-orange-500/5 text-orange-700 shadow-sm'
                          : 'border-border bg-white text-gray-500 hover:bg-muted/40'
                      }`}
                    >
                      <Shield className="w-6 h-6" />
                      <div className="text-xs font-black">系統管理員</div>
                      <p className="text-[9px] text-muted-foreground text-center font-bold">
                        擁有一切最高權限，可進行資料庫結構修改
                      </p>
                    </button>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <footer className="p-8 border-t border-border bg-muted/20 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3.5 bg-white border border-border hover:bg-muted/30 text-gray-700 rounded-2xl font-black text-sm transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3.5 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none cursor-pointer"
                >
                  {submitting ? '送出中...' : '確認保存'}
                </button>
              </footer>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Users;
