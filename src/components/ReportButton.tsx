import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type ReportTarget = "property" | "broker" | "review";

interface ReportButtonProps {
  targetType: ReportTarget;
  targetId: string;
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default";
  label?: string;
  className?: string;
}

const REASONS = [
  "Listing is a scam",
  "Fake or misleading photos",
  "Incorrect price or details",
  "Suspected identity fraud",
  "Harassment or inappropriate behaviour",
  "Duplicate listing",
  "Other",
];

const ReportButton = ({ targetType, targetId, size = "sm", variant = "ghost", label = "Report", className = "" }: ReportButtonProps) => {
  const { isLoggedIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = (o: boolean) => {
    if (o && !isLoggedIn) {
      toast({ title: "Sign in to report", description: "You need an account to report listings or users." });
      navigate("/login");
      return;
    }
    setOpen(o);
  };

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit report", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Report submitted", description: "Thanks — our team will review this shortly." });
    setOpen(false);
    setDetails("");
    setReason(REASONS[0]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={size} variant={variant} className={className}>
          <Flag className="w-4 h-4 mr-1.5" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {targetType}</DialogTitle>
          <DialogDescription>
            Help keep VeraLeap safe. Reports are reviewed by our moderation team and are kept confidential.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring">
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Details (optional)</label>
            <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4}
              placeholder="Share anything that helps us investigate..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="bg-gradient-hero text-primary-foreground border-0">
            {submitting ? "Submitting..." : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportButton;
