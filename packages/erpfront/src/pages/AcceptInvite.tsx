import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import axios from "axios";

export default function AcceptInvite() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const tokenParam = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tokenError, setTokenError] = useState("");

  useEffect(() => {
    if (!tokenParam) {
      setTokenError(t("erp_invite_no_token", "未提供邀請令牌"));
      setValidating(false);
      return;
    }

    axios
      .get(`http://localhost:3000/api/auth/invite/${tokenParam}`)
      .then((res) => {
        if (!res.data.success) throw new Error("Invalid invite");
        setEmail(res.data.data.email);
        setRole(res.data.data.role);
      })
      .catch((err) => {
        setTokenError(err.response?.data?.error || err.message);
      })
      .finally(() => setValidating(false));
  }, [tokenParam, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("erp_passwords_mismatch", "兩次輸入的密碼不一致"));
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post("http://localhost:3000/api/auth/accept-invite", {
        token: tokenParam,
        name,
        password,
      });

      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black tracking-widest text-slate-400">
          {t("erp_1", "Loading...")}
        </p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-black text-white mb-8">
            {t("erp_login_title", "Shutter ERP")}
          </h1>
          <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-border">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-black text-red-600">!</span>
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-2">
              {t("erp_invalid_invite", "無效的邀請")}
            </h2>
            <p className="text-sm font-bold text-gray-500">{tokenError}</p>
          </div>
        </div>
      </div>
    );
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: t("erp_831", "管理員 (Admin)"),
    STAFF: t("erp_186", "員工 (Staff)"),
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            {t("erp_login_title", "Shutter ERP")}
          </h1>
          <p className="text-sm font-bold tracking-widest text-primary uppercase">
            {t("erp_accept_invite", "接受加入邀請")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-border space-y-6"
        >
          <div className="text-center mb-6">
            <p className="text-sm font-bold text-gray-600">
              {t("erp_invited_as", "您被邀請擔任")} <strong>{ROLE_LABELS[role] || role}</strong>
            </p>
            <p className="text-xs font-bold text-gray-400 mt-1">{email}</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-xs font-bold p-4 rounded-2xl flex items-center gap-2 border border-red-100">
              <span className="shrink-0 w-4 h-4 rounded-full bg-red-200 text-red-700 flex items-center justify-center text-[10px]">!</span>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
              {t("erp_836", "姓名")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-muted/20 border border-border focus:border-primary/50 text-gray-800 rounded-2xl py-3.5 px-5 text-sm font-bold placeholder:text-muted-foreground/60 outline-none transition-all focus:ring-4 focus:ring-primary/5 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
              {t("erp_850", "密碼")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-muted/20 border border-border focus:border-primary/50 text-gray-800 rounded-2xl py-3.5 px-5 text-sm font-bold placeholder:text-muted-foreground/60 outline-none transition-all focus:ring-4 focus:ring-primary/5 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-1">
              {t("erp_confirm_password", "確認密碼")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-muted/20 border border-border focus:border-primary/50 text-gray-800 rounded-2xl py-3.5 px-5 text-sm font-bold placeholder:text-muted-foreground/60 outline-none transition-all focus:ring-4 focus:ring-primary/5 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-orange-500 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed mt-4"
          >
            {submitting ? t("erp_252", "處理中...") : t("erp_complete_registration", "完成註冊並登入")}
          </button>
        </form>
      </div>
    </div>
  );
}
