import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ReviewFormProps {
  targetId: string;
  targetType: "property" | "broker";
}

const ReviewForm = ({ targetId, targetType }: ReviewFormProps) => {
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isLoggedIn) return null;

  const onSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: user!.id,
        target_id: targetId,
        target_type: targetType,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Review submitted!" });
      setRating(0);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["reviews", targetType, targetId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold">Write a Review</p>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHoverRating(i + 1)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(i + 1)}
          >
            <Star
              className={`w-6 h-6 cursor-pointer transition-colors ${
                i < (hoverRating || rating) ? "fill-secondary text-secondary" : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
        {rating > 0 && <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>}
      </div>
      <Textarea
        placeholder="Share your experience (optional)..."
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
      />
      <Button onClick={onSubmit} disabled={submitting || rating === 0} size="sm" className="bg-gradient-hero text-primary-foreground border-0">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Submitting...</> : "Submit Review"}
      </Button>
    </div>
  );
};

export default ReviewForm;
