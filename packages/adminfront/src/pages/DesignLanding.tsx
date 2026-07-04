import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.js';
import { getFullUrl } from '../utils/url.js';

interface HeroSection {
  title?: string;
  subtitle?: string;
  ctaPrimaryText?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  backgroundImage?: string;
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface CtaSection {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

interface MenuSection {
  title?: string;
  description?: string;
  imageAspectRatio?: string;
}

export default function DesignLanding() {
  const { t } = useTranslation();

  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [hero, setHero] = useState<HeroSection>({});
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [cta, setCta] = useState<CtaSection>({});
  const [menu, setMenu] = useState<MenuSection>({});
  const [orderStatusMessage, setOrderStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<{ success: boolean; data: any }>('/settings')
      .then((res) => {
        if (res.data) {
          if (res.data.heroSection) setHero(res.data.heroSection);
          if (res.data.featuresSection) setFeatures(res.data.featuresSection);
          if (res.data.ctaSection) setCta(res.data.ctaSection);
          if (res.data.menuSection) setMenu(res.data.menuSection);
          if (res.data.orderStatusMessage) setOrderStatusMessage(res.data.orderStatusMessage);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put<{ success: boolean; error?: string }>('/settings', { 
        heroSection: hero, 
        featuresSection: features, 
        ctaSection: cta,
        menuSection: menu,
        orderStatusMessage
      });
      setSuccess(t('designLanding.homepageUpdatedSuccessfully'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || t('designLanding.networkError'));
    } finally {
      setSaving(false);
    }
  }

  function addFeature() {
    setFeatures([...features, { icon: '⭐', title: '', description: '' }]);
  }

  function removeFeature(index: number) {
    setFeatures(features.filter((_, i) => i !== index));
  }

  function updateFeature(index: number, field: keyof FeatureItem, value: string) {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    setFeatures(updated);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.upload<{ data: { heroSection: HeroSection } }>('/settings/hero-background', formData);
      if (res.data?.heroSection?.backgroundImage) {
        setHero(res.data.heroSection);
        setSuccess(t('designLanding.backgroundImageUploaded'));
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || t('designLanding.uploadFailedMessage'));
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (loading) return <div className="p-6 text-gray-500">{t('designLanding.loadingStatus')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('designLanding.landingPageEditor')}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? t('designLanding.savingStatus') : t('designLanding.saveChangesButton')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {Array.isArray(error) ? error.map((err: any, i) => <div key={i}>{err.message || JSON.stringify(err)}</div>) : error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      {/* Hero Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('designLanding.heroSection')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.mainTitle')}</label>
            <input
              type="text"
              value={hero.title || ''}
              onChange={(e) => setHero({ ...hero, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('designLanding.mainTitlePlaceholder')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.subtitle')}</label>
            <textarea
              value={hero.subtitle || ''}
              onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('designLanding.subtitlePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.primaryButtonText')}</label>
            <input
              type="text"
              value={hero.ctaPrimaryText || ''}
              onChange={(e) => setHero({ ...hero, ctaPrimaryText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('designLanding.viewMenu')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.primaryButtonLink')}</label>
            <input
              type="text"
              value={hero.ctaPrimaryLink || ''}
              onChange={(e) => setHero({ ...hero, ctaPrimaryLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="/menu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.secondaryButtonText')}</label>
            <input
              type="text"
              value={hero.ctaSecondaryText || ''}
              onChange={(e) => setHero({ ...hero, ctaSecondaryText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('designLanding.findBranch')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.secondaryButtonLink')}</label>
            <input
              type="text"
              value={hero.ctaSecondaryLink || ''}
              onChange={(e) => setHero({ ...hero, ctaSecondaryLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="/locations"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.backgroundImage')}</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {hero.backgroundImage && (
                <div className="relative group w-40 h-24 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={getFullUrl(hero.backgroundImage)!}
                    alt="Hero Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 w-full">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={hero.backgroundImage || ''}
                    onChange={(e) => setHero({ ...hero, backgroundImage: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://... or /uploads/..."
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                  >
                    {t('designLanding.uploadImage')}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {t('designLanding.uploadImageHint')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('designLanding.featuresSection')}</h2>
          <button
            type="button"
            onClick={addFeature}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('designLanding.addFeatureItem')}
          </button>
        </div>
        {features.length === 0 && (
          <p className="text-sm text-gray-500">{t('designLanding.noFeaturesMessage')}</p>
        )}
        <div className="space-y-4">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                <input
                  type="text"
                  value={feature.icon}
                  onChange={(e) => updateFeature(i, 'icon', e.target.value)}
                  className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={feature.title}
                    onChange={(e) => updateFeature(i, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <input
                    type="text"
                    value={feature.description}
                    onChange={(e) => updateFeature(i, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFeature(i)}
                className="mt-5 text-red-500 hover:text-red-700 text-sm"
              >
                {t('designLanding.remove')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('designLanding.ctaSection')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.title')}</label>
            <input
              type="text"
              value={cta.title || ''}
              onChange={(e) => setCta({ ...cta, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('designLanding.readyToOrder')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.description')}</label>
            <textarea
              value={cta.description || ''}
              onChange={(e) => setCta({ ...cta, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.buttonText')}</label>
            <input
              type="text"
              value={cta.buttonText || ''}
              onChange={(e) => setCta({ ...cta, buttonText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('designLanding.createAccount')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.buttonLink')}</label>
            <input
              type="text"
              value={cta.buttonLink || ''}
              onChange={(e) => setCta({ ...cta, buttonLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="/register"
            />
          </div>
        </div>
      </div>

      {/* Menu Page Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('designLanding.menuPageSettings')}</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.menuTitle')}</label>
            <input
              type="text"
              value={menu.title || ''}
              onChange={(e) => setMenu({ ...menu, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('designLanding.menuTitlePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.menuDescription')}</label>
            <textarea
              value={menu.description || ''}
              onChange={(e) => setMenu({ ...menu, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('designLanding.menuDescriptionPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.imageAspectRatio', '圖片比例 (Image Aspect Ratio)')}</label>
            <select
              value={menu.imageAspectRatio || 'h-40'}
              onChange={(e) => setMenu({ ...menu, imageAspectRatio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="h-40">{t('designLanding.ratioFixedHeight', '固定高度 (Fixed Height - Default)')}</option>
              <option value="aspect-square">{t('designLanding.ratio11', '1:1 (正方形)')}</option>
              <option value="aspect-[4/3]">{t('designLanding.ratio43', '4:3 (標準)')}</option>
              <option value="aspect-video">{t('designLanding.ratio169', '16:9 (寬螢幕)')}</option>
              <option value="aspect-auto">{t('designLanding.ratioAuto', '自動 (原始比例)')}</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">{t('designLanding.imageAspectRatioHint', '此設定會套用於菜單的商品圖片顯示比例')}</p>
          </div>
        </div>
      </div>

      {/* Order Status Page Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('designLanding.orderStatusPage')}</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('designLanding.orderStatusPageHint')}</label>
            <p className="text-xs text-gray-500 mb-2">{t('designLanding.orderStatusPageDescription')}</p>
            <textarea
              value={orderStatusMessage}
              onChange={(e) => setOrderStatusMessage(e.target.value)}
              rows={3}
              placeholder={t('designLanding.orderStatusHintPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
