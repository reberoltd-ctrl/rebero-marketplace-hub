import { createServerFn } from "@tanstack/react-start";

export const SUPER_ADMIN_EMAIL = "admin@rebero.rw";

/**
 * First-deployment bootstrap: creates the Super Admin once, using the password from the
 * SUPER_ADMIN_INITIAL_PASSWORD secret. Never resets an existing Super Admin.
 */
export const bootstrapSuperAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { count, error: countErr } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin");
  if (countErr) return { status: "error" as const, message: "Could not check existing administrators." };
  if ((count ?? 0) > 0) return { status: "exists" as const };

  let password = process.env["SUPER_ADMIN_INITIAL_PASSWORD"];
  if (!password && import.meta.env.DEV) password = "Rebero@ChangeMe2026!";
  if (!password || password.length < 10) {
    return { status: "error" as const, message: "The initial administrator password is not configured. Setup stopped safely." };
  }

  // Reuse an existing account with that email if one exists, otherwise create it.
  let userId: string | null = null;
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL);
  if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: "REBERO Super Admin" },
    });
    if (error || !created.user) return { status: "error" as const, message: "Could not create the administrator account." };
    userId = created.user.id;
  }

  await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: "REBERO Super Admin", must_change_password: true });
  const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "super_admin" });
  if (roleErr) return { status: "error" as const, message: "Could not assign the Super Admin role." };
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: null,
    action: "super_admin_bootstrapped",
    entity_type: "user",
    entity_id: userId,
    details: { email: SUPER_ADMIN_EMAIL },
  });
  return { status: "created" as const };
});
