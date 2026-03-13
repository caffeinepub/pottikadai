import { create } from "zustand";
import type { Product } from "../backend.d";

export interface CartItem {
  product: Product;
  qty: number;
  discount: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  taxAmount: (taxRate: number) => number;
  total: (taxRate: number) => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { product, qty: 1, discount: 0 }] };
    });
  },
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },
  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, qty } : i,
      ),
    }));
  },
  updateDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, discount } : i,
      ),
    }));
  },
  clearCart: () => set({ items: [] }),
  subtotal: () => {
    return get().items.reduce((sum, i) => {
      const lineTotal = i.product.salePrice * i.qty;
      const discountAmt = (lineTotal * i.discount) / 100;
      return sum + lineTotal - discountAmt;
    }, 0);
  },
  taxAmount: (taxRate) => {
    return (get().subtotal() * taxRate) / 100;
  },
  total: (taxRate) => {
    return get().subtotal() + get().taxAmount(taxRate);
  },
}));
