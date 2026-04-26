import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, BadgeCheck, Bed, Bath, Maximize, MessageCircle, ArrowLeft, Share2, Calendar, Shield, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import StarRating, { ReviewCard } from "@/components/StarRating";
import FavoriteButton from "@/components/FavoriteButton";
import ReviewForm from "@/components/ReviewForm";
import ReportButton from "@/components/ReportButton";
import PropertyImageGallery from "@/components/PropertyImageGallery";
import RequestVisitDialog from "@/components/RequestVisitDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";
import { useToast } from "@/hooks/use-toast";

const PropertyDetail = () => {
  const { id } = useParams();
  const { isLoggedIn, user } = useAuth();
  const { toast } = useToast();

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: galleryImages = [] } = useQuery({
    queryKey: ["property-images", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("property_images")
        .select("id, url, sort_order")
        .eq("property_id", id!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: ownerProfile } = useQuery({
    queryKey: ["owner-profile", property?.owner_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", property!.owner_id).single();
      return data;
    },
    enabled: !!property?.owner_id,
  });

  const { data: brokerProfile } = useQuery({
    queryKey: ["broker-profile", property?.broker_id],
    queryFn: async () => {
      if (!property?.broker_id) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", property.broker_id).single();
      return data;
    },
    enabled: !!property?.broker_id,
  });

  useSEO({
    title: property?.title,
    description: property ? `${property.bedrooms} BHK ${property.type} for rent in ${property.location}, ${property.city}. ₹${property.price.toLocaleString()}/month on VeraLeap.` : undefined,
    image: property?.image_url || undefined,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", "property", id],
    queryFn: async () => {
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*")
        .eq("target_type", "property")
        .eq("target_id", id!)
        .order("created_at", { ascending: false });

      if (!reviewsData?.length) return [];

      const reviewerIds = reviewsData.map(r => r.reviewer_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", reviewerIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return reviewsData.map(r => ({
        ...r,
        reviewer: profileMap.get(r.reviewer_id),
      }));
    },
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-[300px] md:h-[450px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
  if (!property) return <Navigate to="/properties" />;

  const avgRating = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const amenities: string[] = Array.isArray(property.amenities) ? property.amenities : [];
  const imageSources: string[] = galleryImages.length > 0
    ? galleryImages.map(g => g.url)
    : property.image_url ? [property.image_url] : [];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pt-6">
        <Link to="/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </Link>
      </div>

      <div className="container mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="relative h-[300px] md:h-[450px]">
            <PropertyImageGallery images={imageSources} alt={property.title} className="w-full h-full" />
            {property.verified && (
              <span className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4" /> Verified
              </span>
            )}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <FavoriteButton propertyId={property.id} />
              <button
                type="button"
                aria-label="Share listing"
                onClick={async () => {
                  const url = window.location.href;
                  if (navigator.share) {
                    try { await navigator.share({ title: property.title, url }); return; } catch { /* cancelled */ }
                  }
                  try {
                    await navigator.clipboard.writeText(url);
                    toast({ title: "Link copied", description: "Listing URL copied to your clipboard." });
                  } catch {
                    toast({ title: "Could not copy", description: "Please copy the URL from the address bar.", variant: "destructive" });
                  }
                }}
                className="w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
              >
                <Share2 className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">{property.title}</h1>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {property.location}, {property.city}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-3xl font-display font-bold text-primary">₹{property.price.toLocaleString()}</span>
              <span className="text-muted-foreground">/month</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Bed, label: "Bedrooms", value: `${property.bedrooms} BHK` },
                { icon: Bath, label: "Bathrooms", value: `${property.bathrooms}` },
                { icon: Maximize, label: "Area", value: `${property.area} sqft` },
              ].map(d => (
                <div key={d.label} className="bg-card rounded-xl p-4 shadow-card text-center">
                  <d.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-lg font-bold">{d.value}</p>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                </div>
              ))}
            </div>

            {property.description && (
              <div className="bg-card rounded-xl p-6 shadow-card">
                <h2 className="font-display font-bold text-lg mb-3">About this property</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>
              </div>
            )}

            <div className="bg-card rounded-xl p-6 shadow-card">
              <h2 className="font-display font-bold text-lg mb-4">Location</h2>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{property.location}</p>
                  <p className="text-sm text-muted-foreground">{property.city}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Exact address shared after visit approval to keep listings safe.
                  </p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([property.location, property.city].filter(Boolean).join(", "))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
                </Button>
              </a>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card">
              <h2 className="font-display font-bold text-lg mb-4">Amenities</h2>
              {amenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {amenities.map(a => (
                    <div key={a} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No amenities listed for this property.</p>
              )}
            </div>

            {/* Reviews */}
            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">Reviews ({reviews.length})</h2>
                {avgRating > 0 && <StarRating rating={avgRating} />}
              </div>
              <ReviewForm targetId={property.id} targetType="property" />
              {reviews.length > 0 ? (
                <div className="space-y-3 mt-4">
                  {reviews.map(r => (
                    <ReviewCard key={r.id} review={{
                      id: r.id,
                      userName: r.reviewer?.username || "Anonymous",
                      rating: r.rating,
                      comment: r.comment || "",
                      date: new Date(r.created_at).toLocaleDateString(),
                      avatar: r.reviewer?.avatar_url || "",
                    }} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-4">No reviews yet. Be the first to review!</p>
              )}
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-5">
            {ownerProfile && (
              <div className="bg-card rounded-xl p-6 shadow-card">
                <h3 className="font-display font-bold mb-4">Owner</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">{ownerProfile.username.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{ownerProfile.username}</p>
                    <p className="text-xs text-muted-foreground">Property Owner</p>
                  </div>
                </div>
              </div>
            )}

            {brokerProfile && (
              <div className="bg-card rounded-xl p-6 shadow-card">
                <h3 className="font-display font-bold mb-4">Listed by Broker</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                    <span className="text-accent font-bold text-lg">{brokerProfile.username.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold">{brokerProfile.username}</p>
                      {brokerProfile.verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{brokerProfile.city || "Broker"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isLoggedIn ? (
                    <Link to={`/chat?to=${brokerProfile.user_id}&name=${brokerProfile.username}`} className="flex-1">
                      <Button className="w-full bg-gradient-hero text-primary-foreground border-0">
                        <MessageCircle className="w-4 h-4 mr-2" /> Chat
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/login" className="flex-1">
                      <Button variant="outline" className="w-full">Login to Chat</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gradient-hero rounded-xl p-6 text-primary-foreground">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-8 h-8" />
                <h3 className="font-display font-bold text-lg">VeraLeap Verified</h3>
              </div>
              <ul className="space-y-2 text-sm opacity-90">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Owner identity verified</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Property documents checked</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Fair pricing confirmed</li>
              </ul>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-display font-bold mb-3">Schedule a Visit</h3>
              <p className="text-sm text-muted-foreground mb-4">Propose a date and time — the host gets notified and can approve or suggest another slot.</p>
              {isLoggedIn && (property.broker_id || property.owner_id) ? (
                <RequestVisitDialog
                  propertyId={property.id}
                  hostId={property.broker_id || property.owner_id}
                  propertyTitle={property.title}
                />
              ) : (
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" /> Sign in to request a visit
                  </Button>
                </Link>
              )}
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card">
              <h3 className="font-display font-bold mb-2">See something off?</h3>
              <p className="text-sm text-muted-foreground mb-3">Suspicious pricing, fake photos, or broken details? Let our moderation team know.</p>
              <ReportButton targetType="property" targetId={property.id} variant="outline" size="default" label="Report this listing" className="w-full" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
