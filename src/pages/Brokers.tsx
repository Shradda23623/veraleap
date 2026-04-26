import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, BadgeCheck, Phone, Filter, MessageCircle, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSEO } from "@/hooks/useSEO";

const CITIES_LIST = ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai", "Kolkata", "Jaipur", "Chandigarh", "Jalandhar"];

const Brokers = () => {
  useSEO({ title: "Trusted brokers", description: "Discover verified real estate brokers in your city. Read reviews and chat directly with trusted professionals." });
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") || "");
  const [view, setView] = useState<"list" | "grid">("grid");
  const { isLoggedIn } = useAuth();

  const { data: brokers = [], isLoading } = useQuery({
    queryKey: ["brokers", selectedCity],
    queryFn: async () => {
      // Get all profiles that have the "broker" role
      const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "broker");
      if (!roleData?.length) return [];
      
      const brokerIds = roleData.map(r => r.user_id);
      let query = supabase.from("profiles").select("*").in("user_id", brokerIds);
      if (selectedCity) query = query.eq("city", selectedCity);
      
      const { data } = await query;
      return data || [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-2">Verified <span className="text-gradient-hero">Brokers</span></h1>
      <p className="text-muted-foreground mb-8">Trusted real estate professionals with real customer reviews</p>

      <div className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-card rounded-xl shadow-card">
        <Filter className="w-5 h-5 text-muted-foreground" />
        <select value={selectedCity} onChange={e => { setSelectedCity(e.target.value); e.target.value ? setSearchParams({ city: e.target.value }) : setSearchParams({}); }}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none">
          <option value="">All Cities</option>
          {CITIES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">{brokers.length} found</span>
          <div className="flex rounded-lg border border-input overflow-hidden">
            <button onClick={() => setView("grid")} className={`p-2 ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-background"}`} aria-label="Grid view"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView("list")} className={`p-2 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background"}`} aria-label="List view"><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 shadow-card">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-5/6 mb-4" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : brokers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-xl mb-2">No brokers found</p>
          <p className="text-sm">Brokers will appear here once they register on the platform.</p>
        </div>
      ) : (
        <BrokersContent brokers={brokers} view={view} selectedCity={selectedCity} isLoggedIn={isLoggedIn} />
      )}
    </div>
  );
};

const BrokersContent = ({ brokers, view, selectedCity, isLoggedIn }: { brokers: any[]; view: "list" | "grid"; selectedCity: string; isLoggedIn: boolean }) => {

  const grid = (
    <div className={`grid gap-6 ${view === "list" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
      {brokers.map((b) => (
        <div key={b.id} className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all">
          <div className="flex items-start gap-4 mb-4">
            {b.avatar_url ? (
              <img src={b.avatar_url} alt={b.username} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                {b.username.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{b.username}</h3>
                {b.verified && <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />{b.location || b.city || "Location not set"}
              </p>
            </div>
          </div>
          {b.bio && <p className="text-sm text-muted-foreground mb-4">{b.bio}</p>}
          <div className="flex gap-2">
            {isLoggedIn ? (
              <Link to={`/chat?to=${b.user_id}&name=${b.username}`} className="flex-1">
                <Button size="sm" className="w-full bg-gradient-hero text-primary-foreground border-0">
                  <MessageCircle className="w-4 h-4 mr-1" /> Chat
                </Button>
              </Link>
            ) : (
              <Link to="/login" className="flex-1">
                <Button size="sm" variant="outline" className="w-full">Login to Chat</Button>
              </Link>
            )}
            {b.phone && (
              <Button size="sm" variant="outline" className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Call
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return grid;
};

export default Brokers;
