import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { toast } from 'react-hot-toast';
import { Key, Save, Mail, CreditCard, MessageSquare, MapPin, Truck, FileText, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function TenantIntegrations() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const tenantName = (location.state as any)?.tenantName || '載入中...';

  const [activeTab, setActiveTab] = useState<'line' | 'google' | 'mail' | 'invoice' | 'payment' | 'logistics'>('line');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [keys, setKeys] = useState({
    line: {
      liffId: '', channelAccessToken: '', channelSecret: '',
      lineLoginChannelId: '', lineLoginChannelSecret: '',
      linePayChannelId: '', linePayChannelSecret: '',
      linePayApiUrl: '', linePayProxyUrl: '', linePayReturnUrl: ''
    },
    google: {
      googleLoginClientId: '', googleLoginClientSecret: '',
      gmailClientId: '', gmailClientSecret: '', gmailRefreshToken: '',
      googleMapsApiKey: '', geminiApiKey: ''
    },
    mail: {
      smtpHost: '', smtpPort: '', smtpUser: '', smtpPass: '', senderEmail: '', senderName: '', mailServiceType: 'SMTP'
    },
    payment: {
      stripePublicKey: '', stripeSecretKey: '', stripeWebhookSecret: '',
      paypalClientId: '', paypalClientSecret: ''
    },
    invoice: {
      merchantId: '', hashKey: '', hashIv: ''
    },
    logistics: {
      ecpayMerchantId: '', ecpayHashKey: '', ecpayHashIv: '',
      tcatCustomerId: '', tcatApiKey: '',
      pelicanMerchantId: '', pelicanApiKey: ''
    }
  });

  useEffect(() => {
    fetchKeys();
  }, [id]);

  const fetchKeys = async () => {
    if (!id) return;
    try {
      const res = await api.get<{ data: any }>(`/platform-admin/tenants/${id}/integrations`);
      setKeys(res.data);
    } catch (error) {
      toast.error('無法載入金鑰資料');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/platform-admin/tenants/${id}/integrations`, keys);
      toast.success('已發送確認信，等待店家管理員同意套用！', { duration: 5000 });
      navigate('/tenants');
    } catch (error) {
      toast.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (category: keyof typeof keys, field: string, value: string) => {
    setKeys(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const tabs = [
    { id: 'line', name: 'LINE 整合設定', icon: MessageSquare },
    { id: 'google', name: 'Google API 設定', icon: MapPin },
    { id: 'mail', name: '電子郵件發送', icon: Mail },
    { id: 'invoice', name: '電子發票介接', icon: FileText },
    { id: 'payment', name: '第三方金流', icon: CreditCard },
    { id: 'logistics', name: '物流與店到店', icon: Truck },
  ] as const;

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">載入金鑰資料中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div>
          <button onClick={() => navigate('/tenants')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            返回租戶列表
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Key className="w-6 h-6 text-orange-500" />
            設定整合金鑰：<span className="text-orange-400">{tenantName}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">您正在修改該店家的第三方服務金鑰。隱藏的金鑰會顯示為 ********，若不修改請保持原樣。</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-orange-600/20 flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? '處理中...' : '儲存並發送確認信給店家'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-64 shrink-0 flex flex-col gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-lg shadow-orange-500/5'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-gray-800 shadow-md'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </div>

        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
          {activeTab === 'line' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">LINE 官方帳號 (Messaging API)</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Channel Access Token</label>
                    <input type="password" value={keys.line.channelAccessToken} onChange={e => handleChange('line', 'channelAccessToken', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Channel Secret</label>
                    <input type="password" value={keys.line.channelSecret} onChange={e => handleChange('line', 'channelSecret', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">LINE Login (登入與 LIFF)</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">LIFF ID (供前端跳轉使用)</label>
                    <input type="text" value={keys.line.liffId} onChange={e => handleChange('line', 'liffId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Login Channel ID</label>
                    <input type="text" value={keys.line.lineLoginChannelId} onChange={e => handleChange('line', 'lineLoginChannelId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Login Channel Secret</label>
                    <input type="password" value={keys.line.lineLoginChannelSecret} onChange={e => handleChange('line', 'lineLoginChannelSecret', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">LINE Pay (金流)</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Pay Channel ID</label>
                    <input type="text" value={keys.line.linePayChannelId} onChange={e => handleChange('line', 'linePayChannelId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Pay Channel Secret</label>
                    <input type="password" value={keys.line.linePayChannelSecret} onChange={e => handleChange('line', 'linePayChannelSecret', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">進階網址設定 (Advanced Routing)</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">LINE Pay API URL</label>
                    <input type="text" value={keys.line.linePayApiUrl} onChange={e => handleChange('line', 'linePayApiUrl', e.target.value)} placeholder="預設: https://api-pay.line.me" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Forward Proxy URL</label>
                    <input type="text" value={keys.line.linePayProxyUrl} onChange={e => handleChange('line', 'linePayProxyUrl', e.target.value)} placeholder="例如: http://proxy-user:pass@proxy-host:port" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Return URL (自訂跳轉網址)</label>
                    <input type="text" value={keys.line.linePayReturnUrl} onChange={e => handleChange('line', 'linePayReturnUrl', e.target.value)} placeholder="請留白以使用系統動態產生的 Return URL" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'google' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Google SSO 登入授權</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Login Client ID</label>
                    <input type="text" value={keys.google.googleLoginClientId} onChange={e => handleChange('google', 'googleLoginClientId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Login Client Secret</label>
                    <input type="password" value={keys.google.googleLoginClientSecret} onChange={e => handleChange('google', 'googleLoginClientSecret', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Gmail API 授權 (OAuth2 寄信)</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Gmail Client ID</label>
                    <input type="text" value={keys.google.gmailClientId} onChange={e => handleChange('google', 'gmailClientId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Gmail Client Secret</label>
                    <input type="password" value={keys.google.gmailClientSecret} onChange={e => handleChange('google', 'gmailClientSecret', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Refresh Token (無限期存取授權)</label>
                    <input type="password" value={keys.google.gmailRefreshToken} onChange={e => handleChange('google', 'gmailRefreshToken', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Google 地圖與 AI</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Google Maps API Key (Places API)</label>
                    <input type="password" value={keys.google.googleMapsApiKey} onChange={e => handleChange('google', 'googleMapsApiKey', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Gemini API Key (AI 引擎)</label>
                    <input type="password" value={keys.google.geminiApiKey} onChange={e => handleChange('google', 'geminiApiKey', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mail' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">自訂寄件設定 (SMTP / Mailgun)</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">服務提供商</label>
                    <select value={keys.mail.mailServiceType} onChange={e => handleChange('mail', 'mailServiceType', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all">
                      <option value="SMTP">自訂 SMTP</option>
                      <option value="MAILGUN">Mailgun API</option>
                      <option value="GMAIL_API">Gmail API</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">寄件者名稱</label>
                    <input type="text" value={keys.mail.senderName} onChange={e => handleChange('mail', 'senderName', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">寄件者信箱</label>
                    <input type="text" value={keys.mail.senderEmail} onChange={e => handleChange('mail', 'senderEmail', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">SMTP Host (或 Mailgun Domain)</label>
                    <input type="text" value={keys.mail.smtpHost} onChange={e => handleChange('mail', 'smtpHost', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">SMTP Port</label>
                    <input type="text" value={keys.mail.smtpPort} onChange={e => handleChange('mail', 'smtpPort', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">帳號 (User)</label>
                    <input type="text" value={keys.mail.smtpUser} onChange={e => handleChange('mail', 'smtpUser', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">密碼 (或 Mailgun API Key)</label>
                    <input type="password" value={keys.mail.smtpPass} onChange={e => handleChange('mail', 'smtpPass', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoice' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">綠界 ECPay 電子發票 B2C 介接</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Merchant ID (特店編號)</label>
                    <input type="text" value={keys.invoice.merchantId} onChange={e => handleChange('invoice', 'merchantId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Hash Key</label>
                    <input type="password" value={keys.invoice.hashKey} onChange={e => handleChange('invoice', 'hashKey', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Hash IV</label>
                    <input type="password" value={keys.invoice.hashIv} onChange={e => handleChange('invoice', 'hashIv', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">Stripe 信用卡金流收款</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Public Key (Publishable Key)</label>
                    <input type="text" value={keys.payment.stripePublicKey} onChange={e => handleChange('payment', 'stripePublicKey', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Secret Key</label>
                    <input type="password" value={keys.payment.stripeSecretKey} onChange={e => handleChange('payment', 'stripeSecretKey', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Webhook 秘密金鑰 (Webhook Secret)</label>
                    <input type="password" value={keys.payment.stripeWebhookSecret} onChange={e => handleChange('payment', 'stripeWebhookSecret', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">PayPal 信用卡與錢包收款</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Client ID</label>
                    <input type="text" value={keys.payment.paypalClientId} onChange={e => handleChange('payment', 'paypalClientId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Client Secret</label>
                    <input type="password" value={keys.payment.paypalClientSecret} onChange={e => handleChange('payment', 'paypalClientSecret', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">綠界科技 ECPay 店到店交貨便</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Merchant ID (特店編號)</label>
                    <input type="text" value={keys.logistics.ecpayMerchantId} onChange={e => handleChange('logistics', 'ecpayMerchantId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Hash Key</label>
                    <input type="password" value={keys.logistics.ecpayHashKey} onChange={e => handleChange('logistics', 'ecpayHashKey', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Hash IV</label>
                    <input type="password" value={keys.logistics.ecpayHashIv} onChange={e => handleChange('logistics', 'ecpayHashIv', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">黑貓宅急便</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Customer ID (契約客戶代號)</label>
                    <input type="text" value={keys.logistics.tcatCustomerId} onChange={e => handleChange('logistics', 'tcatCustomerId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">API Key</label>
                    <input type="password" value={keys.logistics.tcatApiKey} onChange={e => handleChange('logistics', 'tcatApiKey', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-2">台灣宅配通</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Merchant ID (特約代號)</label>
                    <input type="text" value={keys.logistics.pelicanMerchantId} onChange={e => handleChange('logistics', 'pelicanMerchantId', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">API Key</label>
                    <input type="password" value={keys.logistics.pelicanApiKey} onChange={e => handleChange('logistics', 'pelicanApiKey', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
