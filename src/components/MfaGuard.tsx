import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  /** Require a verified TOTP factor. If the user has none, send them to Profile to set one up. */
  required?: boolean;
  children: React.ReactNode;
}

type Check =
  | { status: "loading" }
  | { status: "ok" }
  | { status: "needs-enroll" }
  | { status: "needs-verify"; factorId: string };

const MfaGuard = ({ required = false, children }: Props) => {
  const { toast } = useToast();
  const [check, setCheck] = useState<Check>({ status: "loading" });
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const run = async () => {
    setCheck({ status: "loading" });
    const [aalRes, factorsRes] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    if (aalRes.error) {
      toast({ title: "Security check failed", description: aalRes.error.message, variant: "destructive" });
      setCheck({ status: "ok" });
      return;
    }
    const current = aalRes.data?.currentLevel;
    const next = aalRes.data?.nextLevel;
    const verifiedFactor = (factorsRes.data?.totp || []).find(f => f.status === "verified");

    if (current === "aal2") {
      setCheck({ status: "ok" });
      return;
    }
    if (verifiedFactor && next === "aal2") {
      setCheck({ status: "needs-verify", factorId: verifiedFactor.id });
      return;
    }
    if (required) {
      setCheck({ status: "needs-enroll" });
      return;
    }
    setCheck({ status: "ok" });
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (check.status !== "needs-verify") return;
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: check.factorId });
    if (challenge.error || !challenge.data) {
      setSubmitting(false);
      toast({ title: "Challenge failed", description: challenge.error?.message, variant: "destructive" });
      return;
    }
    const verifyRes = await supabase.auth.mfa.verify({
      factorId: check.factorId,
      challengeId: challenge.data.id,
      code,
    });
    setSubmitting(false);
    if (verifyRes.error) {
      toast({ title: "Code incorrect", description: verifyRes.error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Unlocked" });
    setCode("");
    run();
  };

  if (check.status === "loading") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking security…</p>
      </div>
    );
  }

  if (check.status === "needs-enroll") {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Two-factor auth required</h2>
        <p className="text-muted-foreground mb-6">
          Admin access requires an authenticator app. Set up 2FA from your profile, then come back.
        </p>
        <Link to="/profile">
          <Button className="bg-gradient-hero text-primary-foreground border-0">Set up 2FA</Button>
        </Link>
      </div>
    );
  }

  if (check.status === "needs-verify") {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <form onSubmit={verify} className="bg-card rounded-2xl p-8 shadow-card w-full max-w-md space-y-4">
          <div className="text-center">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-2" />
            <h2 className="text-xl font-display font-bold">Verify it's you</h2>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-center text-2xl tracking-[0.4em] font-mono outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" disabled={submitting} className="w-full bg-gradient-hero text-primary-foreground border-0">
            {submitting ? "Verifying..." : "Continue"}
          </Button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
};

export default MfaGuard;
