import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { MapPin, BadgeCheck, Bed, Bath, Maximize, Filter, Map as MapIcon, List, LayoutGrid, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import FavoriteButton from "@/components/FavoriteButton";
import MapView, { type MapItem } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";
import { AMENITY_OPTIONS } from "@/lib/amenities";

const CITIES_LIST = ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai", "Kolkata", "Jaipur", "Chandigarh", "Jalandhar"];

const Properties = () => {
  useSEO({ title: "Browse verified rentals", description: "Search verified rental properties across India. Filter by city, price, bedrooms, and amenities." });
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") || "");
  const [selectedType, setSelectedType] = useState("");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [view, setView] = useState<"list" | "split" | "map">(() => {
    const v = searchParams.get("view");
    return v === "list" || v === "split" || v === "map" ? v : "split";
  });
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", selectedCity, selectedType, searchQuery, minPrice, maxPrice, minBedrooms, selectedAmenities],
    queryFn: async () => {
      let query = supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (selectedCity) query = query.eq("city", selectedCity);
      if (selectedType) query = query.eq("type", selectedType);
      if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      const min = Number(minPrice);
      const max = Number(maxPrice);
      if (!Number.isNaN(min) && min > 0) query = query.gte("price", min);
      if (!Number.isNaN(max) && max > 0) query = query.lte("price", max);
      const beds = Number(minBedrooms);
      if (!Number.isNaN(beds) && beds > 0) query = query.gte("bedrooms", beds);
      if (selectedAmenities.length > 0) query = query.contains("amenities", selectedAmenities);
      const { data } = await query;
      return data || [];
    },
  });

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    if (city) setSearchParams({ city }); else setSearchParams({});
  };

  const clearFilters = () => {
    setSelectedCity("");
    setSelectedType("");
    setSearchQuery("");
    setMinPrice("");
    setMaxPrice("");
    setMinBedrooms("");
    setSelectedAmenities([]);
    setSearchParams({});
  };

  const toggleAmenity = (a: string) => {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const activeFilterCount = [selectedCity, selectedType, searchQuery, minPrice, maxPrice, minBedrooms].filter(Boolean).length + selectedAmenities.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-2">Rental <span className="text-gradient-hero">Properties</span></h1>
      <p className="text-muted-foreground mb-8">Browse verified rental listings across India</p>

      <div className="mb-6 p-4 bg-card rounded-xl shadow-card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); const p = new URLSearchParams(searchParams); if (e.target.value) p.set("search", e.target.value); else p.delete("search"); setSearchParams(p); }}
            placeholder="Search by name or location..." className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none flex-1 min-w-[150px]" />
          <select value={selectedCity} onChange={e => handleCityChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none">
            <option value="">All Cities</option>
            {CITIES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none">
            <option value="">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
            <option value="studio">Studio</option>
            <option value="pg">PG</option>
            <option value="commercial">Commercial</option>
          </select>
          <button
            type="button"
            onClick={() => setShowAdvanced(a => !a)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${showAdvanced ? "border-primary bg-primary/10 text-primary" : "border-input bg-background hover:border-primary/40"}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            More filters
            {activeFilterCount > 0 && <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{activeFilterCount}</span>}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{properties.length} found</span>
            <div className="flex rounded-lg border border-input overflow-hidden">
              <button onClick={() => setView("list")} className={`p-2 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background"}`} title="List only" aria-label="List view"><List className="w-4 h-4" /></button>
              <button onClick={() => setView("split")} className={`p-2 ${view === "split" ? "bg-primary text-primary-foreground" : "bg-background"}`} title="Split" aria-label="Split view"><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => setView("map")} className={`p-2 ${view === "map" ? "bg-primary text-primary-foreground" : "bg-background"}`} title="Map only" aria-label="Map view"><MapIcon className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {showAdvanced && (
          <div className="pt-3 border-t border-border space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Min price (₹/mo)</label>
                <input type="number" min={0} value={minPrice} onChange={e => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Max price (₹/mo)</label>
                <input type="number" min={0} value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  placeholder="any"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Minimum bedrooms</label>
                <select value={minBedrooms} onChange={e => setMinBedrooms(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none">
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Amenities</label>
              <div className="flex flex-wrap gap-1.5">
                {AMENITY_OPTIONS.map(a => {
                  const active = selectedAmenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:border-primary/40"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <button type="button" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-card">
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-xl mb-2">No properties found</p>
          <p className="text-sm">Be the first to list a property, or try adjusting your filters.</p>
          {activeFilterCount > 0 && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              <X className="w-4 h-4 mr-1" /> Clear filters
            </Button>
          )}
        </div>
      ) : (
        <PropertiesContent properties={properties} view={view} selectedCity={selectedCity} />
      )}
    </div>
  );
};

const PropertiesContent = ({ properties, view, selectedCity }: { properties: any[]; view: "list" | "split" | "map"; selectedCity: string }) => {
  const mapItems: MapItem[] = useMemo(
    () =>
      properties.map((p) => ({
        id: p.id,
        title: p.title,
        city: p.city,
        location: p.location,
        image_url: p.image_url,
        price: p.price,
        href: `/properties/${p.id}`,
        variant: "property",
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    [properties]
  );

  const grid = (
    <div className={`grid gap-6 ${view === "split" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
      {properties.map((p) => (
        <Link key={p.id} to={`/properties/${p.id}`} className="group">
          <div className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all">
            <div className="relative h-48 overflow-hidden">
              {p.image_url ? (
                <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">No Image</div>
              )}
              {p.verified && (
                <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified
                </span>
              )}
              <span className="absolute top-3 right-12 bg-card/90 text-foreground text-xs font-semibold px-2 py-1 rounded-full capitalize">{p.type}</span>
              <FavoriteButton propertyId={p.id} size="sm" className="absolute top-2.5 right-2.5" />
            </div>
            <div className="p-4 space-y-3">
              <h3 className="font-semibold truncate">{p.title}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}, {p.city}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{p.bedrooms} BHK</span>
                <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{p.bathrooms}</span>
                <span className="flex items-center gap-1"><Maximize className="w-3.5 h-3.5" />{p.area} sqft</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary">₹{p.price.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );

  if (view === "list") return grid;
  if (view === "map") return <MapView items={mapItems} selectedCity={selectedCity} className="h-[70vh]" />;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="max-h-[80vh] overflow-y-auto pr-1">{grid}</div>
      <div className="lg:sticky lg:top-20 h-[60vh] lg:h-[80vh]">
        <MapView items={mapItems} selectedCity={selectedCity} className="h-full" />
      </div>
    </div>
  );
};

export default Properties;
