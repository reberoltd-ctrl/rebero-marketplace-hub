import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Percent, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell electronics on REBERO — Open your shop in Kigali" },
      { name: "description", content: "Open a free REBERO shop, list new, refurbished or used electronics and reach buyers across Kigali. 2% commission only on completed sales." },
      { property: "og:title", content: "Sell electronics on REBERO" },
      { property: "og:description", content: "Free shop, 2% commission only on completed sales. Built for Kigali electronics sellers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sell,
});

const steps = [
  { icon: Store, title: "Apply for free", text: "Tell us about your shop or yourself as an individual seller." },
  { icon: BadgeCheck, title: "Get approved", text: "The REBERO team reviews every seller before they can publish." },
  { icon: Truck, title: "List and deliver", text: "Add products with photos and condition, then arrange delivery to buyers." },
  { icon: Percent, title: "Pay only when you sell", text: "A 2% commission applies to completed sales. Subscriptions are optional." },
];

function Sell() {
  return (
    <div>
      <section className="bg-ink text-ink-foreground">
        <div className="container-page py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">For shops and individual sellers</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight md:text-5xl">Sell your electronics to buyers across Kigali.</h1>
          <p className="mt-4 max-w-xl text-ink-muted">Open your REBERO shop for free. No monthly fee is required — you pay a 2% commission only on completed sales.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/seller">Start your application</Link></Button>
            <Button asChild size="lg" variant="ink-outline"><Link to="/search">See the marketplace</Link></Button>
          </div>
        </div>
      </section>
      <section className="container-page grid gap-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <s.icon className="size-7 text-primary" />
              <span className="font-display text-3xl font-extrabold text-muted">{i + 1}</span>
            </div>
            <h2 className="mt-4 font-bold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
