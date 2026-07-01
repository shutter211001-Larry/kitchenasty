import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';

export default function SettingsLine() {
  const { t } = useTranslation();

  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [status, setStatus] = useState({
    liffId: '',
    officialAccountUrl: '',
    channelAccessToken: '',
    channelSecret: ''
  });

  const [liffId, setLiffId] = useState('');
  const [officialAccountUrl, setOfficialAccountUrl] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [channelSecret, setChannelSecret] = useState('');

  // LINE Login
  const [lineLoginChannelId, setLineLoginChannelId] = useState('');
  const [lineLoginChannelSecret, setLineLoginChannelSecret] = useState('');

  // LINE Pay
  const [linePayEnabled, setLinePayEnabled] = useState(false);
  const [linePayChannelId, setLinePayChannelId] = useState('');
  const [linePayChannelSecret, setLinePayChannelSecret] = useState('');
  const [linePaySandbox, setLinePaySandbox] = useState(false);
  const [linePayApiUrl, setLinePayApiUrl] = useState('');
  const [linePayProxyUrl, setLinePayProxyUrl] = useState('');
  const [linePayReturnUrl, setLinePayReturnUrl] = useState('');

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');

  useEffect(() => {
    fetchLocations();
  }, [token]);

  async function fetchLocations() {
    try {
      const res = await api.get<{ success: boolean; data: any }>('/locations');
      if (res.success && Array.isArray(res.data)) {
        setLocations(res.data);
      }
    } catch {}
  }

  useEffect(() => {
    fetchStatus();
  }, [token, selectedLocationId]);

  async function fetchStatus() {
    setLoading(true);
    try {
      const url = selectedLocationId ? `/settings/line?locationId=${selectedLocationId}` : '/settings/line';
      const res = await api.get<{ success: boolean; data: any }>(url);
      if (res.success && res.data) {
        setStatus(res.data);
        setLiffId(res.data.liffId || '');
        setOfficialAccountUrl(res.data.officialAccountUrl || '');
        setChannelAccessToken(res.data.channelAccessToken || '');
        setChannelSecret(res.data.channelSecret || '');
        setLineLoginChannelId(res.data.lineLoginChannelId || '');
        setLineLoginChannelSecret(res.data.lineLoginChannelSecret || '');
        setLinePayEnabled(res.data.linePayEnabled || false);
        setLinePayChannelId(res.data.linePayChannelId || '');
        setLinePayChannelSecret(res.data.linePayChannelSecret || '');
        setLinePaySandbox(res.data.linePaySandbox || false);
        setLinePayApiUrl(res.data.linePayApiUrl || '');
        setLinePayProxyUrl(res.data.linePayProxyUrl || '');
        setLinePayReturnUrl(res.data.linePayReturnUrl || '');
      }
    } catch (err) {
      console.error('Failed to fetch LINE settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const url = selectedLocationId ? `/settings/line?locationId=${selectedLocationId}` : '/settings/line';
      await api.put(url, { 
        liffId, officialAccountUrl, channelAccessToken, channelSecret,
        lineLoginChannelId, lineLoginChannelSecret,
        linePayEnabled, linePayChannelId, linePayChannelSecret, linePaySandbox,
        linePayApiUrl, linePayProxyUrl, linePayReturnUrl
      });
      setSuccess(t('settingsLine.settingsSaved'));
      fetchStatus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || t('settingsLine.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const webhookUrl = `${window.location.origin.replace('admin.', '')}/api/line/webhook`;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settingsLine.lineIntegrationSettings')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('settingsLine.configureLineOfficialAndLogin')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? t('settingsLine.saving') : t('settingsLine.saveSettings')}
        </button>
      </div>

      {/* Branch Override Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏬</span>
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-sans">{t('settingsLine.branchLineSettings')}</h3>
            <p className="text-xs text-gray-500 font-sans">{t('settingsLine.branchLineOverrideDescription')}</p>
          </div>
        </div>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer bg-gray-50 hover:bg-gray-100 font-sans"
        >
          <option value="">{t('settingsLine.globalSystemDefaultSettings')}</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              📍 {loc.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">{success}</div>}

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settingsLine.officialAccountLink')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsLine.addFriendUrl')}</label>
              <input
                type="text"
                value={officialAccountUrl}
                onChange={(e) => setOfficialAccountUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={t('settingsLine.exampleAddFriendUrl')}
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('settingsLine.getAddFriendLinkDescription')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settingsLine.messagingApiIntegrationKey')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret</label>
              <input
                type="password"
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={status.channelSecret ? t('settingsLine.configuredKeepBlank') : t('settingsLine.enterChannelSecret')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token</label>
              <input
                type="password"
                value={channelAccessToken}
                onChange={(e) => setChannelAccessToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={status.channelAccessToken ? t('settingsLine.configuredKeepBlank') : t('settingsLine.enterChannelAccessToken')}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('settingsLine.goToLineDevelopersConsole')} <strong>Messaging API Channel</strong> {t('settingsLine.getCorrespondingKeyDescription')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settingsLine.webhookSettingsMessagingApi')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    alert(t('settingsLine.copiedToClipboard'));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  {t('settingsLine.copy')}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('settingsLine.pasteUrlToLineConsole')} <strong>Messaging API Channel</strong> {t('settingsLine.webhookUrlFieldDescription')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('settingsLine.oneClickLoginSettings')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsLine.liffIdRecommended')}</label>
              <input
                type="text"
                value={liffId}
                onChange={(e) => setLiffId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={t('settingsLine.exampleLiffId')}
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('settingsLine.goToLineDevelopersConsole')} <strong>LINE Login Channel</strong> {t('settingsLine.createLiffAppDescription')}
              </p>
            </div>
          </div>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel ID (Login)</label>
                <input
                  type="text"
                  value={lineLoginChannelId}
                  onChange={(e) => setLineLoginChannelId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="LINE Login Channel ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret (Login)</label>
                <input
                  type="password"
                  value={lineLoginChannelSecret}
                  onChange={(e) => setLineLoginChannelSecret(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder={t('settingsLine.configuredKeepBlank')}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {t('settingsLine.ssoVerificationDescription')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('settingsLine.linePayIntegrationSettings')}</h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={linePayEnabled} onChange={(e) => setLinePayEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00B900]"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">{t('settingsLine.enableLinePay')}</span>
            </label>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel ID</label>
                <input
                  type="text"
                  value={linePayChannelId}
                  onChange={(e) => setLinePayChannelId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#00B900]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret</label>
                <input
                  type="password"
                  value={linePayChannelSecret}
                  onChange={(e) => setLinePayChannelSecret(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#00B900]"
                  placeholder={t('settingsLine.configuredLeaveBlank')}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('settingsLine.advancedRoutingSettings')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LINE Pay API URL</label>
                  <input
                    type="text"
                    value={linePayApiUrl}
                    onChange={(e) => setLinePayApiUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00B900]"
                    placeholder={t('settingsLine.defaultLinePayApiUrl')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsLine.forwardProxyUrl')}</label>
                  <input
                    type="text"
                    value={linePayProxyUrl}
                    onChange={(e) => setLinePayProxyUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00B900]"
                    placeholder={t('settingsLine.proxyUrlExample')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settingsLine.linePayProxyInfo')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settingsLine.customReturnUrl')}</label>
                  <input
                    type="text"
                    value={linePayReturnUrl}
                    onChange={(e) => setLinePayReturnUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00B900]"
                    placeholder={t('settingsLine.leaveBlankForDefaultUrl')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settingsLine.returnUrlTip')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="linePaySandbox"
                checked={linePaySandbox}
                onChange={(e) => setLinePaySandbox(e.target.checked)}
                className="w-4 h-4 text-[#00B900] border-gray-300 rounded focus:ring-[#00B900]"
              />
              <label htmlFor="linePaySandbox" className="text-sm text-gray-700">{t('settingsLine.enableSandboxMode')}</label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? t('settingsLine.saving') : t('settingsLine.saveAllSettings')}
          </button>
        </div>
      </div>
    </div>
  );
}
