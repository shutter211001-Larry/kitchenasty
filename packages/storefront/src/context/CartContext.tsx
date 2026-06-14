import React, { createContext, useContext, useState, useCallback } from 'react';

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
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kitchenasty-cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse cart items from localStorage:', e);
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('kitchenasty-cart', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart items to localStorage:', e);
    }
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    const randomId = Math.random().toString(36).substring(2, 9);
    setItems((prev) => [...prev, { ...item, id: randomId }]);
    setIsOpen(true);
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem('kitchenasty-cart');
    } catch (e) {
      console.error('Failed to remove cart items from localStorage:', e);
    }
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    if (item.redeemedWithPoints) return sum;
    const optionsTotal = item.options.reduce((s, o) => s + o.priceModifier, 0);
    return sum + (item.price + optionsTotal) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, isOpen, setIsOpen, addItem, updateQuantity, removeItem, clear, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
