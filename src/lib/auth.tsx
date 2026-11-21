import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthState = {
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  loading: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFor = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
    ]);
    setProfile(p ?? null);
    setRoles((r ?? []).map((x) => x.role));
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await loadFor(data.user ?? null);
  }, [loadFor]);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      // Defer DB calls out of the auth callback.
      setTimeout(() => void loadFor(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh, loadFor]);

  const isSuperAdmin = roles.includes("super_admin");
  const isStaff = isSuperAdmin || roles.includes("admin");

  return (
    <AuthContext.Provider value={{ user, profile, roles, loading, isStaff, isSuperAdmin, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
