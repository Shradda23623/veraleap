import { Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface FavoriteButtonProps {
  propertyId: string;
  className?: string;
  size?: "sm" | "md";
}

const FavoriteButton = ({ propertyId, className = "", size = "md" }: FavoriteButtonProps) => {
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, propertyId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      toast({ title: "Login required", description: "Please login to save properties.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isFav) {
        await supabase.from("favorites").delete().eq("user_id", user!.id).eq("property_id", propertyId);
        setIsFav(false);
        toast({ title: "Removed from favorites" });
      } else {
        await supabase.from("favorites").insert({ user_id: user!.id, property_id: propertyId });
        setIsFav(true);
        toast({ title: "Added to favorites!" });
      }
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-full flex items-center justify-center transition-colors ${
        size === "sm" ? "w-8 h-8" : "w-10 h-10"
      } ${isFav ? "bg-destructive/10" : "bg-card/90 backdrop-blur-sm hover:bg-card"} ${className}`}
    >
      <Heart className={`${iconSize} ${isFav ? "fill-destructive text-destructive" : "text-foreground"}`} />
    </button>
  );
};

export default FavoriteButton;
