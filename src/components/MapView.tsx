import { useMemo, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { Loader2, MapPin } from "lucide-react";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { coordsForCity, INDIA_CENTER, CITY_COORDS } from "@/lib/cityCoords";

export type MapItem = {
  id: string;
  title: string;
  city?: string | null;
  location?: string | null;
  image_url?: string | null;
  price?: number | null;
  href: string;
  variant?: "property" | "broker";
  latitude?: number | null;
  longitude?: number | null;
};

interface MapViewProps {
  items: MapItem[];
  selectedCity?: string;
  className?: string;
}

const MapView = ({ items, selectedCity, className = "" }: MapViewProps) => {
  const { data: apiKey, isLoading } = useGoogleMapsKey();
  const [openId, setOpenId] = useState<string | null>(null);

  const points = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        pos:
          typeof it.latitude === "number" && typeof it.longitude === "number"
            ? { lat: it.latitude, lng: it.longitude }
            : coordsForCity(it.city, it.id),
        hasExact: typeof it.latitude === "number" && typeof it.longitude === "number",
      })),
    [items]
  );

  const center = useMemo(() => {
    if (selectedCity && CITY_COORDS[selectedCity]) return CITY_COORDS[selectedCity];
    if (points.length === 1) return points[0].pos;
    return INDIA_CENTER;
  }, [selectedCity, points]);

  const zoom = selectedCity ? 11 : 5;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-2xl ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-muted rounded-2xl p-6 text-center ${className}`}>
        <MapPin className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Map unavailable. Google Maps API key not configured.</p>
      </div>
    );
  }

  const open = points.find((p) => p.id === openId) ?? null;

  return (
    <div className={`rounded-2xl overflow-hidden shadow-card ${className}`}>
      <APIProvider apiKey={apiKey}>
        <Map
          mapId="veraleap-map"
          defaultCenter={center}
          defaultZoom={zoom}
          center={center}
          zoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: "100%", height: "100%" }}
        >
          {points.map((p) => (
            <AdvancedMarker
              key={p.id}
              position={p.pos}
              onClick={() => setOpenId(p.id)}
            >
              <Pin
                background={p.variant === "broker" ? "hsl(142 76% 36%)" : "hsl(217 91% 35%)"}
                borderColor="white"
                glyphColor="white"
              />
            </AdvancedMarker>
          ))}
          {open && (
            <InfoWindow position={open.pos} onCloseClick={() => setOpenId(null)}>
              <a href={open.href} className="block w-48 no-underline text-foreground">
                {open.image_url && (
                  <img src={open.image_url} alt={open.title} className="w-full h-24 object-cover rounded mb-2" />
                )}
                <div className="font-semibold text-sm truncate">{open.title}</div>
                {open.location && (
                  <div className="text-xs text-muted-foreground truncate">{open.location}{open.city ? `, ${open.city}` : ""}</div>
                )}
                {typeof open.price === "number" && (
                  <div className="text-sm font-bold text-primary mt-1">₹{open.price.toLocaleString()}/mo</div>
                )}
              </a>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};

export default MapView;
