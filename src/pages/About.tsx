import { motion } from "framer-motion";
import { Shield, Users, MapPin, Award, Heart, Zap } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const team = [
  { name: "Ravi Mehta", role: "Founder & CEO", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" },
  { name: "Priya Sharma", role: "CTO", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80" },
  { name: "Arjun Singh", role: "Head of Operations", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80" },
  { name: "Ananya Patel", role: "Lead Designer", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80" },
];

const values = [
  { icon: Shield, title: "Trust & Safety", desc: "Every listing and broker goes through our rigorous verification process." },
  { icon: Heart, title: "Renter First", desc: "We build for renters — transparency, fairness, and protection are non-negotiable." },
  { icon: Zap, title: "Innovation", desc: "AI-powered recommendations and real-time communication make renting effortless." },
];

const About = () => {
  useSEO({ title: "About us", description: "VeraLeap is on a mission to eliminate rental scams in India. Meet the team and learn how we verify listings and brokers." });
  return (
  <div className="min-h-screen">
    {/* Hero */}
    <section className="bg-gradient-hero py-20 text-primary-foreground">
      <div className="container mx-auto px-4 text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-bold mb-4">
          About <span className="text-secondary">VeraLeap</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-lg opacity-90 max-w-2xl mx-auto">
          India's most trusted rental platform. We're on a mission to eliminate scams,
          bring transparency, and make renting safe for everyone.
        </motion.p>
      </div>
    </section>

    {/* Mission */}
    <section className="container mx-auto px-4 py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl font-display font-bold mb-4">Our <span className="text-gradient-hero">Mission</span></h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            In India, finding a rental home can be a nightmare — fraudulent listings, fake brokers, and hidden costs.
            VeraLeap was born to change that.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We verify every property, validate every broker, and empower renters with real reviews and direct communication.
            No more middlemen games — just honest, transparent renting.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { value: "1,200+", label: "Verified Properties" },
              { value: "350+", label: "Trusted Brokers" },
              { value: "10+", label: "Cities" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-display font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="rounded-2xl overflow-hidden shadow-elevated">
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80" alt="Modern apartment"
            className="w-full h-80 object-cover" />
        </motion.div>
      </div>
    </section>

    {/* Values */}
    <section className="bg-muted/50 py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-display font-bold text-center mb-12">Our <span className="text-gradient-hero">Values</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-card hover:shadow-elevated transition-shadow">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-5">
                <v.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">{v.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Team */}
    <section className="container mx-auto px-4 py-20">
      <h2 className="text-3xl font-display font-bold text-center mb-12">Meet the <span className="text-gradient-hero">Team</span></h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {team.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }} viewport={{ once: true }}
            className="bg-card rounded-2xl p-6 shadow-card text-center hover:shadow-elevated transition-shadow">
            <img src={t.avatar} alt={t.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-primary/20" />
            <h3 className="font-semibold text-sm">{t.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t.role}</p>
          </motion.div>
        ))}
      </div>
    </section>
  </div>
  );
};

export default About;
