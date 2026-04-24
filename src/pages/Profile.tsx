import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Phone, MapPin, Shield, Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import TwoFactorEnrollment from "@/components/TwoFactorEnrollment";

const Profile = () => {
  useSEO({ title: "Your profile", description: "Update your VeraLeap profile, avatar, and verification details." });
  const { user, isLoggedIn, loading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    username: user?.profile?.username || user?.email || "",
    phone: user?.profile?.phone || "",
    location: user?.profile?.location || "",
    city: user?.profile?.city || "",
    bio: user?.profile?.bio || "",
  });
  const [saving, setSaving] = useState(false);

  if (loading) return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
      <Skeleton className="h-28 w-28 rounded-full" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
  if (!isLoggedIn || !user) return <Navigate to="/login" />;

  const displayName = user.profile?.username || user.email;
  const currentAvatar = avatarPreview || user.profile?.avatar_url;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl;

      const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      if (error) throw error;

      setAvatarPreview(avatarUrl);
      toast({ title: "Avatar updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: formData.username,
        phone: formData.phone,
        location: formData.location,
        city: formData.city,
        bio: formData.bio,
      })
      .eq("user_id", user.id);
    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold mb-2">My <span className="text-gradient-hero">Profile</span></h1>
        <p className="text-muted-foreground mb-8">Manage your account and preferences</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avatar Card */}
          <div className="bg-card rounded-2xl p-6 shadow-card text-center">
            <div className="relative inline-block mb-4">
              {currentAvatar ? (
                <img src={currentAvatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 bg-gradient-hero rounded-full flex items-center justify-center text-primary-foreground text-3xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center shadow-elevated hover:opacity-90 transition-opacity">
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            {uploadingAvatar && <p className="text-xs text-muted-foreground">Uploading...</p>}
            <h3 className="font-display font-bold text-lg">{displayName}</h3>
            <span className="inline-block mt-1 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold capitalize">{user.role}</span>
            {user.profile?.verified && (
              <div className="mt-4 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-secondary" />
                <span>Verified Account</span>
              </div>
            )}
          </div>

          {/* Edit Form */}
          <div className="md:col-span-2 bg-card rounded-2xl p-6 shadow-card">
            <h3 className="font-display font-bold text-lg mb-5">Account Details</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <User className="w-4 h-4 text-muted-foreground" /> Full Name
                </label>
                <input value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Email
                </label>
                <input value={user.email} disabled
                  className="w-full px-4 py-3 rounded-xl border border-input bg-muted text-sm text-muted-foreground" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Bio</label>
                <textarea value={formData.bio} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Tell us about yourself..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                    <Phone className="w-4 h-4 text-muted-foreground" /> Phone
                  </label>
                  <input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                    <MapPin className="w-4 h-4 text-muted-foreground" /> City
                  </label>
                  <input value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <MapPin className="w-4 h-4 text-muted-foreground" /> Location
                </label>
                <input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <Button type="submit" disabled={saving} className="bg-gradient-hero text-primary-foreground border-0">
                <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </div>
        </div>

        {(user.role === "broker" || user.role === "owner" || user.role === "admin") && (
          <div className="mt-6">
            <TwoFactorEnrollment />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Profile;
