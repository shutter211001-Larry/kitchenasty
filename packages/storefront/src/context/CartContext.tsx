import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE, API_URL } from '../lib/api.js';

export interface CartItemOption {
  optionId: string;
  optionName: string;
  optionNameTranslations?: Record<string, string>;
  valueId: string;
  valueName: string;
  valueNameTranslations?: Record<string, string>;
  priceModifier: number;
}

export interface CartItem {
  id: string; // unique cart line ID
  menuItemId: string;
  name: string;
  nameTranslations?: Record<string, string>;
  price: number;
  quantity: number;
  options: CartItemOption[];
  comment?: string;
  redeemedWithPoints?: boolean;
  rewardPointsPrice?: number;
  isFrozenDelivery?: boolean;
  clientId?: string; // For group orders
  guestName?: string; // To display who added it
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, 'id' | 'clientId'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
  tableName: string | null;
  setTableName: (name: string | null) => void;
  
  // Group Ordering
  clientId: string;
  groupSessionId: string | null;
  groupPin: string | null;
  setGroupSession: (sessionId: string | null, pin: string | null) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Generate or retrieve a persistent client ID for this browser session
  const [clientId] = useState(() => {
    let id = sessionStorage.getItem('kitchenasty-client-id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('kitchenasty-client-id', id);
    }
    return id;
  });

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kitchenasty-cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isOpen, setIsOpen] = useState(false);
  const [tableName, setTableName] = useState<string | null>(() => {
    try { return sessionStorage.getItem('kitchenasty-table-name'); } catch { return null; }
  });
  
  const [groupSessionId, setGroupSessionId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('kitchenasty-group-session'); } catch { return null; }
  });
  
  const [groupPin, setGroupPin] = useState<string | null>(() => {
    try { return sessionStorage.getItem('kitchenasty-group-pin'); } catch { return null; }
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    try { localStorage.setItem('kitchenasty-cart', JSON.stringify(items)); } catch {}
  }, [items]);

  useEffect(() => {
    try {
      if (tableName) sessionStorage.setItem('kitchenasty-table-name', tableName);
      else sessionStorage.removeItem('kitchenasty-table-name');
    } catch {}
  }, [tableName]);

  useEffect(() => {
    try {
      if (groupSessionId) sessionStorage.setItem('kitchenasty-group-session', groupSessionId);
      else sessionStorage.removeItem('kitchenasty-group-session');
      
      if (groupPin) sessionStorage.setItem('kitchenasty-group-pin', groupPin);
      else sessionStorage.removeItem('kitchenasty-group-pin');
    } catch {}
  }, [groupSessionId, groupPin]);

  // WebSocket Connection
  useEffect(() => {
    if (groupSessionId) {
      const socket = io(API_URL, { path: '/socket.io', transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      
      socket.on('connect', () => {
        socket.emit('join:group-order', groupSessionId);
      });

      socket.on('group-order:cartUpdate', (serverItems: CartItem[]) => {
        setItems(serverItems);
      });

      return () => {
        socket.emit('leave:group-order', groupSessionId);
        socket.disconnect();
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [groupSessionId]);

  const setGroupSession = useCallback((sessionId: string | null, pin: string | null) => {
    setGroupSessionId(sessionId);
    setGroupPin(pin);
  }, []);

  const syncCartToServer = async (newItems: CartItem[]) => {
    if (!groupSessionId) return;
    try {
      await fetch(`${API_BASE}/group-orders/${groupSessionId}/cart`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems: newItems })
      });
    } catch (e) {
      console.error('Failed to sync group cart', e);
    }
  };

  const addItem = useCallback((item: Omit<CartItem, 'id' | 'clientId'>) => {
    const randomId = Math.random().toString(36).substring(2, 9);
    const guestName = sessionStorage.getItem('kitchenasty-guest-name') || '顧客';
    const newItem = { ...item, id: randomId, clientId, guestName };
    setItems((prev) => {
      const updated = [...prev, newItem];
      if (groupSessionId) syncCartToServer(updated);
      return updated;
    });
    setIsOpen(true);
  }, [clientId, groupSessionId]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => {
      let updated;
      if (quantity <= 0) {
        updated = prev.filter((i) => i.id !== id);
      } else {
        updated = prev.map((i) => (i.id === id ? { ...i, quantity } : i));
      }
      if (groupSessionId) syncCartToServer(updated);
      return updated;
    });
  }, [groupSessionId]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      if (groupSessionId) syncCartToServer(updated);
      return updated;
    });
  }, [groupSessionId]);

  const clear = useCallback(() => {
    setItems((prev) => {
      if (groupSessionId) {
        // Only clear our items, keep others
        const updated = prev.filter((i) => i.clientId !== clientId);
        syncCartToServer(updated);
        return updated;
      }
      return [];
    });
    try { localStorage.removeItem('kitchenasty-cart'); } catch {}
  }, [groupSessionId, clientId]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    if (item.redeemedWithPoints) return sum;
    const optionsTotal = item.options.reduce((s, o) => s + o.priceModifier, 0);
    return sum + (item.price + optionsTotal) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ 
      items, isOpen, setIsOpen, addItem, updateQuantity, removeItem, clear, 
      itemCount, subtotal, tableName, setTableName, 
      clientId, groupSessionId, groupPin, setGroupSession 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
