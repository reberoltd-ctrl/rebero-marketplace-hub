import { createFileRoute, Link } from "@tanstack/react-router";
import { Link2, MousePointerClick, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/affiliate")({
  head: () => ({
    meta: [
      { title: "REBERO Affiliate Programme — Share products, earn 1%" },
      { name: "description", content: "Approved REBERO affiliates earn 1% on completed sales from the product links they share on WhatsApp, Facebook and more." },
      { property: "og:title", content: "Earn with the REBERO Affiliate Programme" },
      { property: "og:description", content: "Share product links, earn 1% on completed sales." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Affiliate,
});

function Affiliate() {
  return (
    <div className="container-page py-14">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Affiliate programme</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight">Share electronics you love. Earn on every completed sale.</h1>
        <p className="mt-4 text-muted-foreground">Approved affiliates get a personal link for every product. When someone buys through your link and the order is completed, you earn 1% of the item value.</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: Link2, t: "Share your link", d: "Copy your link or share straight to WhatsApp and Facebook — the preview shows the real product photo and price." },
          { icon: MousePointerClick, t: "Last click counts", d: "The most recent affiliate link a buyer clicked gets the credit for that purchase." },
          { icon: Wallet, t: "Get paid", d: "Commissions are confirmed after delivery and paid out once they reach the minimum amount." },
        ].map((x) => (
          <div key={x.t} className="rounded-xl border bg-card p-6">
            <x.icon className="size-7 text-primary" />
            <h2 className="mt-4 font-bold">{x.t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-2xl bg-accent p-6">
        <p className="font-semibold">Applications open soon</p>
        <p className="mt-1 text-sm text-muted-foreground">Create your free account now and you'll be able to apply as soon as the programme launches.</p>
        <Button asChild className="mt-4"><Link to="/auth" search={{ mode: "signup" }}>Create a free account</Link></Button>
      </div>
    </div>
  );
}
