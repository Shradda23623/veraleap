import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";

interface FactorSummary {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string;
}

interface EnrollState {
  factorId: string;
  qr: string;
  secret: string;
}

const TwoFactorEnrollment = () => {
  const { toast } = useToast();
  const [factors, setFactors] = useState<FactorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't load 2FA state", description: error.message, variant: "destructive" });
      return;
    }
    const totp = (data?.totp || []).map(f => ({
      id: f.id,
      status: f.status as "verified" | "unverified",
      friendly_name: f.friendly_name,
    }));
    setFactors(totp);
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeFactor = factors.find(f => f.status === "verified");

  const startEnrollment = async () => {
    // Clean up any stale unverified factors before starting a new enrollment.
    const stale = factors.filter(f => f.status === "unverified");
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `VeraLeap ${new Date().toLocaleDateString()}`,
    });
    if (error || !data) {
      toast({ title: "Couldn't start enrollment", description: error?.message, variant: "destructive" });
      return;
    }
    setEnroll({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  };

  const verifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setVerifying(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (challenge.error || !challenge.data) {
      setVerifying(false);
      toast({ title: "Challenge failed", description: challenge.error?.message, variant: "destructive" });
      return;
    }
    const verify = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: challenge.data.id,
      code,
    });
    setVerifying(false);
    if (verify.error) {
      toast({ title: "Code incorrect", description: verify.error.message, variant: "destructive" });
      return;
    }
    toast({ title: "2FA enabled", description: "Your account is now protected by an authenticator app." });
    setEnroll(null);
    setCode("");
    refresh();
  };

  const cancelEnrollment = async () => {
    if (!enroll) return;
    await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
    setEnroll(null);
    setCode("");
    refresh();
  };

  const disable2FA = async () => {
    if (!activeFactor) return;
    if (!window.confirm("Disable two-factor authentication? This will reduce the security of your account.")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: activeFactor.id });
    if (error) {
      toast({ title: "Couldn't disable 2FA", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "2FA disabled" });
    refresh();
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card">
      <div className="flex items-start gap-3 mb-4">
        {activeFactor ? (
          <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        ) : (
          <ShieldOff className="w-6 h-6 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-lg">Two-factor authentication</h3>
          <p className="text-sm text-muted-foreground">
            Add an authenticator app (Google Authenticator, Authy, 1Password) to protect sign-ins.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : activeFactor ? (
        <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-4">
          <div>
            <p className="text-sm font-semibold text-primary">2FA is active</p>
            <p className="text-xs text-muted-foreground">Codes required on each new sign-in.</p>
          </div>
          <Button variant="outline" size="sm" onClick={disable2FA}>Disable</Button>
        </div>
      ) : enroll ? (
        <form onSubmit={verifyEnrollment} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Supabase returns the QR code as an SVG data URL */}
            <img
              src={enroll.qr}
              alt="Scan this QR code with your authenticator app"
              className="w-40 h-40 rounded-lg bg-white p-2"
            />
            <div className="flex-1 min-w-0 text-sm space-y-2">
              <p>1. Scan the QR code in your authenticator app.</p>
              <p>2. Or paste this secret manually:</p>
              <code className="block text-xs bg-muted rounded px-2 py-1.5 break-all">{enroll.secret}</code>
              <p>3. Enter the 6-digit code the app shows to finish enrolling.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">6-digit code</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring tracking-widest font-mono"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={cancelEnrollment}>Cancel</Button>
            <Button type="submit" disabled={verifying} className="bg-gradient-hero text-primary-foreground border-0">
              {verifying ? "Verifying..." : "Verify & Enable"}
            </Button>
          </div>
        </form>
      ) : (
        <Button onClick={startEnrollment} className="bg-gradient-hero text-primary-foreground border-0">
          <ShieldCheck className="w-4 h-4 mr-2" /> Enable 2FA
        </Button>
      )}
    </div>
  );
};

export default TwoFactorEnrollment;
