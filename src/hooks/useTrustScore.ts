import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// NOTE: `trust_scores` / `trust_score_weights` were added directly via a
// Supabase migration and won't appear in the generated Database types until
// you run `npx supabase gen types typescript ...` again. Until then this
// hook casts the client to `any` for these two calls, same workaround
// you'd need for any brand-new table before regenerating types.

export interface TrustScoreFactorDetail {
  score: number;
  weight: number;
  detail: Record<string, unknown>;
}

export interface TrustScoreFactors {
  verification: TrustScoreFactorDetail;
  reports: TrustScoreFactorDetail;
  reviews: TrustScoreFactorDetail;
  behavior: TrustScoreFactorDetail;
  price: TrustScoreFactorDetail;
}

export interface TrustScore {
  property_id: string;
  score: number;
  factors: TrustScoreFactors;
  weights_version: number;
  computed_at: string;
}

async function fetchTrustScore(propertyId: string): Promise<TrustScore | null> {
  const { data, error } = await (supabase as any)
    .from("trust_scores")
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as TrustScore;

  // No score yet (e.g. a property created before this feature shipped) —
  // ask the database to compute one now.
  const { data: refreshed, error: refreshError } = await (supabase as any).rpc(
    "refresh_trust_score",
    { _property_id: propertyId }
  );
  if (refreshError) throw refreshError;
  return refreshed as TrustScore;
}

export function useTrustScore(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["trust-score", propertyId],
    queryFn: () => fetchTrustScore(propertyId as string),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
  });
}
