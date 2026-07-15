import { useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useAnalytics() {
  // Get or create session ID
  const getSessionId = useCallback(() => {
    let sid = sessionStorage.getItem('analytics_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      sessionStorage.setItem('analytics_session_id', sid);
    }
    return sid;
  }, []);

  const trackEvent = useCallback((eventType: 'VIEW_MENU' | 'ADD_TO_CART' | 'BEGIN_CHECKOUT', metadata?: any) => {
    const sessionId = getSessionId();
    // Fire and forget
    api.post('/store-events/events', {
      sessionId,
      eventType,
      metadata
    }).catch(err => {
      console.warn('Failed to track analytics event:', err);
    });
  }, [getSessionId]);

  return { trackEvent };
}
