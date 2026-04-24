import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CITY_COORDS, INDIA_CENTER, coordsForCity } from "@/lib/cityCoords";

const FALLBACK_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad",
  "Chennai", "Kolkata", "Jaipur", "Chandigarh", "Jalandhar",
];

/**
 * Hero search bar for the landing page.
 * - Google Places autocomplete input (city / area / landmark, India only).
 * - Live mini-map directly underneath that drops a pin on the picked place
 *   and shows nearby property pins pulled from Supabase.
 * - Degrades to a plain dropdown when no Maps API key is configured.
 */
const HomeHeroSearch = () => {
  const { data: apiKey } = useGoogleMapsKey();

  if (!apiKey) return <HeroSearchFallback />;

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      <HeroSearchAutocomplete />
    </APIProvider>
  );
};

type Picked = {
  city?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

const HeroSearchAutocomplete = () => {
  const navigate = useNavigate();
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);

  // Properties we can pin on the mini-map.
  const { data: nearby = [] } = useQuery({
    queryKey: ["hero-nearby-properties", picked?.city ?? null],
    queryFn: async () => {
      const base = supabase
        .from("properties")
        .select("id, title, city, latitude, longitude")
        .order("created_at", { ascending: false })
        .limit(40);
      const { data } = picked?.city
        ? await base.ilike("city", `%${picked.city}%`)
        : await base;
      return data || [];
    },
  });

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "in" },
      fields: ["address_components", "formatted_address", "name", "geometry"],
    });
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      let city: string | undefined;
      for (const comp of place.address_components ?? []) {
        if (comp.types.includes("locality")) {
          city = comp.long_name;
          break;
        }
        if (!city && comp.types.includes("administrative_area_level_2")) {
          city = comp.long_name;
        }
      }
      setPicked({
        city,
        address: place.formatted_address ?? place.name ?? "",
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
      });
      setQuery(place.formatted_address ?? place.name ?? "");
    });
    return () => listener.remove();
  }, [places]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (picked?.city) params.set("city", picked.city);
    const text = (picked?.address ?? query).trim();
    if (text) params.set("search", text);
    navigate(`/properties${params.size ? `?${params}` : ""}`);
  };

  // Where to center the mini-map.
  const mapCenter = useMemo(() => {
    if (picked?.lat != null && picked?.lng != null) {
      return { lat: picked.lat, lng: picked.lng };
    }
    if (picked?.city && CITY_COORDS[picked.city]) return CITY_COORDS[picked.city];
    return INDIA_CENTER;
  }, [picked]);
  const mapZoom = picked?.lat != null ? 13 : picked?.city ? 11 : 5;

  const pins = useMemo(
    () =>
      nearby.map((p) => {
        const hasExact =
          typeof p.latitude === "number" && typeof p.longitude === "number";
        return {
          id: p.id,
          title: p.title,
          pos: hasExact
            ? { lat: p.latitude as number, lng: p.longitude as number }
            : coordsForCity(p.city, p.id),
        };
      }),
    [nearby]
  );

  return (
    <div className="max-w-xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 bg-card/95 backdrop-blur-md p-2 rounded-2xl shadow-elevated"
      >
        <div className="flex items-center gap-2 flex-1 px-3">
          <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
            }}
            placeholder="Search city, area, or landmark..."
            className="w-full bg-transparent py-3 text-foreground outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
        <Button type="submit" className="bg-gradient-warm text-primary-foreground px-6 rounded-xl border-0 hover:opacity-90">
          <Search className="w-4 h-4 mr-2" /> Search
        </Button>
      </form>

      <div className="mt-3 rounded-2xl overflow-hidden shadow-elevated border border-border bg-card/95 backdrop-blur-md h-64 md:h-72">
        <Map
          mapId="veraleap-hero-map"
          defaultCenter={mapCenter}
          defaultZoom={mapZoom}
          gestureHandling="cooperative"
          disableDefaultUI
          style={{ width: "100%", height: "100%" }}
        >
          <Recenter center={mapCenter} zoom={mapZoom} />
          {picked?.lat != null && picked?.lng != null && (
            <AdvancedMarker position={{ lat: picked.lat, lng: picked.lng }}>
              <Pin background="hsl(32 95% 44%)" borderColor="white" glyphColor="white" />
            </AdvancedMarker>
          )}
          {pins.map((p) => (
            <AdvancedMarker
              key={p.id}
              position={p.pos}
              onClick={() => navigate(`/properties/${p.id}`)}
            >
              <Pin background="hsl(217 91% 35%)" borderColor="white" glyphColor="white" />
            </AdvancedMarker>
          ))}
        </Map>
      </div>
      <p className="mt-2 text-xs text-primary-foreground/80 text-center">
        {picked?.address
          ? `Showing the area around ${picked.address}`
          : "Pick a place to drop a pin — blue pins are verified listings"}
      </p>
    </div>
  );
};

const Recenter = ({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) => {
  const map = useMap();
  const key = `${center.lat.toFixed(5)},${center.lng.toFixed(5)}:${zoom}`;
  const last = useRef("");
  useEffect(() => {
    if (!map) return;
    if (last.current === key) return;
    last.current = key;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, key, center, zoom]);
  return null;
};

const HeroSearchFallback = () => {
  const navigate = useNavigate();
  const [city, setCity] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city) navigate(`/properties?city=${city}`);
  };

  return (
    <div className="max-w-xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 bg-card/95 backdrop-blur-md p-2 rounded-2xl shadow-elevated"
      >
        <div className="flex items-center gap-2 flex-1 px-3">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-transparent py-3 text-foreground outline-none text-sm"
          >
            <option value="">Select a city...</option>
            {FALLBACK_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <Button type="submit" className="bg-gradient-warm text-primary-foreground px-6 rounded-xl border-0 hover:opacity-90">
          <Search className="w-4 h-4 mr-2" /> Search
        </Button>
      </form>
      <div className="mt-3 rounded-2xl overflow-hidden shadow-elevated border border-border bg-card/95 h-64 md:h-72 flex flex-col items-center justify-center gap-2 p-6 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-foreground font-medium">Interactive map unavailable</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Set a Google Maps API key in <code className="px-1 py-0.5 rounded bg-muted text-[11px]">VITE_GOOGLE_MAPS_API_KEY</code>
          {" "}in your .env and restart the dev server to enable the hero map.
        </p>
      </div>
    </div>
  );
};

export default HomeHeroSearch;

// Wraps the APIProvider + useQuery in this file so callers don't have to
// pull @tanstack/react-query themselves. Loader badge used while the map
// library is loading its JS.
export const HeroSearchLoading = () => (
  <div className="max-w-xl mx-auto flex items-center justify-center bg-card/95 backdrop-blur-md rounded-2xl shadow-elevated h-12">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);
