import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { bootstrapSuperAdmin, SUPER_ADMIN_EMAIL } from "@/lib/admin.functions";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Platform setup — REBERO" },
      { name: "description", content: "One-time REBERO administrator setup." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Platform setup — REBERO" },
      { property: "og:description", content: "One-time REBERO administrator setup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const run = useServerFn(bootstrapSuperAdmin);
  const [state, setState] = useState<{ status: string; message?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      setState(await run());
    } catch {
      setState({ status: "error", message: "Setup failed. Please try again." });
    }
    setBusy(false);
  };

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-12">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-card">
        <ShieldCheck className="size-8 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Super Admin setup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Creates the REBERO Super Admin account <strong>{SUPER_ADMIN_EMAIL}</strong> once, using the initial password stored in your secure settings. It never resets an existing administrator.
        </p>
        {state?.status === "created" && (
          <div className="mt-6 rounded-lg bg-success/15 p-4 text-sm">
            Super Admin created. Sign in with {SUPER_ADMIN_EMAIL} and the initial password — you'll be asked to set a new one straight away.
            <Button asChild className="mt-3 w-full"><Link to="/auth">Go to sign in</Link></Button>
          </div>
        )}
        {state?.status === "exists" && (
          <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
            A Super Admin already exists, so nothing was changed.
            <Button asChild variant="outline" className="mt-3 w-full"><Link to="/auth">Go to sign in</Link></Button>
          </div>
        )}
        {state?.status === "error" && <div className="mt-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{state.message}</div>}
        {(!state || state.status === "error") && <Button className="mt-6 w-full" onClick={go} disabled={busy}>{busy ? "Setting up…" : "Create Super Admin"}</Button>}
      </div>
    </div>
  );
}
