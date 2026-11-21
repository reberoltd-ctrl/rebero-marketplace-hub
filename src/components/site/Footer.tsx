import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/site/Logo";

export function Footer() {
  return (
    <footer className="mt-16 bg-ink text-ink-muted">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo tone="light" />
          <p className="text-sm">Your Technology. Your Marketplace.</p>
          <p className="text-xs">Electronics from trusted Kigali shops and sellers. Prices in Rwandan Francs (RWF).</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink-foreground">Shop</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/search" className="hover:text-ink-foreground">All products</Link></li>
            <li><Link to="/search" search={{ condition: "refurbished" }} className="hover:text-ink-foreground">Refurbished</Link></li>
            <li><Link to="/search" search={{ condition: "used" }} className="hover:text-ink-foreground">Used electronics</Link></li>
            <li><Link to="/wishlist" className="hover:text-ink-foreground">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink-foreground">Earn with REBERO</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/sell" className="hover:text-ink-foreground">Sell on REBERO</Link></li>
            <li><Link to="/affiliate" className="hover:text-ink-foreground">Affiliate programme</Link></li>
            <li><Link to="/seller" className="hover:text-ink-foreground">Seller dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink-foreground">Help</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/account" className="hover:text-ink-foreground">My account</Link></li>
            <li><span>Delivery is arranged by each seller</span></li>
            <li><span>Kigali · Gasabo · Kicukiro · Nyarugenge</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} REBERO Ltd. Kigali, Rwanda.</span>
          <span>Policies are being prepared for review before public launch.</span>
        </div>
      </div>
    </footer>
  );
}
