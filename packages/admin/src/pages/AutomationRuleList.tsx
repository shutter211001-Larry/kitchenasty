import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

interface AutomationRule {
  id: string;
  name: string;
  event: string;
  conditions: Record<string, unknown> | null;
  actions: Array<{ type: string; [key: string]: unknown }>;
  isActive: boolean;
  createdAt: string;
}

export default function AutomationRuleList() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const EVENT_LABELS: Record<string, string> = {
    'order.created': t('automation.events.order_created'),
    'order.statusChanged': t('automation.events.order_statusChanged'),
    'reservation.created': t('automation.events.reservation_created'),
    'review.submitted': t('automation.events.review_submitted'),
  };

  useEffect(() => {
    api.get<{ data: AutomationRule[] }>('/automation-rules')
      .then((res) => setRules(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (rule: AutomationRule) => {
    try {
      await api.patch(`/automation-rules/${rule.id}`, { isActive: !rule.isActive });
      setRules((prev) =>
        prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r)
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm(t('automation.messages.confirmDelete'))) return;
    try {
      await api.delete(`/automation-rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('automation.title')}</h1>
        <Link
          to="/automation/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          + {t('automation.newRule')}
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label={t('common.loading')} />
        </div>
      )}

      {!loading && rules.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">{t('automation.messages.noRules')}</p>
          <Link to="/automation/new" className="text-primary-600 hover:text-primary-700 font-medium">
            {t('automation.messages.createFirst')}
          </Link>
        </div>
      )}

      {!loading && rules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('automation.ruleName')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('automation.event')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('automation.actions')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('common.status')}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{rule.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {EVENT_LABELS[rule.event] || rule.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {rule.actions.map((a, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 mr-1">
                        {t(`automation.actionTypes.${a.type}`)}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(rule)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${rule.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                      {rule.isActive ? t('automation.isActive') : t('automation.isInactive')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      to={`/automation/${rule.id}`}
                      className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                    >
                      {t('common.edit')}
                    </Link>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
   刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
