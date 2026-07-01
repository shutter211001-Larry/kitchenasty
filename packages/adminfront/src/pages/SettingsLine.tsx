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
      setSuccess(t('autoGen.admin.key1370'));
      fetchStatus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || t('autoGen.admin.key1371'));
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
          <h1 className="text-2xl font-bold text-gray-900">{t('autoGen.admin.key1372')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('autoGen.admin.key1373')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? t('autoGen.admin.key1374') : t('autoGen.admin.key1375')}
        </button>
      </div>

      {/* Branch Override Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏬</span>
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-sans">{t('autoGen.admin.key1376')}</h3>
            <p className="text-xs text-gray-500 font-sans">{t('autoGen.admin.key1377')}</p>
          </div>
        </div>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer bg-gray-50 hover:bg-gray-100 font-sans"
        >
          <option value="">{t('autoGen.admin.key1378')}</option>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('autoGen.admin.key1379')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1380')}</label>
              <input
                type="text"
                value={officialAccountUrl}
                onChange={(e) => setOfficialAccountUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={t('autoGen.admin.key1381')}
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('autoGen.admin.key1382')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('autoGen.admin.key1383')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret</label>
              <input
                type="password"
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={status.channelSecret ? t('autoGen.admin.key1384') : t('autoGen.admin.key1385')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token</label>
              <input
                type="password"
                value={channelAccessToken}
                onChange={(e) => setChannelAccessToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={status.channelAccessToken ? t('autoGen.admin.key1386') : t('autoGen.admin.key1387')}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('autoGen.admin.key1388')} <strong>Messaging API Channel</strong> {t('autoGen.admin.key1389')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('autoGen.admin.key1390')}</h2>
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
                    alert(t('autoGen.admin.key1391'));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  {t('autoGen.admin.key1392')}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('autoGen.admin.key1393')} <strong>Messaging API Channel</strong> {t('autoGen.admin.key1394')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('autoGen.admin.key1395')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1396')}</label>
              <input
                type="text"
                value={liffId}
                onChange={(e) => setLiffId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder={t('autoGen.admin.key1397')}
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('autoGen.admin.key1398')} <strong>LINE Login Channel</strong> {t('autoGen.admin.key1399')}
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
                  placeholder={t('autoGen.admin.key1400')}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {t('autoGen.admin.key1401')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('autoGen.admin.key1402')}</h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={linePayEnabled} onChange={(e) => setLinePayEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00B900]"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">{t('autoGen.admin.key1403')}</span>
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
                  placeholder={t('autoGen.admin.key1404')}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('autoGen.admin.key1405')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LINE Pay API URL</label>
                  <input
                    type="text"
                    value={linePayApiUrl}
                    onChange={(e) => setLinePayApiUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00B900]"
                    placeholder={t('autoGen.admin.key1406')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1407')}</label>
                  <input
                    type="text"
                    value={linePayProxyUrl}
                    onChange={(e) => setLinePayProxyUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00B900]"
                    placeholder={t('autoGen.admin.key1408')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('autoGen.admin.key1409')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('autoGen.admin.key1410')}</label>
                  <input
                    type="text"
                    value={linePayReturnUrl}
                    onChange={(e) => setLinePayReturnUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#00B900]"
                    placeholder={t('autoGen.admin.key1411')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('autoGen.admin.key1412')}
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
              <label htmlFor="linePaySandbox" className="text-sm text-gray-700">{t('autoGen.admin.key1413')}</label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? t('autoGen.admin.key1414') : t('autoGen.admin.key1415')}
          </button>
        </div>
      </div>
    </div>
  );
}
