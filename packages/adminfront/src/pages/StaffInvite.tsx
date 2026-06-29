import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function StaffInvite() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('STAFF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = localStorage.getItem('token') || '';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, name: name || undefined, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleInviteAnother() {
    setEmail('');
    setName('');
    setRole('STAFF');
    setSuccess(false);
    setError('');
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-green-600">✓</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('staff.inviteSent')}</h2>
          <p className="text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('staff.inviteDesc', { email }) }} />
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleInviteAnother}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {t('staff.inviteAnother')}
            </button>
            <Link
              to="/staff"
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t('staff.backToList')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/staff" className="text-gray-400 hover:text-gray-600">
          {t('staff.back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('staff.inviteTitle')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.email')} *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            placeholder="example@gmail.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.nameOptional')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('staff.role')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="STAFF">{t('staff.roles.staff')}</option>
            <option value="MANAGER">{t('staff.roles.manager')}</option>
            <option value="SUPER_ADMIN">{t('staff.roles.superAdmin')}</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {loading ? t('staff.actions.sending') : t('staff.actions.sendInvite')}
        </button>
      </form>
    </div>
  );
}
