import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  propertyId: string;
  hostId: string;
  propertyTitle: string;
  disabled?: boolean;
  className?: string;
  buttonLabel?: string;
}

const minDateTimeLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const RequestVisitDialog = ({
  propertyId,
  hostId,
  propertyTitle,
  disabled,
  className = "",
  buttonLabel = "Request a Visit",
}: Props) => {
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSelf = user?.id === hostId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !user) {
      toast({ title: "Login required", description: "Please sign in to request a visit.", variant: "destructive" });
      return;
    }
    if (!when) {
      toast({ title: "Pick a date & time", variant: "destructive" });
      return;
    }
    const requestedAt = new Date(when);
    if (isNaN(requestedAt.getTime())) {
      toast({ title: "Invalid date", variant: "destructive" });
      return;
    }
    if (requestedAt.getTime() < Date.now()) {
      toast({ title: "Pick a future time", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("visits").insert({
      property_id: propertyId,
      tenant_id: user.id,
      host_id: hostId,
      requested_at: requestedAt.toISOString(),
      message: message.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Could not request visit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Visit requested", description: "The host has been notified. You'll get a reply soon." });
    queryClient.invalidateQueries({ queryKey: ["tenant-visits"] });
    setOpen(false);
    setWhen("");
    setMessage("");
  };

  if (isSelf) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={`w-full bg-gradient-warm text-primary-foreground border-0 ${className}`}
          disabled={disabled}
        >
          <Calendar className="w-4 h-4 mr-2" /> {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a visit</DialogTitle>
          <DialogDescription>
            Propose a time to tour &ldquo;{propertyTitle}&rdquo;. The host will approve or suggest another slot.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Preferred date &amp; time</label>
            <input
              type="datetime-local"
              value={when}
              min={minDateTimeLocal()}
              onChange={e => setWhen(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note for the host (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Anything you'd like them to know before the visit?"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1">{message.length}/500</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-gradient-hero text-primary-foreground border-0">
              {submitting ? "Sending..." : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestVisitDialog;
