import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({ meta: [{ title: "Change your password — REBERO" }, { name: "robots", content: "noindex" }] }),
  component: ChangePassword,
});

function ChangePassword() {
  const { user, profile, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const forced = !!profile?.must_change_password;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const current = String(fd.get("current"));
    const password = String(fd.get("password"));
    if (password.length < 12) return void toast.error("Use at least 12 characters.");
    if (password !== String(fd.get("confirm"))) return void toast.error("The new passwords don't match.");
    if (password === current) return void toast.error("Choose a password different from the current one.");
    setBusy(true);
    // Re-verify the current password before changing it.
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email ?? "", password: current });
    if (verifyErr) { setBusy(false); return void toast.error("Your current password is incorrect."); }
    const { error } = await supabase.auth.updateUser({ password, current_password: current } as { password: string });
    if (error) { setBusy(false); return void toast.error(error.message); }
    await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    await refresh();
    setBusy(false);
    toast.success("Password changed");
    void navigate({ to: forced ? "/admin" : "/account", replace: true });
  };

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-card md:p-8">
        <KeyRound className="size-8 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">{forced ? "Set your own password" : "Change password"}</h1>
        {forced && <p className="mt-2 text-sm text-muted-foreground">For security, replace the initial password before using your account.</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2"><Label htmlFor="c0">Current password</Label><Input id="c0" name="current" type="password" required autoComplete="current-password" /></div>
          <div className="space-y-2"><Label htmlFor="c1">New password (12+ characters)</Label><Input id="c1" name="password" type="password" required minLength={12} autoComplete="new-password" /></div>
          <div className="space-y-2"><Label htmlFor="c2">Confirm new password</Label><Input id="c2" name="confirm" type="password" required minLength={12} autoComplete="new-password" /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</Button>
        </form>
      </div>
    </div>
  );
}
