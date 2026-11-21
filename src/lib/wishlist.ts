import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["wishlist", user?.id ?? "anon"];
  const { data: ids = [] } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlists").select("product_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.product_id);
    },
  });
  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("signin");
      if (ids.includes(productId)) {
        const { error } = await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
      if (error) throw error;
      return true;
    },
    onSuccess: (added) => {
      toast.success(added ? "Saved to your wishlist" : "Removed from your wishlist");
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => {
      if (e instanceof Error && e.message === "signin") toast.error("Sign in to save products to your wishlist");
      else toast.error("Could not update your wishlist");
    },
  });
  return { ids, toggle: (id: string) => toggle.mutate(id), pending: toggle.isPending };
}
