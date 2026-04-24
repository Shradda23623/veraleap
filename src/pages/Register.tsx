import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UserPlus, Home, Briefcase, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const ROLES: { value: UserRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "tenant", label: "Tenant", icon: Home, desc: "Looking to rent a property" },
  { value: "broker", label: "Broker", icon: Briefcase, desc: "Real estate professional" },
  { value: "owner", label: "Owner", icon: Key, desc: "Property owner / landlord" },
];

const Register = () => {
  useSEO({ title: "Create an account", description: "Join VeraLeap as a tenant, broker, or owner and start renting safely." });
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("tenant");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await register(username, email, password, role);
    setLoading(false);
    if (error) {
      toast({ title: "Registration failed", description: error, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Please check your email to verify your account." });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-elevated p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold">Create <span className="text-gradient-hero">Account</span></h1>
          <p className="text-muted-foreground text-sm mt-2">Join VeraLeap today</p>
        </div>

        <GoogleSignInButton label="Continue with Google" />
        <p className="text-[11px] text-center text-muted-foreground mt-2">You'll be signed up as a tenant — change your role later in Profile.</p>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or sign up with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">I am a...</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => setRole(r.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${role === r.value ? "border-primary bg-primary/5" : "border-input hover:border-muted-foreground/30"}`}>
                  <r.icon className={`w-5 h-5 mx-auto mb-1 ${role === r.value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-xs font-semibold">{r.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Min 6 characters" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-hero text-primary-foreground border-0 py-3">
            <UserPlus className="w-4 h-4 mr-2" /> {loading ? "Creating..." : "Create Account"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
