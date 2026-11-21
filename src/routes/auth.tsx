import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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

function GoogleLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

function AuthPage() {
  const { redirect, mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: redirect ?? "/", replace: true });
  }, [user, loading, redirect, navigate]);

  const oauth = async (provider: "google" | "lovable") => {
    if (redirect) sessionStorage.setItem("rebero_after_login", redirect);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error("Sign-in failed. Please try again.");
  };

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
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { full_name, phone: phone || null } },
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    setSent(email);
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
            <div className="mt-6 grid gap-2">
              <Button type="button" variant="outline" className="h-10 w-full" onClick={() => oauth("google")}><GoogleLogo /> Continue with Google</Button>
              <Button type="button" variant="outline" className="h-10 w-full" onClick={() => oauth("lovable")}><LovableMark /> Continue with Lovable</Button>
            </div>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" /></div>
            <Tabs defaultValue={mode === "signup" ? "signup" : "signin"}>
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
