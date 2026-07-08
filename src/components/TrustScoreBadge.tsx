import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { useTrustScore, TrustScoreFactors } from "@/hooks/useTrustScore";

const FACTOR_LABELS: Record<keyof TrustScoreFactors, string> = {
  verification: "Identity & listing verification",
  reports: "Report history",
  reviews: "Review sentiment",
  behavior: "Account behavior",
  price: "Price vs. comparable listings",
};

function scoreTier(score: number) {
  if (score >= 75) return { label: "Trusted", color: "bg-green-600/10 text-green-700 border-green-600/20", Icon: ShieldCheck };
  if (score >= 50) return { label: "Caution", color: "bg-amber-500/10 text-amber-700 border-amber-500/20", Icon: ShieldQuestion };
  return { label: "High risk", color: "bg-destructive/10 text-destructive border-destructive/20", Icon: ShieldAlert };
}

interface TrustScoreBadgeProps {
  propertyId: string;
  className?: string;
}

const TrustScoreBadge = ({ propertyId, className = "" }: TrustScoreBadgeProps) => {
  const { data, isLoading, isError } = useTrustScore(propertyId);

  if (isLoading) {
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm text-muted-foreground animate-pulse ${className}`}>
        Checking trust score…
      </span>
    );
  }

  if (isError || !data) return null;

  const tier = scoreTier(data.score);
  const Icon = tier.Icon;

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${tier.color} ${className}`}
        >
          <Icon className="w-4 h-4" />
          {tier.label} · {Math.round(data.score)}/100
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <p className="mb-2 font-semibold text-sm">Why this score?</p>
        <ul className="space-y-1.5">
          {(Object.keys(data.factors) as (keyof TrustScoreFactors)[]).map((key) => {
            const f = data.factors[key];
            return (
              <li key={key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{FACTOR_LABELS[key]}</span>
                <span className="font-medium">{Math.round(f.score)}/100</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Computed from verification status, report history, reviews, account
          behavior, and price compared to similar listings nearby.
        </p>
      </HoverCardContent>
    </HoverCard>
  );
};

export default TrustScoreBadge;
