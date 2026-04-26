import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad",
  "Chennai", "Kolkata", "Jaipur", "Chandigarh", "Jalandhar",
  "Gurgaon", "Noida", "Goa", "Manali",
];

/**
 * Hero search bar for the landing page.
 * - City dropdown (renters pick from a curated India city list).
 * - Optional area / landmark text input that filters by name.
 * - Submit redirects to /properties with query params.
 */
const HomeHeroSearch = () => {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    const q = search.trim();
    if (q) params.set("search", q);
    navigate(`/properties${params.size ? `?${params}` : ""}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-card/95 backdrop-blur-md p-3 rounded-2xl shadow-elevated flex flex-col sm:flex-row gap-2"
      >
        <div className="flex items-center gap-2 flex-1 px-3 border-b sm:border-b-0 sm:border-r border-border pb-2 sm:pb-0">
          <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-transparent py-3 text-foreground outline-none text-sm"
            aria-label="City"
          >
            <option value="">All cities</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 px-3">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Area, landmark, or property name"
            className="w-full bg-transparent py-3 text-foreground outline-none text-sm placeholder:text-muted-foreground"
            aria-label="Search by area or property name"
          />
        </div>
        <Button
          type="submit"
          className="bg-gradient-warm text-primary-foreground px-8 rounded-xl border-0 hover:opacity-90"
        >
          <Search className="w-4 h-4 mr-2" /> Search
        </Button>
      </form>
      <p className="mt-3 text-xs text-primary-foreground/80 text-center">
        Browse verified rentals across {CITIES.length} Indian cities.
      </p>
    </div>
  );
};

export default HomeHeroSearch;
