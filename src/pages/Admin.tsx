import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Users, Building, BadgeCheck, Star, BarChart3, Shield, Trash2, CheckCircle, XCircle, Mail, Eye, Flag } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import MfaGuard from "@/components/MfaGuard";

const AdminInner = () => {
  useSEO({ title: "Admin panel", description: "Moderate users, properties, reviews and reports on VeraLeap." });
  const { user, isLoggedIn, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "properties" | "reviews" | "reports" | "inquiries">("overview");

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
  });

  const { data: allProperties = [] } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: contactSubmissions = [] } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const { data } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: allReports = [] } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (loading) return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (!isLoggedIn || !user) return <Navigate to="/login" />;
  if (user.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only administrators can access this page.</p>
      </div>
    );
  }

  const roleMap = new Map(allRoles.map(r => [r.user_id, r.role]));
  const verifiedProperties = allProperties.filter(p => p.verified).length;
  const pendingProperties = allProperties.filter(p => !p.verified).length;

  const toggleVerifyProperty = async (propertyId: string, currentVerified: boolean) => {
    const { error } = await supabase.from("properties").update({ verified: !currentVerified }).eq("id", propertyId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: currentVerified ? "Property unverified" : "Property verified!" });
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    }
  };

  const toggleVerifyUser = async (userId: string, currentVerified: boolean) => {
    const { error } = await supabase.from("profiles").update({ verified: !currentVerified }).eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: currentVerified ? "User unverified" : "User verified!" });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    }
  };

  const deleteReview = async (reviewId: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    }
  };

  const updateReportStatus = async (reportId: string, status: "resolved" | "dismissed") => {
    const { error } = await supabase.from("reports").update({
      status,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", reportId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Report marked ${status}` });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    }
  };

  const deleteReport = async (reportId: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Report deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    }
  };

  const pendingReportCount = allReports.filter(r => r.status === "pending").length;
  const tabs = [
    { key: "overview" as const, label: "Overview", icon: BarChart3 },
    { key: "users" as const, label: "Users", icon: Users },
    { key: "properties" as const, label: "Properties", icon: Building },
    { key: "reviews" as const, label: "Reviews", icon: Star },
    { key: "reports" as const, label: `Reports${pendingReportCount > 0 ? ` (${pendingReportCount})` : ""}`, icon: Flag },
    { key: "inquiries" as const, label: "Inquiries", icon: Mail },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-display font-bold">Admin <span className="text-gradient-hero">Panel</span></h1>
          <p className="text-muted-foreground text-sm">Manage users, properties, and platform content</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? "bg-card shadow-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: allProfiles.length, icon: Users, color: "bg-primary" },
              { label: "Total Properties", value: allProperties.length, icon: Building, color: "bg-accent" },
              { label: "Verified Properties", value: verifiedProperties, icon: BadgeCheck, color: "bg-secondary" },
              { label: "Total Reviews", value: allReviews.length, icon: Star, color: "bg-primary" },
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-display font-bold text-lg mb-4">Users by Role</h3>
              <div className="space-y-3">
                {["tenant", "broker", "owner", "admin"].map(role => {
                  const count = allRoles.filter(r => r.role === role).length;
                  return (
                    <div key={role} className="flex items-center justify-between">
                      <span className="capitalize text-sm font-medium">{role}s</span>
                      <span className="text-sm px-3 py-1 rounded-full bg-muted font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-display font-bold text-lg mb-4">Property Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4 text-secondary" /> Verified</span>
                  <span className="text-sm px-3 py-1 rounded-full bg-secondary/10 text-secondary font-semibold">{verifiedProperties}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> Pending</span>
                  <span className="text-sm px-3 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">{pendingProperties}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === "users" && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-semibold">User</th>
                <th className="text-left p-4 font-semibold">City</th>
                <th className="text-left p-4 font-semibold">Role</th>
                <th className="text-left p-4 font-semibold">Verified</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr></thead>
              <tbody>
                {allProfiles.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {p.username.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{p.username}</p>
                          <p className="text-xs text-muted-foreground">{p.phone || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{p.city || "—"}</td>
                    <td className="p-4"><span className="capitalize text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">{roleMap.get(p.user_id) || "tenant"}</span></td>
                    <td className="p-4">
                      {p.verified ? <BadgeCheck className="w-5 h-5 text-secondary" /> : <XCircle className="w-5 h-5 text-muted-foreground" />}
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant={p.verified ? "outline" : "default"} onClick={() => toggleVerifyUser(p.user_id, p.verified)}
                        className={!p.verified ? "bg-gradient-hero text-primary-foreground border-0" : ""}>
                        {p.verified ? "Unverify" : "Verify"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Properties */}
      {activeTab === "properties" && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-semibold">Property</th>
                <th className="text-left p-4 font-semibold">City</th>
                <th className="text-left p-4 font-semibold">Price</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr></thead>
              <tbody>
                {allProperties.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">N/A</div>
                        )}
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.type} • {p.bedrooms}BHK</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{p.city}</td>
                    <td className="p-4 font-semibold">₹{p.price.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${p.verified ? "bg-secondary/10 text-secondary" : "bg-destructive/10 text-destructive"}`}>
                        {p.verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant={p.verified ? "outline" : "default"} onClick={() => toggleVerifyProperty(p.id, p.verified)}
                        className={!p.verified ? "bg-gradient-hero text-primary-foreground border-0" : ""}>
                        {p.verified ? "Unverify" : "Verify"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews */}
      {activeTab === "reviews" && (
        <div className="space-y-3">
          {allReviews.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No reviews yet</div>
          ) : (
            allReviews.map(r => (
              <div key={r.id} className="bg-card rounded-xl p-4 shadow-card flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-secondary text-secondary" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.comment || "No comment"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Type: {r.target_type}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => deleteReview(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reports */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          {allReports.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No reports yet</div>
          ) : (
            allReports.map(r => {
              const targetHref = r.target_type === "property" ? `/properties/${r.target_id}` : r.target_type === "broker" ? `/brokers?highlight=${r.target_id}` : null;
              const statusBadge = r.status === "pending"
                ? "bg-destructive/10 text-destructive"
                : r.status === "resolved"
                  ? "bg-secondary/10 text-secondary"
                  : "bg-muted text-muted-foreground";
              return (
                <div key={r.id} className="bg-card rounded-xl p-5 shadow-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{r.target_type}</span>
                        <span className={`capitalize text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge}`}>{r.status}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-semibold mb-1">{r.reason}</p>
                      {r.details && <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{r.details}</p>}
                      <p className="text-xs text-muted-foreground">
                        Target ID: <span className="font-mono">{r.target_id}</span>
                        {targetHref && <Link to={targetHref} className="ml-2 text-primary hover:underline">View</Link>}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => updateReportStatus(r.id, "resolved")} className="bg-gradient-hero text-primary-foreground border-0">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateReportStatus(r.id, "dismissed")}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Dismiss
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => deleteReport(r.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Inquiries */}
      {activeTab === "inquiries" && (
        <div className="space-y-3">
          {contactSubmissions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No inquiries yet</div>
          ) : (
            contactSubmissions.map(c => (
              <div key={c.id} className={`bg-card rounded-xl p-5 shadow-card ${!c.read ? "border-l-4 border-primary" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{c.name}</p>
                      <span className="text-xs text-muted-foreground">({c.email})</span>
                      {!c.read && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">New</span>}
                    </div>
                    <p className="text-sm font-medium mb-1">{c.subject}</p>
                    <p className="text-sm text-muted-foreground">{c.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {!c.read && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        await supabase.from("contact_submissions").update({ read: true }).eq("id", c.id);
                        queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
                      }}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Read
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={async () => {
                      await supabase.from("contact_submissions").delete().eq("id", c.id);
                      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
                      toast({ title: "Inquiry deleted" });
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const Admin = () => (
  <MfaGuard required>
    <AdminInner />
  </MfaGuard>
);

export default Admin;
