import { describe, expect, it } from "vitest";
import { calculateCommission, percentToBps } from "@/lib/commission";

describe("commission engine", () => {
  it("charges the seller 2% and REBERO keeps all of it when no affiliate is involved", () => {
    const r = calculateCommission(500000, { hasAffiliate: false });
    expect(r.sellerCommission).toBe(10000);
    expect(r.affiliateCommission).toBe(0);
    expect(r.reberoNet).toBe(10000);
    expect(r.sellerNet).toBe(490000);
  });

  it("gives the affiliate 1% and REBERO the remaining 1% on affiliate-attributed sales", () => {
    const r = calculateCommission(500000, { hasAffiliate: true });
    expect(r.sellerCommission).toBe(10000);
    expect(r.affiliateCommission).toBe(5000);
    expect(r.reberoNet).toBe(5000);
  });

  it("rejects an affiliate rate higher than the seller commission", () => {
    expect(() => calculateCommission(100000, { sellerBps: 100, affiliateBps: 200, hasAffiliate: true })).toThrow();
  });

  it("converts admin percentages to basis points", () => {
    expect(percentToBps(2)).toBe(200);
    expect(percentToBps(1)).toBe(100);
    expect(percentToBps(150)).toBeNull();
  });
});
