import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceRwf: number;
  image: string | null;
  shopId: string;
  shopName: string;
  stock: number;
  qty: number;
};

const KEY = "rebero_cart_v1";
let items: CartItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    items = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as CartItem[];
  } catch {
    items = [];
  }
}

function save(next: CartItem[]) {
  items = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

const EMPTY: CartItem[] = [];

export const cart = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get(): CartItem[] {
    load();
    return items;
  },
  add(item: Omit<CartItem, "qty">, qty = 1) {
    load();
    const existing = items.find((i) => i.productId === item.productId);
    if (existing) {
      save(items.map((i) => (i.productId === item.productId ? { ...i, ...item, qty: Math.min(i.qty + qty, item.stock) } : i)));
    } else {
      save([...items, { ...item, qty: Math.min(qty, item.stock) }]);
    }
  },
  setQty(productId: string, qty: number) {
    load();
    save(items.map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) } : i)));
  },
  remove(productId: string) {
    load();
    save(items.filter((i) => i.productId !== productId));
  },
  clear() {
    save([]);
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(cart.subscribe, cart.get, () => EMPTY);
}

export function cartCount(list: CartItem[]): number {
  return list.reduce((n, i) => n + i.qty, 0);
}

export function cartSubtotal(list: CartItem[]): number {
  return list.reduce((n, i) => n + i.priceRwf * i.qty, 0);
}

/** Groups cart lines into seller-specific fulfilment groups. */
export function groupBySeller(list: CartItem[]): { shopId: string; shopName: string; items: CartItem[]; subtotal: number }[] {
  const map = new Map<string, { shopId: string; shopName: string; items: CartItem[]; subtotal: number }>();
  for (const i of list) {
    const g = map.get(i.shopId) ?? { shopId: i.shopId, shopName: i.shopName, items: [], subtotal: 0 };
    g.items.push(i);
    g.subtotal += i.priceRwf * i.qty;
    map.set(i.shopId, g);
  }
  return [...map.values()];
}
