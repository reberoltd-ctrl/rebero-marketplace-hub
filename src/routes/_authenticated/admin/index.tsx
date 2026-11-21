import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

type Stats = Record<string, number>;

function Overview() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data as Stats;
    },
  });
  const cards: { key: string; label: string; to?: "/admin/sellers" | "/admin/products" | "/admin/users"; highlight?: boolean }[] = [
    { key: "total_users", label: "Registered users", to: "/admin/users" },
    { key: "customers", label: "Customers" },
    { key: "sellers", label: "Seller shops", to: "/admin/sellers" },
    { key: "approved_sellers", label: "Approved sellers" },
    { key: "pending_sellers", label: "Pending seller applications", to: "/admin/sellers", highlight: true },
    { key: "total_products", label: "Total products", to: "/admin/products" },
    { key: "pending_products", label: "Products awaiting approval", to: "/admin/products", highlight: true },
    { key: "active_products", label: "Live products" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live figures from the REBERO database.</p>
      {isError && <p className="mt-6 text-sm text-destructive">Could not load statistics.</p>}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <div className={`h-full rounded-xl border bg-card p-4 ${c.highlight && (data?.[c.key] ?? 0) > 0 ? "border-primary" : ""}`}>
              <div className="font-display text-3xl font-bold">{isLoading ? "–" : data?.[c.key] ?? 0}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
            </div>
          );
          return c.to ? <Link key={c.key} to={c.to}>{body}</Link> : <div key={c.key}>{body}</div>;
        })}
      </div>
      {(data?.["demo_products"] ?? 0) > 0 && (
        <p className="mt-4 rounded-lg bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
          {data?.["demo_products"]} sample products from the “REBERO Demo” shop are live. Suspend that shop under Sellers before launch.
        </p>
      )}
      <div className="mt-8 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        Orders, sales (GMV), commission revenue, affiliate payouts and revenue charts will appear here once checkout and Mobile Money payments are connected — they will be calculated only from real transactions.
      </div>
    </div>
  );
}
