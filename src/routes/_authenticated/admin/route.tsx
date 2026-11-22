import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { FolderTree, LayoutDashboard, ListChecks, LogOut, Megaphone, Package, ScrollText, Settings, Store, Users } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin control center — REBERO" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin" as const, label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/sellers" as const, label: "Sellers", icon: Store },
  { to: "/admin/products" as const, label: "Products", icon: Package },
  { to: "/admin/spotlight" as const, label: "Homepage spotlight", icon: Megaphone },
  { to: "/admin/categories" as const, label: "Categories", icon: FolderTree },
  { to: "/admin/users" as const, label: "Users & roles", icon: Users },
  { to: "/admin/settings" as const, label: "Settings", icon: Settings },
  { to: "/admin/audit" as const, label: "Audit log", icon: ScrollText },
];

function AdminLayout() {
  const { isStaff, loading, user } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!isStaff) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <ListChecks className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">No access</h1>
          <p className="mt-2 text-muted-foreground">This area is only for REBERO staff.</p>
          <Button asChild className="mt-6"><Link to="/">Back to the shop</Link></Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="p-5"><Logo tone="light" /></div>
        <p className="px-5 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">Control center</p>
        <nav className="mt-2 flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: !!n.exact }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}>
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs text-ink-muted">
          <div className="truncate">{user?.email}</div>
          <Link to="/" className="mt-2 flex items-center gap-2 hover:text-sidebar-foreground"><LogOut className="size-3.5" /> Back to shop</Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b bg-sidebar p-2 md:hidden scrollbar-none">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: !!n.exact }} className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-sidebar-foreground/80"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>{n.label}</Link>
          ))}
        </div>
        <div className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></div>
      </div>
    </div>
  );
}
