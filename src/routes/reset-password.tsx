import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — REBERO" },
      { name: "description", content: "Choose a new password for your REBERO account." },
      { property: "og:title", content: "Reset password — REBERO" },
      { property: "og:description", content: "Choose a new password for your REBERO account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => { if (s.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password.length < 8) return void toast.error("Use at least 8 characters.");
    if (password !== String(fd.get("confirm"))) return void toast.error("The passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Password updated");
    void navigate({ to: "/" });
  };

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">Open this page from the reset link in your email.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2"><Label htmlFor="p1">New password</Label><Input id="p1" name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
            <div className="space-y-2"><Label htmlFor="p2">Confirm password</Label><Input id="p2" name="confirm" type="password" required minLength={8} autoComplete="new-password" /></div>
            <Button type="submit" className="w-full" disabled={busy}>Save password</Button>
          </form>
        )}
      </div>
    </div>
  );
}
