import { useEffect, useState } from "react";

const KEY = "rebero_recent_v1";
const REF_KEY = "rebero_ref_v1";

export function pushRecentlyViewed(productId: string) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    const next = [productId, ...list.filter((id) => id !== productId)].slice(0, 12);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function useRecentlyViewed(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
    } catch {
      setIds([]);
    }
  }, []);
  return ids;
}

/** Last-click affiliate referral: the newest ?ref overwrites any older one. */
export function storeReferral(ref: string, productId: string) {
  try {
    localStorage.setItem(REF_KEY, JSON.stringify({ ref, productId, at: Date.now() }));
  } catch {
    /* ignore */
  }
}
