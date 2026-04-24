import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Shield, FileCheck, MapPin, Star, BadgeCheck, ArrowRight, Quote, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSEO } from "@/hooks/useSEO";
import HomeHeroSearch from "@/components/HomeHeroSearch";

const Index = () => {
  useSEO({ title: "Find verified rentals in India", description: "Verify rental listings, check landlord credibility, and connect with trusted brokers. VeraLeap helps you rent safely across India." });

  const { data: featuredProperties = [] } = useQuery({
    queryKey: ["featured-properties"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").eq("verified", true).limit(4).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: recentReviews = [] } = useQuery({
    queryKey: ["recent-reviews"],
    queryFn: async () => {
      const { data: reviews } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(3);
      if (!reviews?.length) return [];
      const reviewerIds = reviews.map(r => r.reviewer_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", reviewerIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      return reviews.map(r => ({ ...r, reviewer: profileMap.get(r.reviewer_id) }));
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const { count: propCount } = await supabase.from("properties").select("*", { count: "exact", head: true });
      const { count: brokerCount } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "broker");
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return { properties: propCount || 0, brokers: brokerCount || 0, users: userCount || 0 };
    },
  });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[600px] md:min-h-[700px]">
        <div className="absolute inset-0">
          {[
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1500&q=80",
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1500&q=80",
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1500&q=80",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1500&q=80",
          ].map((src, i) => (
            <img key={i} src={src} alt="" className="absolute inset-0 w-full h-full object-cover"
              style={{ animation: `heroSlide 24s ${i * 6}s infinite`, opacity: 0 }} />
          ))}
          <div className="absolute inset-0 bg-gradient-hero opacity-75" />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-20 md:py-32 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-primary-foreground mb-6 leading-tight">
            Rent with <br className="hidden sm:block" />
            <span className="text-secondary">Confidence.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
            Verified properties, trusted brokers, real reviews. Select your city and find your perfect rental home.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          >
            <HomeHeroSearch />
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
          How It <span className="text-gradient-hero">Works</span>
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">Three simple steps to a safe rental experience.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Search, title: "Search & Filter", desc: "Browse verified properties by city, type, and budget. Read real reviews.", color: "bg-primary" },
            { icon: Shield, title: "We Verify", desc: "Every listing and broker is checked for authenticity and credibility.", color: "bg-accent" },
            { icon: FileCheck, title: "Connect & Rent", desc: "Chat directly with brokers and owners. Rent with confidence.", color: "bg-secondary" },
          ].map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div key={title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }} viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-card hover:shadow-elevated transition-shadow group">
              <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <Icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Properties */}
      {featuredProperties.length > 0 && (
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-display font-bold">Featured <span className="text-gradient-hero">Properties</span></h2>
                <p className="text-muted-foreground mt-1">Verified listings from trusted owners</p>
              </div>
              <Link to="/properties">
                <Button variant="outline" size="sm">View All <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProperties.map(p => (
                <Link key={p.id} to={`/properties/${p.id}`} className="group">
                  <div className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all">
                    <div className="relative h-48 overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">No Image</div>
                      )}
                      <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{p.location}, {p.city}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold text-primary">₹{p.price.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="bg-gradient-hero py-16">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-primary-foreground">
          {[
            { label: "Verified Properties", value: stats?.properties || 0 },
            { label: "Trusted Brokers", value: stats?.brokers || 0 },
            { label: "Registered Users", value: stats?.users || 0 },
            { label: "Cities Covered", value: "10+" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-display font-bold">{s.value}</p>
              <p className="text-sm opacity-80 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      {recentReviews.length > 0 && (
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            What Renters <span className="text-gradient-hero">Say</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">Real reviews from real people.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentReviews.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow relative">
                <Quote className="w-8 h-8 text-primary/15 absolute top-4 right-4" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {(r.reviewer?.username || "A").charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{r.reviewer?.username || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }, (_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < r.rating ? "fill-secondary text-secondary" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container mx-auto px-4 py-10 mb-10">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-gradient-hero rounded-3xl p-10 md:p-16 text-center text-primary-foreground">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to Find Your Perfect Home?</h2>
          <p className="text-lg opacity-90 max-w-xl mx-auto mb-8">Join VeraLeap and find verified, safe rentals.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-secondary text-secondary-foreground border-0 hover:bg-secondary/90 text-base px-8">
                <UserPlus className="w-5 h-5 mr-2" /> Get Started Free
              </Button>
            </Link>
            <Link to="/properties">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8">
                Browse Properties
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
