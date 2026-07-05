import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ToggleRow } from '../components/ui/ToggleRow';

export default function SettingsPayments() {
  const { t } = useTranslation();

  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stripe
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');

  // PayPal
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalClientSecret, setPaypalClientSecret] = useState('');
  const [paypalSandbox, setPaypalSandbox] = useState(false);

  // Cash
  const [cashEnabled, setCashEnabled] = useState(true);

  useEffect(() => {
    fetch('/api/settings/payment', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.stripeEnabled !== undefined) setStripeEnabled(d.stripeEnabled);
          if (d.stripePublishableKey) setStripePublishableKey(d.stripePublishableKey);
          if (d.stripeSecretKey) setStripeSecretKey(d.stripeSecretKey);
          if (d.stripeWebhookSecret) setStripeWebhookSecret(d.stripeWebhookSecret);
          if (d.paypalEnabled !== undefined) setPaypalEnabled(d.paypalEnabled);
          if (d.paypalClientId) setPaypalClientId(d.paypalClientId);
          if (d.paypalClientSecret) setPaypalClientSecret(d.paypalClientSecret);
          if (d.paypalSandbox !== undefined) setPaypalSandbox(d.paypalSandbox);
          if (d.cashEnabled !== undefined) setCashEnabled(d.cashEnabled);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          stripeEnabled, stripePublishableKey, stripeSecretKey, stripeWebhookSecret,
          paypalEnabled, paypalClientId, paypalClientSecret, paypalSandbox,
          cashEnabled
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data) {
          if (data.data.stripeSecretKey) setStripeSecretKey(data.data.stripeSecretKey);
          if (data.data.stripeWebhookSecret) setStripeWebhookSecret(data.data.stripeWebhookSecret);
          if (data.data.paypalClientSecret) setPaypalClientSecret(data.data.paypalClientSecret);
        }
        setSuccess(t('settingsPayments.paymentSettingsUpdated'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : t('settingsPayments.saveFailed'));
      }
    } catch {
      setError(t('settingsPayments.networkConnectionError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('settingsPayments.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">{t('settingsPayments.backToSettings')}</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{t('settingsPayments.paymentMethodSettings')}</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
          {saving ? t('settingsPayments.saving') : t('settingsPayments.saveChanges')}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Stripe */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <ToggleRow
          title={t('settingsPayments.stripeCreditCard')}
          checked={stripeEnabled && stripePublishableKey.trim() !== '' && stripeSecretKey.trim() !== ''}
          onChange={setStripeEnabled}
          disabled={stripePublishableKey.trim() === '' || stripeSecretKey.trim() === ''}
          className="bg-transparent border-none p-0 mb-4"
        />
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsPayments.publishableKey')}</label>
            <input type="text" value={stripePublishableKey} onChange={(e) => setStripePublishableKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="pk_..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsPayments.secretKey')}</label>
            <input type="password" value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="sk_..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsPayments.webhookSecretKey')}</label>
            <input type="password" value={stripeWebhookSecret} onChange={(e) => setStripeWebhookSecret(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="whsec_..." />
          </div>
        </div>
      </div>

      {/* PayPal */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <ToggleRow
          title="PayPal"
          checked={paypalEnabled && paypalClientId.trim() !== '' && paypalClientSecret.trim() !== ''}
          onChange={setPaypalEnabled}
          disabled={paypalClientId.trim() === '' || paypalClientSecret.trim() === ''}
          className="bg-transparent border-none p-0 mb-4"
        />
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsPayments.clientId')}</label>
            <input type="text" value={paypalClientId} onChange={(e) => setPaypalClientId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsPayments.clientSecret')}</label>
            <input type="password" value={paypalClientSecret} onChange={(e) => setPaypalClientSecret(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <ToggleRow
            title={t('settingsPayments.sandboxMode')}
            checked={paypalSandbox}
            onChange={setPaypalSandbox}
            className="bg-transparent border-none p-0 mt-2"
          />
        </div>
      </div>

        {/* LINE Pay Redirect Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm flex items-start gap-4 mb-6">
          <div className="text-3xl">🟢</div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('settingsPayments.linePayIntegration')}</h2>
            <p className="text-sm text-gray-500 mb-3">
              {t('settingsPayments.linePayIntegrationDescription')}
            </p>
            <a href="/settings/line" className="inline-block px-4 py-2 border border-[#00B900] text-[#00B900] text-sm font-bold rounded-lg hover:bg-[#00B900] hover:text-white transition-colors">
              {t('settingsPayments.goToLineIntegration')}
            </a>
          </div>
        </div>

      {/* Cash */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ToggleRow
          title={t('settingsPayments.cashOnDeliveryOrStore')}
          checked={cashEnabled}
          onChange={setCashEnabled}
          className="bg-transparent border-none p-0"
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
        >
          {saving ? t('settingsPayments.saving') : t('settingsPayments.saveAllChanges')}
        </button>
      </div>
    </div>
  );
}
