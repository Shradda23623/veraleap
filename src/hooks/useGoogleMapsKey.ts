import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Prefer a local Vite env var — it's the simplest way to configure Maps
// during development. Falls back to a Supabase edge function called
// `get-maps-key` for production deployments that want to keep the key
// server-side.
const ENV_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || null;

export function useGoogleMapsKey() {
  return useQuery({
    queryKey: ["google-maps-key"],
    queryFn: async () => {
      if (ENV_KEY) return ENV_KEY;
      try {
        const { data, error } = await supabase.functions.invoke("get-maps-key");
        if (error) throw error;
        return (data as { key: string | null }).key;
      } catch {
        // Edge function not deployed — that's fine, maps just won't render.
        return null;
      }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
