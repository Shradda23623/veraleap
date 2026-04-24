import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Loader2, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { coordsForCity } from "@/lib/cityCoords";

interface PropertyMapProps {
  latitude?: number | null;
  longitude?: number | null;
  title: string;
  city?: string | null;
  location?: string | null;
  propertyId?: string;
  height?: number;
  className?: string;
}

/**
 * Read-only map for a single property.
 * Shows the exact pin when lat/lng are saved on the property, otherwise
 * falls back to a deterministic-jitter point around the city center so
 * the section still renders something useful.
 */
const PropertyMap = ({
  latitude,
  longitude,
  title,
  city,
  location,
  propertyId,
  height = 280,
  className = "",
}: PropertyMapProps) => {
  const { data: apiKey, isLoading } = useGoogleMapsKey();

  const hasExact = typeof latitude === "number" && typeof longitude === "number";
  const pos = hasExact
    ? { lat: latitude as number, lng: longitude as number }
    : coordsForCity(city, propertyId ?? title);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-xl ${className}`} style={{ height }}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-muted rounded-xl p-6 text-center ${className}`} style={{ height }}>
        <MapPin className="w-7 h-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Map unavailable — Google Maps API key not configured.
        </p>
        {location && (
          <p className="text-xs text-muted-foreground">
            {location}{city ? `, ${city}` : ""}
          </p>
        )}
      </div>
    );
  }

  const directionsQuery = hasExact
    ? `${latitude},${longitude}`
    : encodeURIComponent([location, city].filter(Boolean).join(", "));
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${directionsQuery}`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
        <APIProvider apiKey={apiKey}>
          <Map
            mapId={`veraleap-property-${propertyId ?? "detail"}`}
            defaultCenter={pos}
            defaultZoom={hasExact ? 15 : 11}
            gestureHandling="cooperative"
            disableDefaultUI={false}
            style={{ width: "100%", height: "100%" }}
          >
            <AdvancedMarker position={pos}>
              <Pin
                background="hsl(217 91% 35%)"
                borderColor="white"
                glyphColor="white"
              />
            </AdvancedMarker>
          </Map>
        </APIProvider>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {hasExact
            ? "Exact location pinned by the host"
            : "Approximate area — exact address shared after visit approval"}
        </p>
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <ExternalLink className="w-3 h-3" /> Directions
          </Button>
        </a>
      </div>
    </div>
  );
};

export default PropertyMap;
