import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItemOption {
  optionId: string;
  optionName: string;
  valueId: string;
  valueName: string;
  priceModifier: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  options: CartItemOption[];
  comment?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(item) {
        const randomId = Math.random().toString(36).substring(2, 9);
        set((state) => ({
          items: [...state.items, { ...item, id: randomId }],
        }));
      },

      updateQuantity(id, quantity) {
        if (quantity <= 0) {
          set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        } else {
          set((state) => ({
            items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
          }));
        }
      },

      removeItem(id) {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      clear() {
        set({ items: [] });
      },

      itemCount() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      subtotal() {
        return get().items.reduce((sum, item) => {
          const optionsTotal = item.options.reduce((s, o) => s + o.priceModifier, 0);
          return sum + (item.price + optionsTotal) * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'shutter-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
