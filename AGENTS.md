<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (REBERO)
- Roles live only in `public.user_roles` (enum `app_role`); privilege checks use `has_role`/`is_staff` SQL functions, never profile fields or client state — prevents privilege escalation.
- Status/approval fields on shops, products and profiles are protected by BEFORE triggers (`*_guard`) that ignore non-staff changes; the app never trusts the browser for approvals.
- Money is stored as whole RWF integers and commission rates as basis points in `platform_settings`; commission math lives in `src/lib/commission.ts` with tests — no floating-point money.
- Storage buckets are private (workspace blocks public buckets); listing photos are served through `/api/public/media/<bucket>/<path>` so link previews get stable absolute URLs.
- Product and shop pages load via public server functions in `src/lib/public.functions.ts` so SSR can emit real og:image/price meta for WhatsApp/Facebook shares.
- Admin and seller areas live under `src/routes/_authenticated/`; admin pages render their own layout (no storefront header).
- The Super Admin is created once via `/setup` (server fn `bootstrapSuperAdmin`) from the `SUPER_ADMIN_INITIAL_PASSWORD` secret and must change the password on first login.
