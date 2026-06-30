import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!tokenParam) {
      setError("無效的重置連結，請重新申請");
    }
  }, [tokenParam]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    
    if (password.length < 6) {
      setError("密碼長度至少需要 6 個字元");
      return;
    }

    setSubmitting(true);

    try {
      await axios.post("http://localhost:3000/api/auth/reset-password", {
        token: tokenParam,
        newPassword: password,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 font-sans relative overflow-hidden">
        <div className="w-full max-w-sm bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-center relative z-10 animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2.5xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">密碼重置成功</h2>
          <p className="text-sm font-bold text-slate-400">系統即將跳轉至登入頁面...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] p-8 md:p-10 shadow-2xl flex flex-col items-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-gradient-to-tr from-primary to-orange-500 rounded-2.5xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6">
          <Lock className="text-white w-8 h-8" />
        </div>

        <h2 className="text-3xl font-black text-white tracking-tight mb-2">
          設定新密碼
        </h2>
        <p className="text-xs text-slate-400 font-medium mb-8 text-center">
          請為您的帳號設定一組新的密碼
        </p>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 mb-6 animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs font-bold leading-normal">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div className="space-y-1.5 relative group">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 pl-1 group-focus-within:text-primary transition-colors">
              新密碼
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                placeholder="輸入新密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary/50 text-white rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold placeholder:text-slate-600 outline-none transition-all focus:ring-4 focus:ring-primary/10"
                required
                disabled={!tokenParam}
              />
            </div>
          </div>

          <div className="space-y-1.5 relative group">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 pl-1 group-focus-within:text-primary transition-colors">
              確認新密碼
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                placeholder="再次輸入新密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary/50 text-white rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold placeholder:text-slate-600 outline-none transition-all focus:ring-4 focus:ring-primary/10"
                required
                disabled={!tokenParam}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !tokenParam}
            className="w-full bg-gradient-to-r from-primary to-orange-500 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none mt-2 cursor-pointer"
          >
            {submitting ? <span>儲存中...</span> : <>
              <span>重置密碼</span>
              <ArrowRight className="w-4 h-4" />
            </>}
          </button>
          
          <button type="button" onClick={() => navigate("/")} className="w-full text-center text-xs font-bold text-slate-400 hover:text-white transition-colors mt-4 cursor-pointer">
            返回登入
          </button>
        </form>
      </div>
    </div>
  );
}
