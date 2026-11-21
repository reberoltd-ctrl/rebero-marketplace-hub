/**
 * REBERO commission engine (pure, integer RWF + basis points — no floating-point money).
 * 1 bps = 0.01%. Defaults: seller 200 bps (2%), affiliate 100 bps (1%).
 */
export const DEFAULT_SELLER_BPS = 200;
export const DEFAULT_AFFILIATE_BPS = 100;

export type CommissionBreakdown = {
  itemValue: number;
  sellerCommission: number;
  affiliateCommission: number;
  reberoNet: number;
  sellerNet: number;
};

/** Rounds half-up to the nearest whole franc using integer math only. */
function applyBps(amount: number, bps: number): number {
  return Math.floor((amount * bps + 5000) / 10000);
}

export function calculateCommission(itemValueRwf: number, opts: { sellerBps?: number; affiliateBps?: number; hasAffiliate: boolean }): CommissionBreakdown {
  if (!Number.isInteger(itemValueRwf) || itemValueRwf < 0) throw new Error("Item value must be a non-negative whole number of RWF");
  const sellerBps = opts.sellerBps ?? DEFAULT_SELLER_BPS;
  const affiliateBps = opts.affiliateBps ?? DEFAULT_AFFILIATE_BPS;
  if (affiliateBps > sellerBps) throw new Error("Affiliate rate cannot exceed seller commission");
  const sellerCommission = applyBps(itemValueRwf, sellerBps);
  const affiliateCommission = opts.hasAffiliate ? Math.min(applyBps(itemValueRwf, affiliateBps), sellerCommission) : 0;
  return {
    itemValue: itemValueRwf,
    sellerCommission,
    affiliateCommission,
    reberoNet: sellerCommission - affiliateCommission,
    sellerNet: itemValueRwf - sellerCommission,
  };
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/** Converts a percentage like 2 or 1.5 into basis points; null when out of range. */
export function percentToBps(pct: number): number | null {
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
  return Math.round(pct * 100);
}
