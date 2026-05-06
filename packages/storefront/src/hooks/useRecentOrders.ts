import { useState, useEffect, useCallback } from 'react';

interface RecentOrder {
  id: string;
  orderNumber: string;
  date: string;
  total?: number;
  orderType?: string;
}

export function useRecentOrders() {
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  // Load orders from localStorage
  const loadOrders = useCallback(() => {
    const saved = localStorage.getItem('recent_orders');
    if (saved) {
      try {
        setRecentOrders(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent orders', e);
      }
    } else {
      setRecentOrders([]);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    // Listen for storage changes (sync across tabs/instances)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recent_orders') {
        loadOrders();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab synchronization
    window.addEventListener('recent_orders_updated', loadOrders);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('recent_orders_updated', loadOrders);
    };
  }, [loadOrders]);

  const addOrder = (order: RecentOrder) => {
    // ALWAYS read fresh from localStorage to avoid stale state issues
    const saved = localStorage.getItem('recent_orders');
    let current: RecentOrder[] = [];
    if (saved) {
      try {
        current = JSON.parse(saved);
      } catch (e) {}
    }

    // Filter out duplicates and keep latest 10
    const filtered = current.filter((o) => o.id !== order.id);
    const next = [order, ...filtered].slice(0, 10);

    localStorage.setItem('recent_orders', JSON.stringify(next));
    setRecentOrders(next);

    // Trigger custom event for same-tab synchronization
    window.dispatchEvent(new Event('recent_orders_updated'));
  };

  const removeOrder = (id: string) => {
    const saved = localStorage.getItem('recent_orders');
    let current: RecentOrder[] = [];
    if (saved) {
      try {
        current = JSON.parse(saved);
      } catch (e) {}
    }

    const next = current.filter((o) => o.id !== id);
    localStorage.setItem('recent_orders', JSON.stringify(next));
    setRecentOrders(next);

    window.dispatchEvent(new Event('recent_orders_updated'));
  };

  return { recentOrders, addOrder, removeOrder };
}
