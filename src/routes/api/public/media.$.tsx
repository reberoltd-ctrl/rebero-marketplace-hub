import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_BUCKETS = new Set(["product-images", "shop-media"]);

// Serves public listing photos from private storage so link previews get a stable, absolute URL.
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = params._splat ?? "";
        const [bucket, ...rest] = splat.split("/");
        const path = rest.join("/");
        if (!bucket || !ALLOWED_BUCKETS.has(bucket) || !path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        const type = data.type || "application/octet-stream";
        if (!type.startsWith("image/")) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: { "content-type": type, "cache-control": "public, max-age=86400, immutable" },
        });
      },
    },
  },
});
