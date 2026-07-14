import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Save, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../../../lib/api.js';
import toast from 'react-hot-toast';

interface IntegrationSettings {
  stripeMode: 'HEADQUARTERS' | 'CUSTOM';
  stripeSecretKey?: string;
  
  linePayMode: 'HEADQUARTERS' | 'CUSTOM';
  linePayChannelId?: string;
  linePayChannelSecret?: string;
  
  s3Mode: 'HEADQUARTERS' | 'CUSTOM';
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3Endpoint?: string;
  
  smtpMode: 'HEADQUARTERS' | 'CUSTOM';
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  
  socialMode: 'HEADQUARTERS' | 'CUSTOM';
  lineLoginChannelId?: string;
  lineLoginChannelSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
}

const defaultSettings: IntegrationSettings = {
  stripeMode: 'HEADQUARTERS',
  linePayMode: 'HEADQUARTERS',
  s3Mode: 'HEADQUARTERS',
  smtpMode: 'HEADQUARTERS',
  socialMode: 'HEADQUARTERS'
};

export default function LocationIntegrationsTab({ locationId }: { locationId: string }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<IntegrationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: { integrationSettings?: any } }>(`/locations/${locationId}`)
      .then((res: any) => {
        if (res.data.integrationSettings) {
          setForm({ ...defaultSettings, ...res.data.integrationSettings });
        }
      })
      .finally(() => setLoading(false));
  }, [locationId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/locations/${locationId}`, { integrationSettings: form });
      toast.success(t('common.savedSuccessfully', '儲存成功'));
    } catch (err: any) {
      toast.error(err.message || t('common.saveFailed', '儲存失敗'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof IntegrationSettings, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  const renderSection = (
    title: string,
    modeField: keyof IntegrationSettings,
    fields: { label: string; field: keyof IntegrationSettings; type?: string }[]
  ) => {
    const isCustom = form[modeField] === 'CUSTOM';
    
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <div className="flex bg-white rounded-md border border-gray-300 p-1">
            <button
              onClick={() => updateField(modeField, 'HEADQUARTERS')}
              className={`px-3 py-1 text-sm rounded ${!isCustom ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              跟隨全域總部
            </button>
            <button
              onClick={() => updateField(modeField, 'CUSTOM')}
              className={`px-3 py-1 text-sm rounded ${isCustom ? 'bg-red-100 text-red-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              門市獨立設定
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {!isCustom ? (
            <div className="text-gray-500 text-sm flex items-center gap-2">
              <Key className="w-4 h-4" />
              此門市將會使用品牌全域設定中的金鑰，收付款項將進入總部帳戶。
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 text-red-700 p-3 rounded text-sm flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>嚴格阻斷模式開啟：</strong> 此門市已設定為使用獨立金鑰。若下方金鑰填寫不完整或失效，系統將會直接阻斷結帳與相關服務，<strong>絕對不會</strong>無聲降級使用總部金鑰。
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(f => (
                  <div key={f.field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input
                      type={f.type || "text"}
                      value={(form[f.field] as string) || ''}
                      onChange={e => updateField(f.field, e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-500" />
            門市整合金鑰設定 (Integration Overrides)
          </h2>
          <p className="text-sm text-gray-500 mt-1">設定該分店的專屬金鑰 (如為人頭戶節稅需求，請切換為門市獨立設定)。</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {t('common.save', '儲存')}
        </button>
      </div>

      <div className="p-6">
        {renderSection('Stripe 信用卡金流', 'stripeMode', [
          { label: 'Stripe Secret Key', field: 'stripeSecretKey', type: 'password' }
        ])}
        
        {renderSection('LINE Pay', 'linePayMode', [
          { label: 'Channel ID', field: 'linePayChannelId' },
          { label: 'Channel Secret', field: 'linePayChannelSecret', type: 'password' }
        ])}

        {renderSection('S3 雲端儲存 (發票/圖片上傳)', 's3Mode', [
          { label: 'Access Key ID', field: 's3AccessKeyId' },
          { label: 'Secret Access Key', field: 's3SecretAccessKey', type: 'password' },
          { label: 'Region', field: 's3Region' },
          { label: 'Bucket Name', field: 's3Bucket' },
          { label: 'Custom Endpoint (Optional)', field: 's3Endpoint' }
        ])}

        {renderSection('SMTP 郵件伺服器', 'smtpMode', [
          { label: 'Host', field: 'smtpHost' },
          { label: 'Port', field: 'smtpPort' },
          { label: 'Username', field: 'smtpUser' },
          { label: 'Password', field: 'smtpPass', type: 'password' },
          { label: 'From Email Address', field: 'smtpFrom' }
        ])}
        
        {renderSection('社群登入 (Google & LINE Login)', 'socialMode', [
          { label: 'LINE Login Channel ID', field: 'lineLoginChannelId' },
          { label: 'LINE Login Channel Secret', field: 'lineLoginChannelSecret', type: 'password' },
          { label: 'Google Client ID', field: 'googleClientId' },
          { label: 'Google Client Secret', field: 'googleClientSecret', type: 'password' }
        ])}
      </div>
    </div>
  );
}
