import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

export default function AutomationRuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isNew = !id || id === 'new';

  const EVENTS = [
    { value: 'order.created', label: t('automation.events.order_created') },
    { value: 'order.statusChanged', label: t('automation.events.order_statusChanged') },
    { value: 'reservation.created', label: t('automation.events.reservation_created') },
    { value: 'review.submitted', label: t('automation.events.review_submitted') },
  ];

  const ACTION_TYPES = [
    { value: 'email', label: t('automation.actionTypes.email') },
    { value: 'webhook', label: t('automation.actionTypes.webhook') },
    { value: 'sms', label: t('automation.actionTypes.sms') },
  ];

  const [name, setName] = useState('');
  const [event, setEvent] = useState('order.created');
  const [conditionsJson, setConditionsJson] = useState('');
  const [actions, setActions] = useState<any[]>([{ type: 'email', to: 'customer', subject: '', body: '' }]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isNew) {
      api.get<{ data: any }>(`/automation-rules/${id}`)
        .then((res) => {
          const rule = res.data;
          setName(rule.name);
          setEvent(rule.event);
          setConditionsJson(rule.conditions ? JSON.stringify(rule.conditions, null, 2) : '');
          setActions(rule.actions || []);
          setIsActive(rule.isActive);
        })
        .catch((err) => setError(err.message));
    }
  }, [id, isNew]);

  const updateAction = (index: number, field: string, value: string) => {
    setActions((prev) => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const addAction = () => {
    setActions((prev) => [...prev, { type: 'email', to: '', subject: '', body: '' }]);
  };

  const removeAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let conditions = null;
      if (conditionsJson.trim()) {
        try {
          conditions = JSON.parse(conditionsJson);
        } catch {
          setError(t('automation.messages.invalidJson'));
          setLoading(false);
          return;
        }
      }

      const body = { name, event, conditions, actions, isActive };

      if (isNew) {
        await api.post('/automation-rules', body);
      } else {
        await api.patch(`/automation-rules/${id}`, body);
      }

      navigate('/automation');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isNew ? t('automation.newRule') : t('automation.editRule')}
      </h1>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('automation.ruleName')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              placeholder={t('automation.placeholders.name')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('automation.event')}</label>
            <select
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              {EVENTS.map((ev) => (
                <option key={ev.value} value={ev.value}>{ev.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('automation.conditions')}
            </label>
            <textarea
              value={conditionsJson}
              onChange={(e) => setConditionsJson(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono"
              placeholder={t('automation.placeholders.conditions')}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-primary-600"
            />
            <span className="text-sm text-gray-700">{t('automation.isActive')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('automation.actions')}</h2>
            <button
              type="button"
              onClick={addAction}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + {t('automation.addAction')}
            </button>
          </div>

          <div className="space-y-4">
            {actions.map((action, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(i, 'type', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {actions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAction(i)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      {t('automation.remove')}
                    </button>
                  )}
                </div>

                {(action.type === 'email' || action.type === 'sms') && (
                  <>
                    <input
                      type="text"
                      placeholder={t('automation.placeholders.to')}
                      value={action.to || ''}
                      onChange={(e) => updateAction(i, 'to', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                    />
                    {action.type === 'email' && (
                      <input
                        type="text"
                        placeholder={t('automation.placeholders.subject')}
                        value={action.subject || ''}
                        onChange={(e) => updateAction(i, 'subject', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                      />
                    )}
                    <textarea
                      placeholder={t('automation.placeholders.body')}
                      value={action.body || ''}
                      onChange={(e) => updateAction(i, 'body', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none"
                    />
                  </>
                )}

                {action.type === 'webhook' && (
                  <input
                    type="url"
                    placeholder={t('automation.placeholders.webhookUrl')}
                    value={action.url || ''}
                    onChange={(e) => updateAction(i, 'url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? t('common.loading') : isNew ? t('automation.create') : t('automation.update')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/automation')}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
