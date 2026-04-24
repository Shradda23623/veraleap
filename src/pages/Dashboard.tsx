import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Home, Building, Users, Star, MessageCircle, Plus, Pencil, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSEO } from "@/hooks/useSEO";
import { useToast } from "@/hooks/use-toast";

const TenantDashboard = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: favorites } = useQuery({
    queryKey: ["favorites-list", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id, property_id, properties(id, title, city, price, image_url)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
  const favCount = favorites?.length ?? 0;

  const { data: visits } = useQuery({
    queryKey: ["tenant-visits", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("visits")
        .select("id, property_id, requested_at, status, properties(title, city)")
        .eq("tenant_id", userId)
        .order("requested_at", { ascending: false });
      return data || [];
    },
  });

  const cancelVisit = async (id: string) => {
    const { error } = await supabase.from("visits").update({ status: "cancelled", decided_at: new Date().toISOString(), decided_by: userId }).eq("id", id);
    if (error) {
      toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visit cancelled" });
      queryClient.invalidateQueries({ queryKey: ["tenant-visits", userId] });
    }
  };

  const { data: chatCount } = useQuery({
    queryKey: ["chat-count", userId],
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("sender_id, receiver_id").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      if (!data?.length) return 0;
      const contacts = new Set<string>();
      data.forEach(m => { if (m.sender_id !== userId) contacts.add(m.sender_id); if (m.receiver_id !== userId) contacts.add(m.receiver_id); });
      return contacts.size;
    },
  });

  const { data: reviewCount } = useQuery({
    queryKey: ["review-count", userId],
    queryFn: async () => {
      const { count } = await supabase.from("reviews").select("*", { count: "exact", head: true }).eq("reviewer_id", userId);
      return count || 0;
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Saved Properties", value: String(favCount ?? 0), icon: Home, color: "bg-primary" },
          { label: "Active Chats", value: String(chatCount ?? 0), icon: MessageCircle, color: "bg-accent" },
          { label: "Reviews Given", value: String(reviewCount ?? 0), icon: Star, color: "bg-secondary" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-card flex items-center gap-4">
            <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center`}>
              <s.icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="font-display font-bold text-lg mb-4">Saved Properties</h3>
        {favorites && favorites.length > 0 ? (
          <div className="space-y-3">
            {favorites.map(f => {
              const p = f.properties as { id: string; title: string; city: string; price: number; image_url: string | null } | null;
              if (!p) return null;
              return (
                <Link key={f.id} to={`/properties/${p.id}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  {p.image_url && <img src={p.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.city} • ₹{p.price.toLocaleString()}/mo</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No saved properties yet. Tap the heart on any listing to save it here.</p>
        )}
      </div>

      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="font-display font-bold text-lg mb-4">My Visits</h3>
        {visits && visits.length > 0 ? (
          <div className="space-y-3">
            {visits.map(v => {
              const p = v.properties as { title: string; city: string } | null;
              const statusIcon = v.status === "approved" ? CheckCircle2 : v.status === "declined" || v.status === "cancelled" ? XCircle : Clock;
              const StatusIcon = statusIcon;
              const statusColor = v.status === "approved" ? "text-primary" : v.status === "declined" || v.status === "cancelled" ? "text-destructive" : "text-muted-foreground";
              return (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Link to={`/properties/${v.property_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p?.title ?? "Property"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.requested_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </Link>
                  <span className={`text-xs font-semibold capitalize inline-flex items-center gap-1 ${statusColor}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {v.status}
                  </span>
                  {v.status === "pending" && (
                    <Button size="sm" variant="ghost" onClick={() => cancelVisit(v.id)} className="text-destructive hover:text-destructive">Cancel</Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No visit requests yet. Request a tour from any property listing.</p>
        )}
      </div>

      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="font-display font-bold text-lg mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/properties"><Button variant="outline"><Home className="w-4 h-4 mr-2" />Browse Properties</Button></Link>
          <Link to="/brokers"><Button variant="outline"><Users className="w-4 h-4 mr-2" />Find Brokers</Button></Link>
          <Link to="/chat"><Button className="bg-gradient-hero text-primary-foreground border-0"><MessageCircle className="w-4 h-4 mr-2" />Messages</Button></Link>
        </div>
      </div>
    </div>
  );
};

const HostVisitRequests = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: visits } = useQuery({
    queryKey: ["host-visits", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("visits")
        .select("id, property_id, requested_at, status, message, tenant_id, properties(title)")
        .eq("host_id", userId)
        .order("requested_at", { ascending: false });
      return data || [];
    },
  });

  const decide = async (id: string, status: "approved" | "declined") => {
    const { error } = await supabase
      .from("visits")
      .update({ status, decided_at: new Date().toISOString(), decided_by: userId })
      .eq("id", id);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "Visit approved" : "Visit declined" });
      queryClient.invalidateQueries({ queryKey: ["host-visits", userId] });
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card">
      <h3 className="font-display font-bold text-lg mb-4">Visit Requests</h3>
      {visits && visits.length > 0 ? (
        <div className="space-y-3">
          {visits.map(v => {
            const p = v.properties as { title: string } | null;
            return (
              <div key={v.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/properties/${v.property_id}`} className="text-sm font-semibold truncate hover:underline block">{p?.title ?? "Property"}</Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.requested_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    {v.message && <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{v.message}&rdquo;</p>}
                  </div>
                  <span className={`text-xs font-semibold capitalize ${v.status === "approved" ? "text-primary" : v.status === "declined" || v.status === "cancelled" ? "text-destructive" : "text-muted-foreground"}`}>
                    {v.status}
                  </span>
                </div>
                {v.status === "pending" && (
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => decide(v.id, "declined")}>Decline</Button>
                    <Button size="sm" className="bg-gradient-hero text-primary-foreground border-0" onClick={() => decide(v.id, "approved")}>Approve</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No visit requests yet.</p>
      )}
    </div>
  );
};

const BrokerDashboard = ({ userId }: { userId: string }) => {
  const { data: listings } = useQuery({
    queryKey: ["broker-listings", userId],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").eq("broker_id", userId);
      return data || [];
    },
  });

  const { data: chatCount } = useQuery({
    queryKey: ["broker-chat-count", userId],
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("sender_id, receiver_id").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      if (!data?.length) return 0;
      const contacts = new Set<string>();
      data.forEach(m => { if (m.sender_id !== userId) contacts.add(m.sender_id); if (m.receiver_id !== userId) contacts.add(m.receiver_id); });
      return contacts.size;
    },
  });

  const { data: avgRating } = useQuery({
    queryKey: ["broker-avg-rating", userId],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("rating").eq("target_type", "broker").eq("target_id", userId);
      if (!data?.length) return 0;
      return (data.reduce((a, r) => a + r.rating, 0) / data.length).toFixed(1);
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Listings", value: String(listings?.length ?? 0), icon: Building, color: "bg-primary" },
          { label: "Client Chats", value: String(chatCount ?? 0), icon: MessageCircle, color: "bg-accent" },
          { label: "Avg Rating", value: avgRating ? String(avgRating) : "—", icon: Star, color: "bg-secondary" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-card flex items-center gap-4">
            <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center`}>
              <s.icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="font-display font-bold text-lg mb-4">My Listings</h3>
        {listings && listings.length > 0 ? (
          <div className="space-y-3">
            {listings.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <Link to={`/properties/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {p.image_url && <img src={p.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.city} • ₹{p.price.toLocaleString()}/mo</p>
                  </div>
                </Link>
                <Link to={`/edit-property/${p.id}`}>
                  <Button size="sm" variant="ghost"><Pencil className="w-3.5 h-3.5" /></Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No listings yet. Properties assigned to you will appear here.</p>
        )}
      </div>
      <HostVisitRequests userId={userId} />
    </div>
  );
};

const OwnerDashboard = ({ userId }: { userId: string }) => {
  const { data: properties } = useQuery({
    queryKey: ["owner-properties", userId],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").eq("owner_id", userId);
      return data || [];
    },
  });

  const { data: enquiryCount } = useQuery({
    queryKey: ["owner-enquiries", userId],
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("sender_id, receiver_id").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      if (!data?.length) return 0;
      const contacts = new Set<string>();
      data.forEach(m => { if (m.sender_id !== userId) contacts.add(m.sender_id); if (m.receiver_id !== userId) contacts.add(m.receiver_id); });
      return contacts.size;
    },
  });

  const { data: reviewCount } = useQuery({
    queryKey: ["owner-review-count", userId],
    queryFn: async () => {
      // Count reviews on properties owned by this user
      if (!properties?.length) return 0;
      const propIds = properties.map(p => p.id);
      const { count } = await supabase.from("reviews").select("*", { count: "exact", head: true }).eq("target_type", "property").in("target_id", propIds);
      return count || 0;
    },
    enabled: !!properties?.length,
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "My Properties", value: String(properties?.length ?? 0), icon: Building, color: "bg-primary" },
          { label: "Enquiries", value: String(enquiryCount ?? 0), icon: MessageCircle, color: "bg-accent" },
          { label: "Property Reviews", value: String(reviewCount ?? 0), icon: Star, color: "bg-secondary" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-card flex items-center gap-4">
            <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center`}>
              <s.icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg">My Properties</h3>
          <Link to="/add-property"><Button size="sm" className="bg-gradient-hero text-primary-foreground border-0"><Plus className="w-4 h-4 mr-1" />Add Property</Button></Link>
        </div>
        {properties && properties.length > 0 ? (
          <div className="space-y-3">
              {properties.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  <Link to={`/properties/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    {p.image_url && <img src={p.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.city} • ₹{p.price.toLocaleString()}/mo</p>
                    </div>
                  </Link>
                  <Link to={`/edit-property/${p.id}`}>
                    <Button size="sm" variant="ghost"><Pencil className="w-3.5 h-3.5" /></Button>
                  </Link>
                  <span className={`text-xs px-2 py-1 rounded-full ${p.verified ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {p.verified ? "Verified" : "Pending"}
                  </span>
                </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No properties yet. Add your first property listing!</p>
        )}
      </div>
      <HostVisitRequests userId={userId} />
    </div>
  );
};

const Dashboard = () => {
  useSEO({ title: "Your dashboard", description: "Manage your rentals, listings, messages and reviews on VeraLeap." });
  const { user, isLoggedIn, loading } = useAuth();

  if (loading) return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
  if (!isLoggedIn || !user) return <Navigate to="/login" />;

  const displayName = user.profile?.username || user.email;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">
            {user.role === "tenant" && "Tenant "}
            {user.role === "broker" && "Broker "}
            {user.role === "owner" && "Owner "}
            <span className="text-gradient-hero">Dashboard</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back, {displayName}!</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold capitalize">{user.role}</span>
      </div>

      {user.role === "tenant" && <TenantDashboard userId={user.id} />}
      {user.role === "broker" && <BrokerDashboard userId={user.id} />}
      {user.role === "owner" && <OwnerDashboard userId={user.id} />}
    </div>
  );
};

export default Dashboard;
