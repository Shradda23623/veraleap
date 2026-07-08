import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase
    .from("trust_scores")
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as unknown as TrustScore;

  // No score yet (e.g. a property created before this feature shipped) —
  // ask the database to compute one now.
  const { data: refreshed, error: refreshError } = await supabase.rpc(
    "refresh_trust_score",
    { _property_id: propertyId }
  );
  if (refreshError) throw refreshError;
  return refreshed as unknown as TrustScore;
}

export function useTrustScore(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["trust-score", propertyId],
    queryFn: () => fetchTrustScore(propertyId as string),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
  });
}
