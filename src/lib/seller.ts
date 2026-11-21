import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useMyShop() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-shop", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("*, district:districts(name)").eq("owner_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
