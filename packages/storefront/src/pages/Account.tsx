import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext.js';
import { API_BASE } from '../lib/api.js';

export default function Account() {
  const { t } = useTranslation();
  const { user, token, isLoading, logout, updateUser } = useAuth();
  const { settings } = useTheme();
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);

  // Change Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Merge State
  const [showMergePrompt, setShowMergePrompt] = useState<{ provider: 'google' | 'line', id: string } | null>(null);
  const [mergePassword, setMergePassword] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [isSocialVerified, setIsSocialVerified] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    phone: '',
    address: '',
    emailNotificationsEnabled: true,
    lineNotificationsEnabled: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({ 
        name: user.name || '', 
        phone: user.phone || '',
        address: (user as any).address || '',
        emailNotificationsEnabled: (user as any).emailNotificationsEnabled !== false,
        lineNotificationsEnabled: (user as any).lineNotificationsEnabled !== false
      });
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const provider = params.get('provider') as 'google' | 'line';
    const socialId = params.get('socialId');
    const verified = params.get('verified');

    if (error === 'conflict' && provider) {
      setShowMergePrompt({ provider, id: socialId || '' });
      if (verified === 'true') {
        setIsSocialVerified(true);
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleUpdateProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        updateUser(data.data);
        setIsEditing(false);
      } else {
        alert(data.error || t('autoGen.store.key17'));
      }
    } catch (err) {
      alert(t('autoGen.store.key18'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      alert(t('auth.passwordTooShort') || t('autoGen.store.key19'));
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/auth/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: (user as any).hasPassword ? oldPassword : undefined,
          password: newPassword
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(t('common.success') || t('autoGen.store.key20'));
        setShowPasswordModal(false);
        setNewPassword('');
        setOldPassword('');
        // Refresh user data to update hasPassword state
        const meRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const meData = await meRes.json();
        if (meData.success) updateUser(meData.data.customer);
      } else {
        alert(data.error || t('autoGen.store.key21'));
      }
    } catch (err) {
      alert(t('autoGen.store.key22'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/loyalty/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLoyaltyPoints(data.data.points);
      })
      .catch(() => { });
  }, [token, user]);

  const handleUnbind = async () => {
    try {
      const res = await fetch(`${API_BASE}/line/unbind`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(t('autoGen.store.key23'));
    }
  };

  const handleLineAuth = async () => {
    try {
      const liff = (window as any).liff;
      if (!liff) {
        alert(t('autoGen.store.key24'));
        return;
      }
      await liff.init({ liffId: settings.lineSettings!.liffId });
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      const profile = await liff.getProfile();
      // If we got the profile, it means we've successfully re-authenticated.
      setIsSocialVerified(true);

      const res = await fetch(`${API_BASE}/line/bind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ lineUserId: profile.userId, lineDisplayName: profile.displayName }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(t('autoGen.store.key25'));
        window.location.reload();
      } else {
        const errorMsg = data.error || '';
        if (errorMsg.includes(t('autoGen.store.key26')) || errorMsg.includes(t('autoGen.store.key27'))) {
          console.log('Conflict detected, opening merge prompt for:', profile.userId);
          setIsSocialVerified(true);
          setShowMergePrompt({ provider: 'line', id: profile.userId });
        } else {
          alert(errorMsg || t('autoGen.store.key28'));
        }
      }
    } catch (err) {
      alert(t('autoGen.store.key29'));
    }
  };

  const handleSetPasswordAndUnbind = async () => {
    if (newPassword.length < 6) {
      alert(t('autoGen.store.key30'));
      return;
    }
    setIsSettingPassword(true);
    try {
      // 1. Set password
      const pRes = await fetch(`${API_BASE}/auth/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const pData = await pRes.json();
      if (!pData.success) {
        alert(pData.error || t('autoGen.store.key31'));
        setIsSettingPassword(false);
        return;
      }
      // 2. Then unbind
      await handleUnbind();
    } catch (err) {
      alert(t('autoGen.store.key32'));
      setIsSettingPassword(false);
    }
  };

  const handleMergeSocial = async () => {
    if (!showMergePrompt || (!mergePassword && !isSocialVerified)) return;
    setIsMerging(true);
    try {
      const res = await fetch(`${API_BASE}/auth/social/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: showMergePrompt.provider,
          socialId: showMergePrompt.id,
          password: mergePassword
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || t('autoGen.store.key33'));
        window.location.reload();
      } else {
        alert(data.error || t('autoGen.store.key34'));
      }
    } catch (err) {
      alert(t('autoGen.store.key35'));
    } finally {
      setIsMerging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-main mb-8">{t('account.title')}</h1>

      {/* Account Merge Modal (Multi-path Security Check) */}
      {showMergePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface border-input rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-6 shadow-inner">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-main mb-3">{t('account.conflictTitle')}</h2>
              <p className="text-sub leading-relaxed mb-8">
                {t('account.conflictDesc', { provider: showMergePrompt.provider === 'google' ? 'Google' : 'LINE' })}
              </p>

              <div className="space-y-6">
                {/* Option 1: Password (if they have one) */}
                {(user as any).hasPassword ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-hint">{t('account.mergeOption1')}</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={mergePassword}
                        onChange={(e) => setMergePassword(e.target.value)}
                        placeholder={t('auth.password')}
                        className="flex-1 px-4 py-3 bg-surface-soft border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-main transition-all"
                      />
                      <button
                        disabled={isMerging || !mergePassword}
                        onClick={handleMergeSocial}
                        className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-primary-500/20"
                      >
                        {t('common.submit')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-surface-soft rounded-xl border border-dashed border-input">
                    <p className="text-sm text-sub">{t('autoGen.store.key36')}</p>
                    <button
                      onClick={() => { setShowMergePrompt(null); setShowPasswordModal(true); }}
                      className="text-sm font-bold text-primary-600 mt-2 hover:text-primary-700 transition-colors"
                    >
                      {t('account.setNewPassword')} →
                    </button>
                  </div>
                )}

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-input"></div></div>
                  <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold"><span className="bg-surface px-4 text-hint">OR</span></div>
                </div>

                {/* Option 2: Re-verify Social */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-hint">{t('account.mergeOption2')}</label>
                  {isSocialVerified ? (
                    <div className="space-y-3">
                      <div className="w-full py-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl flex items-center justify-center gap-2 text-green-700 dark:text-green-400 font-bold shadow-sm">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        {showMergePrompt.provider === 'google' ? 'Google' : 'LINE'} {t('common.success')}
                      </div>
                      <button
                        onClick={handleMergeSocial}
                        disabled={isMerging}
                        className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-xl shadow-primary-500/30 transition-all active:scale-95"
                      >
                        {isMerging ? t('common.loading') : t('account.mergeSocial')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (showMergePrompt.provider === 'google') {
                          window.location.href = `${API_BASE}/auth/google?prompt=select_account&state=${encodeURIComponent('link=true')}&redirectUri=${encodeURIComponent(window.location.origin + '/account')}`;
                        } else {
                          handleLineAuth();
                        }
                      }}
                      className="w-full py-3.5 border-2 border-input text-main text-sm font-bold rounded-xl hover:bg-surface-soft hover:border-primary-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {t('auth.orContinue')} {showMergePrompt.provider === 'google' ? 'Google' : 'LINE'}
                    </button>
                  )}
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/50">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed flex gap-2">
                    <span className="shrink-0">⚠️</span>
                    <span>{t('account.conflictWarning')}</span>
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => {
                    setShowMergePrompt(null);
                    setMergePassword('');
                  }}
                  className="w-full py-2 text-sm font-medium text-hint hover:text-main transition-colors"
                >
                  {t('account.mergeCancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface border-input rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-main mb-6">
                {(user as any).hasPassword ? t('account.changePassword') : t('account.setNewPassword')}
              </h2>
              <div className="space-y-4">
                {(user as any).hasPassword && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-hint mb-1">{t('account.oldPassword')}</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-soft border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-main"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-hint mb-1">{t('account.newPassword')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-soft border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-main"
                  />
                </div>
                <div className="pt-4 flex flex-col gap-2">
                  <button
                    disabled={isChangingPassword}
                    onClick={handleChangePassword}
                    className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
                  >
                    {isChangingPassword ? t('common.loading') : t('common.save')}
                  </button>
                  <button
                    onClick={() => { setShowPasswordModal(false); setNewPassword(''); setOldPassword(''); }}
                    className="w-full py-3 text-sm font-bold text-hint hover:text-main"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="surface-card rounded-2xl shadow-xl shadow-black/5 border-input overflow-hidden transition-all">
        {/* Profile */}
        <div className="p-8 border-b border-input">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-main flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
              {t('account.personalInfo')}
            </h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all flex items-center gap-2 border border-transparent hover:border-primary-200 dark:hover:border-primary-800"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {t('common.edit')}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  disabled={isSaving}
                  onClick={handleUpdateProfile}
                  className="px-4 py-2 text-sm font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg border border-transparent hover:border-green-200 dark:hover:border-green-800 transition-all disabled:opacity-50"
                >
                  {isSaving ? t('common.loading') : t('common.save')}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({ 
                      name: user.name || '', 
                      phone: user.phone || '',
                      address: (user as any).address || '',
                      emailNotificationsEnabled: (user as any).emailNotificationsEnabled !== false,
                      lineNotificationsEnabled: (user as any).lineNotificationsEnabled !== false
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-hint hover:text-main rounded-lg transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-hint">{t('auth.name')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 text-main bg-surface-soft border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              ) : (
                <p className="text-lg font-semibold text-main px-1">{user.name}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-hint">{t('account.phoneLabel')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-3 text-main bg-surface-soft border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              ) : (
                <p className="text-lg font-semibold text-main px-1">{user.phone || t('account.notProvided')}</p>
              )}
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-hint">{t('account.emailLabel')}</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-surface-soft rounded-xl border border-input/50">
                <p className="text-main font-medium">{user.email}</p>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-hint/20 text-hint rounded-md uppercase tracking-tighter italic">Read Only</span>
              </div>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-hint">{t('account.addressLabel')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-3 text-main bg-surface-soft border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              ) : (
                <p className="text-lg font-semibold text-main px-1">{(user as any).address || t('account.notProvided')}</p>
              )}
            </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="p-8 border-b border-input">
        <h2 className="text-lg font-bold text-main mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-hint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {t('autoGen.store.key37')}
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-soft/30 border border-input rounded-2xl">
            <div>
              <h3 className="font-bold text-main">{t('autoGen.store.key38')}</h3>
              <p className="text-xs text-sub mt-1">{t('autoGen.store.key39')}</p>
            </div>
            <button
              onClick={async () => {
                const newValue = !editForm.emailNotificationsEnabled;
                setEditForm(prev => ({ ...prev, emailNotificationsEnabled: newValue }));
                // Auto-save for these toggles
                try {
                  await fetch(`${API_BASE}/auth/me`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ emailNotificationsEnabled: newValue }),
                  });
                } catch (e) {}
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${editForm.emailNotificationsEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.emailNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-soft/30 border border-input rounded-2xl">
            <div>
              <h3 className="font-bold text-main">{t('autoGen.store.key40')}</h3>
              <p className="text-xs text-sub mt-1">{t('autoGen.store.key41')}</p>
              {!user.lineUserId && <p className="text-[10px] text-amber-600 mt-1">{t('autoGen.store.key42')}</p>}
            </div>
            <button
              disabled={!user.lineUserId}
              onClick={async () => {
                if (!user.lineUserId) return;
                const newValue = !editForm.lineNotificationsEnabled;
                setEditForm(prev => ({ ...prev, lineNotificationsEnabled: newValue }));
                try {
                  await fetch(`${API_BASE}/auth/me`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ lineNotificationsEnabled: newValue }),
                  });
                } catch (e) {}
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${!user.lineUserId ? 'opacity-50 cursor-not-allowed' : ''} ${editForm.lineNotificationsEnabled && user.lineUserId ? 'bg-[#06C755]' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.lineNotificationsEnabled && user.lineUserId ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

        {/* Loyalty Points */}
        {settings.loyaltyProgramEnabled && loyaltyPoints !== null && (
          <div className="p-8 border-b border-input bg-gradient-to-br from-primary-50/50 to-transparent dark:from-primary-900/10">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <h2 className="text-lg font-bold text-main">{t('account.loyaltyPoints')}</h2>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black text-primary-600 tracking-tight">{loyaltyPoints}</span>
              <div className="pb-1">
                <span className="block text-sm font-bold text-main">Points</span>
                <span className="block text-xs text-sub">{t('account.pointsValue', { value: (loyaltyPoints / 100).toFixed(2) })}</span>
              </div>
            </div>
            <p className="text-xs text-sub mt-4 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('account.loyaltyDesc')}
            </p>
          </div>
        )}

        {/* Security / Password */}
        <div className="p-8 border-b border-input">
          <h2 className="text-lg font-bold text-main mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-hint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            {t('account.securityTitle')}
          </h2>
          <div className="flex items-center justify-between p-5 bg-surface-soft/30 border border-input rounded-2xl">
            <div>
              <h3 className="font-bold text-main">{t('auth.password')}</h3>
              <p className="text-xs text-sub mt-1">
                {(user as any).hasPassword ? '••••••••' : t('autoGen.store.key43')}
              </p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 text-sm font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800 transition-all"
            >
              {(user as any).hasPassword ? t('account.changePassword') : t('account.setNewPassword')}
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="p-8 border-b border-input">
          <h2 className="text-lg font-bold text-main mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-hint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            {t('footer.quickLinks')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/account/orders" className="group p-5 bg-surface border-2 border-input hover:border-primary-500/50 rounded-2xl transition-all shadow-sm hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-main group-hover:text-primary-600 transition-colors">{t('account.orderHistory')}</h3>
                  <p className="text-sm text-sub mt-1 leading-relaxed">{t('account.orderHistoryDesc')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center text-hint group-hover:text-primary-500 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </Link>
            {settings.navShowReservations && settings.reservationSettings?.enabled && (
              <Link to="/reservations" className="group p-5 bg-surface border-2 border-input hover:border-primary-500/50 rounded-2xl transition-all shadow-sm hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-main group-hover:text-primary-600 transition-colors">{t('nav.reservations')}</h3>
                    <p className="text-sm text-sub mt-1 leading-relaxed">{t('reservations.myReservations')}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-surface-soft flex items-center justify-center text-hint group-hover:text-primary-500 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Third-party Accounts */}
        <div className="p-8 border-b border-input">
          <h2 className="text-lg font-bold text-main mb-8 flex items-center gap-2">
            <svg className="w-5 h-5 text-hint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {t('account.socialLinking')}
          </h2>

          <div className="space-y-6">
            {/* Password Setup UI (Elegant Transition) */}
            {showPasswordSetup && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="p-6 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-200 dark:border-primary-800 mb-6 relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-base font-black text-primary-900 dark:text-primary-100 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {t('account.passwordSetupTitle')}
                    </h3>
                    <p className="text-sm text-primary-700 dark:text-primary-300 leading-relaxed mb-6">
                      {t('account.passwordSetupDesc', { email: user.email })}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="password"
                        placeholder={t('account.newPasswordPlaceholder')}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="flex-1 px-5 py-3 text-main bg-white dark:bg-black/20 border border-primary-300 dark:border-primary-700 rounded-xl outline-none focus:ring-4 focus:ring-primary-500/20 transition-all"
                      />
                      <button
                        disabled={isSettingPassword}
                        onClick={handleSetPasswordAndUnbind}
                        className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isSettingPassword ? t('common.loading') : t('account.confirmUnbind')}
                      </button>
                      <button
                        onClick={() => setShowPasswordSetup(false)}
                        className="px-5 py-3 text-sm font-bold text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-xl transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LINE Row */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl border-2 transition-all hover:shadow-md ${user.lineUserId ? 'border-[#06C755]/20 bg-[#06C755]/[0.03]' : 'border-input bg-surface-soft/30'}`}>
              <div className="flex items-center gap-5">
                {user.lineUserId ? (
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-[#06C755] text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-[#06C755]/30">
                      {(user.lineDisplayName || 'L')[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white dark:bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-green-900">
                      <svg className="w-4 h-4 text-green-500 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-[#06C755]/10 text-[#06C755] border-2 border-[#06C755]/20">
                    <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2c5.514 0 10 3.592 10 8.007 0 3.532-2.855 6.478-6.728 7.513-.337.07-.797.222-.912.511-.103.263-.068.675-.033 1.112.035.437.166 1.764.19 1.954.024.19.112.743-.243.812-.355.07-.944-.456-1.32-.821-.376-.365-1.74-2.023-2.373-2.857-2.73-.012-5.461-1.853-5.461-5.187C5 5.592 9.486 2 12 2z" />
                    </svg>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black text-main">LINE</h3>
                    {user.lineUserId && <span className="px-2 py-0.5 text-[10px] font-black bg-[#06C755] text-white rounded-md uppercase tracking-wider">SECURED</span>}
                  </div>
                  <p className="text-sm text-sub font-medium">
                    {user.lineUserId
                      ? user.lineDisplayName || t('autoGen.store.key44')
                      : t('autoGen.store.key45')}
                  </p>
                </div>
              </div>

              {user.lineUserId ? (
                <button
                  onClick={() => {
                    if (!(user as any).hasPassword) {
                      setShowPasswordSetup(true);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    } else {
                      if (confirm(t('autoGen.store.key46'))) handleUnbind();
                    }
                  }}
                  className="px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 transition-all active:scale-95"
                >
                  {t('account.unbind')}
                </button>
              ) : (
                <button
                  onClick={handleLineAuth}
                  className="px-8 py-3 bg-[#06C755] text-white rounded-xl text-base font-black hover:bg-[#05b34c] transition-all active:scale-[0.98] shadow-lg shadow-[#06C755]/20 flex items-center gap-3 group"
                >
                  <div className="bg-white p-1.5 rounded-full shadow-sm flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.052.303-.25 1.184.108 1.291.357.107.946-.459 1.324-.827 3.276-3.196 6.014-5.836 6.014-5.836 4.191-1.01 5.587-4.102 5.587-7.164zm-17.485 3.391h-1.61c-.347 0-.63-.283-.63-.63v-5.46c0-.347.283-.63.63-.63h1.61c.347 0 .63.283.63.63v5.46c0 .347-.283.63-.63.63zm3.748 0h-1.61c-.347 0-.63-.283-.63-.63v-5.46c0-.347.283-.63.63-.63h1.61c.347 0 .63.283.63.63v5.46c0 .347-.283.63-.63.63zm3.748-1.26h-1.132v-1.144h1.132c.347 0 .63-.283.63-.63v-.539c0-.347-.283-.63-.63-.63h-1.132v-1.144h1.132c.347 0 .63-.283.63-.63v-.539c0-.347-.283-.63-.63-.63h-2.12c-.347 0-.63.283-.63.63v5.46c0 .347.283.63.63.63h2.12c.347 0 .63-.283.63-.63v-.539c0-.348-.283-.631-.63-.631zm3.748 1.26h-1.61c-.347 0-.63-.283-.63-.63v-5.46c0-.347.283-.63.63-.63h1.61c.347 0 .63.283.63.63v5.46c0 .347-.283.63-.63.63z" />
                    </svg>
                  </div>
                  {t('account.bind')} LINE
                </button>
              )}
            </div>

            {/* Google Row */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl border-2 transition-all hover:shadow-md ${(user as any).googleId ? 'border-blue-200 dark:border-blue-800 bg-blue-50/[0.03]' : 'border-input bg-surface-soft/30'}`}>
              <div className="flex items-center gap-5">
                {(user as any).googleId ? (
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/30">
                      {((user as any).googleEmail || 'G')[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white dark:bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-blue-900">
                      <svg className="w-4 h-4 text-green-500 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-surface border-2 border-input shadow-sm">
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black text-main">Google</h3>
                    {(user as any).googleId && <span className="px-2 py-0.5 text-[10px] font-black bg-blue-600 text-white rounded-md uppercase tracking-wider">SECURED</span>}
                  </div>
                  <p className="text-sm text-sub font-medium">
                    {(user as any).googleId
                      ? (user as any).googleEmail || t('autoGen.store.key47')
                      : t('autoGen.store.key48')}
                  </p>
                </div>
              </div>

              {(user as any).googleId ? (
                <button
                  onClick={async () => {
                    if (!(user as any).hasPassword) {
                      setShowPasswordSetup(true);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    } else {
                      if (!confirm(t('autoGen.store.key49'))) return;
                      try {
                        const res = await fetch(`${API_BASE}/auth/google/unbind`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        if (data.success) {
                          window.location.reload();
                        } else {
                          alert(data.error);
                        }
                      } catch (err) {
                        alert(t('autoGen.store.key50'));
                      }
                    }
                  }}
                  className="px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 transition-all active:scale-95"
                >
                  {t('account.unbind')}
                </button>
              ) : (
                <a
                  href={`${API_BASE}/auth/google?prompt=select_account&state=${encodeURIComponent(JSON.stringify({ link: true, token: token, redirect: '/account' }))}`}
                  className="px-8 py-3.5 text-sm font-black bg-surface text-main rounded-xl border-2 border-input hover:border-primary-500/50 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                  {t('account.bind')} Google
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 border-t border-input">
          <details className="group">
            <summary className="flex items-center justify-between p-8 cursor-pointer list-none text-hint hover:text-main transition-all select-none">
              <span className="text-sm font-bold tracking-widest uppercase">{t('account.advancedSettings')}</span>
              <div className="w-8 h-8 rounded-full bg-surface-soft flex items-center justify-center group-open:rotate-180 transition-all duration-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>

            <div className="px-8 pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="p-6 rounded-2xl border-2 border-red-500/10 bg-red-500/[0.02]">
                <h3 className="text-lg font-black text-red-600 mb-2">{t('account.dangerZone')}</h3>
                <p className="text-sm text-sub mb-6 leading-relaxed">
                  {t('account.dangerZoneDesc')}
                </p>
                <button
                  onClick={async () => {
                    if (!confirm(t('footer.deleteAccountWarning'))) return;
                    if (!confirm(t('footer.deleteAccountFinalCheck'))) return;

                    try {
                      const res = await fetch(`${API_BASE}/auth/me`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert(t('autoGen.store.key51'));
                        logout();
                      } else {
                        alert(data.error || t('autoGen.store.key52'));
                      }
                    } catch (err) {
                      alert(t('autoGen.store.key53'));
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95"
                >
                  {t('footer.deleteAccountConfirm')}
                </button>
              </div>
            </div>
          </details>
        </div>

        {/* Logout */}
        <div className="p-8 flex justify-center bg-surface-soft/20">
          <button
            onClick={logout}
            className="group text-hint hover:text-red-600 font-bold text-sm flex items-center gap-3 px-8 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  );

}




