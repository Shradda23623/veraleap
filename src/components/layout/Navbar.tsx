import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, Home, Building, Users, LayoutDashboard, MessageCircle, LogOut, UserPlus, LogIn, User, Info, Phone, Shield, Search } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

const Navbar = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const lastScrollY = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      // Always show navbar if mobile menu is open
      if (mobileOpen) {
        setShowNavbar(true);
        return;
      }
      // Hide if scrolling down past a threshold, show if scrolling up
      if (currentScrollY > 100 && currentScrollY > lastScrollY.current) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMobileOpen(false);
  };

  const mainLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/properties", label: "Properties", icon: Building },
    { to: "/brokers", label: "Brokers", icon: Users },
    { to: "/about", label: "About", icon: Info },
    { to: "/contact", label: "Contact", icon: Phone },
  ];

  const userLinks = isLoggedIn
    ? [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/chat", label: "Chat", icon: MessageCircle },
        { to: "/profile", label: "Profile", icon: User },
        ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
      ]
    : [];

  const [searchQuery, setSearchQuery] = useState("");
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/properties?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileOpen(false);
    }
  };

  return (
    <header className={`sticky top-0 z-50 bg-card backdrop-blur-md border-b border-border shadow-elevated transition-transform duration-300 ease-in-out ${showNavbar ? 'translate-y-0' : '-translate-y-full'}`}>
      <nav className="container mx-auto flex justify-between items-center gap-3 px-4 py-2">
        <Link to="/" className="flex items-center flex-shrink-0">
          <img src={logoImg} alt="VeraLeap" className="h-12 md:h-14 w-auto object-contain drop-shadow-md" />
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden xl:flex items-center gap-1 flex-1 justify-end min-w-0">
          {mainLinks.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to}
                className="flex items-center gap-1 px-2 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Icon className="w-3.5 h-3.5" /> {label}
              </Link>
            </li>
          ))}
          {userLinks.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to}
                className="flex items-center gap-1 px-2 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Icon className="w-3.5 h-3.5" /> {label}
              </Link>
            </li>
          ))}
          <li>
            <form onSubmit={handleSearch} className="flex items-center gap-1 bg-muted rounded-lg px-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..." className="bg-transparent py-1.5 px-1 text-sm outline-none w-24 placeholder:text-muted-foreground" />
            </form>
          </li>
          <li><ThemeToggle /></li>
          {isLoggedIn && <li><NotificationBell /></li>}
          {isLoggedIn ? (
            <li className="ml-1 flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold capitalize">{user?.role}</span>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </li>
          ) : (
            <li className="ml-1 flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm"><LogIn className="w-4 h-4 mr-1" /> Login</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-gradient-hero text-primary-foreground border-0 hover:opacity-90">
                  <UserPlus className="w-4 h-4 mr-1" /> Sign Up
                </Button>
              </Link>
            </li>
          )}
        </ul>

        {/* Mobile Toggle (shown below xl) */}
        <div className="xl:hidden flex items-center gap-1">
          <ThemeToggle />
          {isLoggedIn && <NotificationBell />}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted" aria-label="Toggle menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="xl:hidden bg-card border-b border-border px-4 pb-4 space-y-1">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search properties..." className="bg-transparent flex-1 text-sm outline-none placeholder:text-muted-foreground" />
          </form>
          {[...mainLinks, ...userLinks].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
              <Icon className="w-4 h-4" /> {label}
            </Link>
          ))}
          {isLoggedIn ? (
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                <Button variant="outline" className="w-full" size="sm">Login</Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1">
                <Button className="w-full bg-gradient-hero text-primary-foreground border-0" size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
