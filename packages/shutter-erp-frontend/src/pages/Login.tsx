import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Utensils, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUsers, setHasUsers] = useState(true); // default true for security, check dynamically upon mount

  useEffect(() => {
    axios.get('http://localhost:3000/api/auth/setup-status')
      .then(res => {
        setHasUsers(res.data.hasUsers);
      })
      .catch(err => {
        console.error('Failed to fetch setup status', err);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('請填寫所有必要欄位');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      setError(err.message || '登入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('admin@shutter.com');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Premium background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />

      {/* Floating stars/grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] p-8 md:p-10 shadow-2xl flex flex-col items-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Brand Logo Header */}
        <div className="w-16 h-16 bg-gradient-to-tr from-primary to-orange-500 rounded-2.5xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6">
          <Utensils className="text-white w-8 h-8" />
        </div>
        
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">智慧餐飲研發 ERP</h2>
        <p className="text-xs text-slate-400 font-medium mb-8 text-center">
          智慧食譜、成本運算與食材庫存管理系統
        </p>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 mb-6 animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-normal">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {/* Email input field */}
          <div className="space-y-1.5 relative group">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 pl-1 group-focus-within:text-primary transition-colors">
              電子郵件 (Email)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                placeholder="請輸入註冊的 Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary/50 text-white rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold placeholder:text-slate-600 outline-none transition-all focus:ring-4 focus:ring-primary/10"
                required
              />
            </div>
          </div>

          {/* Password input field */}
          <div className="space-y-1.5 relative group">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 pl-1 group-focus-within:text-primary transition-colors">
              登入密碼 (Password)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary/50 text-white rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold placeholder:text-slate-600 outline-none transition-all focus:ring-4 focus:ring-primary/10"
                required
              />
            </div>
          </div>

          {/* Login submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-orange-500 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none mt-2 cursor-pointer"
          >
            {loading ? (
              <span>驗證登入中...</span>
            ) : (
              <>
                <span>登入管理系統</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {!hasSuperAdmin && (
          <>
            {/* Divider */}
            <div className="w-full flex items-center gap-3 my-6">
              <div className="flex-1 h-[1px] bg-white/[0.05]" />
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-600">測試帳號免密提示</span>
              <div className="flex-1 h-[1px] bg-white/[0.05]" />
            </div>

            {/* Quick autofill test container */}
            <button
              onClick={handleQuickFill}
              className="w-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] p-4 rounded-2xl flex items-center gap-3.5 group transition-all text-left outline-none cursor-pointer"
            >
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>一鍵帶入預設管理員</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase rounded">Auto</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  帳號: admin@shutter.com | 密碼: admin123
                </div>
              </div>
            </button>
          </>

      </div>
    </div>
  );
};

export default Login;
