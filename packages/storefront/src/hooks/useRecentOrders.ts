import { useState, useEffect } from 'react';

interface RecentOrder {
  id: string;
  orderNumber: string;
  date: string;
  total?: number;
  orderType?: string;
}

export function useRecentOrders() {
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_orders');
    if (saved) {
      try {
        setRecentOrders(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent orders', e);
      }
    }
  }, []);

  const addOrder = (order: RecentOrder) => {
    setRecentOrders((prev) => {
      // Keep only the last 10 orders, remove duplicates
      const filtered = prev.filter((o) => o.id !== order.id);
      const next = [order, ...filtered].slice(0, 10);
      localStorage.setItem('recent_orders', JSON.stringify(next));
      return next;
    });
  };

  const removeOrder = (id: string) => {
    setRecentOrders((prev) => {
      const next = prev.filter((o) => o.id !== id);
      localStorage.setItem('recent_orders', JSON.stringify(next));
      return next;
    });
  };

  return { recentOrders, addOrder, removeOrder };
}
