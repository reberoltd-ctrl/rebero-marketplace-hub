import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isValidRwandaPhone } from "@/lib/format";

function safeRedirect(v: unknown): string | undefined {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (raw: Record<string, unknown>): { redirect?: string; mode?: "signup" } => {
    const out: { redirect?: string; mode?: "signup" } = {};
    const r = safeRedirect(raw["redirect"]);
    if (r) out.redirect = r;
    if (raw["mode"] === "signup") out.mode = "signup";
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in or create an account — REBERO" },
      { name: "description", content: "Sign in to REBERO to save products, track orders, sell electronics or join the affiliate programme." },
      { property: "og:title", content: "Sign in to REBERO" },
      { property: "og:description", content: "Free accounts for buyers, sellers and affiliates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect, mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: justSignedUp ? "/account" : (redirect ?? "/"), replace: true });
  }, [user, loading, redirect, navigate, justSignedUp]);

  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(fd.get("email")).trim(), password: String(fd.get("password")) });
    setBusy(false);
    if (error) toast.error(error.message === "Email not confirmed" ? "Please confirm your email first — check your inbox." : "Incorrect email or password.");
  };

  const signUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim();
    const password = String(fd.get("password"));
    const full_name = String(fd.get("full_name")).trim();
    const phone = String(fd.get("phone")).trim();
    if (password.length < 8) return void toast.error("Use at least 8 characters for your password.");
    if (phone && !isValidRwandaPhone(phone)) return void toast.error("Enter a valid Rwandan phone number, e.g. 0788 123 456.");
    setBusy(true);
    setJustSignedUp(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { full_name, phone: phone || null } },
    });
    setBusy(false);
    if (error) { setJustSignedUp(false); return void toast.error(error.message); }
    // Accounts are activated instantly; the redirect to /account happens once the session loads.
    if (!data.session) setSent(email);
    else toast.success("Welcome to REBERO! Your account is ready.");
  };

  const sendReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")).trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return void toast.error("Could not send the reset email. Try again shortly.");
    toast.success("If that email has an account, a reset link is on its way.");
    setForgot(false);
  };

  if (sent) {
    return (
      <div className="container-page grid min-h-[60vh] place-items-center py-12">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="mt-2 text-muted-foreground">We sent a confirmation link to <strong>{sent}</strong>. Open it to activate your REBERO account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-card md:p-8">
        <h1 className="text-2xl font-bold">{forgot ? "Reset your password" : "Welcome to REBERO"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{forgot ? "We'll email you a secure reset link." : "Creating an account is free."}</p>

        {forgot ? (
          <form onSubmit={sendReset} className="mt-6 space-y-4">
            <div className="space-y-2"><Label htmlFor="r-email">Email</Label><Input id="r-email" name="email" type="email" required autoComplete="email" /></div>
            <Button type="submit" className="w-full" disabled={busy}>Send reset link</Button>
            <Button type="button" variant="link" className="w-full" onClick={() => setForgot(false)}>Back to sign in</Button>
          </form>
        ) : (
          <>
            <Tabs defaultValue={mode === "signup" ? "signup" : "signin"} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <div className="space-y-2"><Label htmlFor="s-email">Email</Label><Input id="s-email" name="email" type="email" required autoComplete="email" /></div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><Label htmlFor="s-pass">Password</Label>
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setForgot(true)}>Forgot password?</button></div>
                    <Input id="s-pass" name="password" type="password" required autoComplete="current-password" />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <div className="space-y-2"><Label htmlFor="u-name">Full name</Label><Input id="u-name" name="full_name" required maxLength={80} autoComplete="name" /></div>
                  <div className="space-y-2"><Label htmlFor="u-email">Email</Label><Input id="u-email" name="email" type="email" required autoComplete="email" /></div>
                  <div className="space-y-2"><Label htmlFor="u-phone">Phone (optional)</Label><Input id="u-phone" name="phone" type="tel" placeholder="0788 123 456" autoComplete="tel" /></div>
                  <div className="space-y-2"><Label htmlFor="u-pass">Password</Label><Input id="u-pass" name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
                  <Button type="submit" className="w-full" disabled={busy}>Create free account</Button>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">By continuing you agree to REBERO's terms and privacy policy. <Link to="/" className="underline">Back to shop</Link></p>
      </div>
    </div>
  );
}
