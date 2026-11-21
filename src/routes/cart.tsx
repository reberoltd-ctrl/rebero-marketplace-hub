import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cart, cartSubtotal, groupBySeller, useCart } from "@/lib/cart";
import { formatRwf } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — REBERO" },
      { name: "description", content: "Review the electronics in your REBERO cart, grouped by seller." },
      { property: "og:title", content: "Your cart — REBERO" },
      { property: "og:description", content: "Review the electronics in your REBERO cart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart();
  const groups = groupBySeller(items);
  const subtotal = cartSubtotal(items);

  if (!items.length) {
    return (
      <div className="container-page grid min-h-[50vh] place-items-center py-16 text-center">
        <div>
          <ShoppingCart className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
          <Button asChild className="mt-6"><Link to="/search">Start shopping</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold md:text-3xl">Your cart</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.shopId} className="rounded-xl border bg-card">
              <header className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold"><Store className="size-4 text-muted-foreground" /> {g.shopName}</header>
              <ul className="divide-y">
                {g.items.map((i) => (
                  <li key={i.productId} className="flex gap-4 p-4">
                    <Link to="/product/$slug" params={{ slug: i.slug }} className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {i.image && <img src={i.image} alt="" className="size-full object-cover" />}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Link to="/product/$slug" params={{ slug: i.slug }} className="line-clamp-2 text-sm font-medium hover:text-primary">{i.name}</Link>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-lg border">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => cart.setQty(i.productId, i.qty - 1)} aria-label="Decrease"><Minus /></Button>
                          <span className="w-8 text-center text-sm">{i.qty}</span>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => cart.setQty(i.productId, i.qty + 1)} disabled={i.qty >= i.stock} aria-label="Increase"><Plus /></Button>
                        </div>
                        <span className="font-semibold">{formatRwf(i.priceRwf * i.qty)}</span>
                        <Button variant="ghost" size="icon" onClick={() => cart.remove(i.productId)} aria-label={`Remove ${i.name}`}><Trash2 /></Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <footer className="flex justify-between border-t px-4 py-3 text-sm"><span className="text-muted-foreground">Seller subtotal</span><span className="font-semibold">{formatRwf(g.subtotal)}</span></footer>
            </section>
          ))}
        </div>
        <aside className="h-fit rounded-xl border bg-card p-5">
          <h2 className="font-bold">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Items</dt><dd>{formatRwf(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="text-muted-foreground">Set by each seller</dd></div>
            <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{formatRwf(subtotal)}</dd></div>
          </dl>
          <Button className="mt-5 w-full" size="lg" disabled>Checkout</Button>
          <p className="mt-3 text-xs text-muted-foreground">Checkout opens once Mobile Money payments are connected. Your cart is saved on this device.</p>
        </aside>
      </div>
    </div>
  );
}
