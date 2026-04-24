import { useEffect, useMemo, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Loader2, MapPin, Crosshair, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { INDIA_CENTER } from "@/lib/cityCoords";

export interface PickedLocation {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
}

interface LocationPickerProps {
  value?: { lat: number | null | undefined; lng: number | null | undefined } | null;
  onChange: (loc: PickedLocation) => void;
  height?: number;
  defaultCity?: string;
}

/**
 * A map + search box that lets a broker/owner pin the exact location of a
 * property. Three ways to set the pin:
 *   1. Type in the Google Places autocomplete search box.
 *   2. Click anywhere on the map to drop a pin.
 *   3. Drag the existing pin to fine-tune.
 * Also includes a "use my current location" button.
 *
 * Emits `onChange({ lat, lng, address?, city? })` every time the pin moves.
 */
const LocationPicker = ({ value, onChange, height = 360, defaultCity }: LocationPickerProps) => {
  const { data: apiKey, isLoading } = useGoogleMapsKey();

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-muted rounded-xl"
        style={{ height }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 bg-muted rounded-xl p-6 text-center"
        style={{ height }}
      >
        <MapPin className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          Map picker unavailable — a Google Maps API key isn't configured. Set
          <code className="mx-1 px-1.5 py-0.5 rounded bg-background text-xs">VITE_GOOGLE_MAPS_API_KEY</code>
          in your <code className="mx-1 px-1.5 py-0.5 rounded bg-background text-xs">.env</code>
          file. You can still save the listing — the map just won't show.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      <LocationPickerInner
        value={value}
        onChange={onChange}
        height={height}
        defaultCity={defaultCity}
      />
    </APIProvider>
  );
};

const LocationPickerInner = ({
  value,
  onChange,
  height,
  defaultCity,
}: LocationPickerProps & { height: number }) => {
  const hasInitial =
    typeof value?.lat === "number" && typeof value?.lng === "number";
  const initialCenter = useMemo(
    () => (hasInitial ? { lat: value!.lat as number, lng: value!.lng as number } : INDIA_CENTER),
    [hasInitial, value?.lat, value?.lng]
  );
  const initialZoom = hasInitial ? 15 : 5;

  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    hasInitial ? { lat: value!.lat as number, lng: value!.lng as number } : null
  );
  const [geocodingAddress, setGeocodingAddress] = useState(false);
  const [locating, setLocating] = useState(false);

  // Reverse-geocode whenever the pin moves so we can pass a human-readable
  // address back to the form.
  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocodingAddress(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat, lng } });
      const first = res.results?.[0];
      let city: string | undefined;
      for (const comp of first?.address_components ?? []) {
        if (comp.types.includes("locality")) {
          city = comp.long_name;
          break;
        }
        if (!city && comp.types.includes("administrative_area_level_2")) {
          city = comp.long_name;
        }
      }
      onChange({
        lat,
        lng,
        address: first?.formatted_address,
        city,
      });
    } catch {
      onChange({ lat, lng });
    } finally {
      setGeocodingAddress(false);
    }
  };

  const handlePinChange = (lat: number, lng: number) => {
    setPin({ lat, lng });
    void reverseGeocode(lat, lng);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePinChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <AutocompleteSearch
            defaultCity={defaultCity}
            onPlace={(lat, lng, address, city) => {
              setPin({ lat, lng });
              onChange({ lat, lng, address, city });
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="gap-1.5"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Crosshair className="w-3.5 h-3.5" />
          )}
          Use my location
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
        <Map
          mapId="veraleap-location-picker"
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          onClick={(e) => {
            const lat = e.detail.latLng?.lat;
            const lng = e.detail.latLng?.lng;
            if (typeof lat === "number" && typeof lng === "number") {
              handlePinChange(lat, lng);
            }
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <RecenterOnPin pin={pin} />
          {pin && (
            <AdvancedMarker
              position={pin}
              draggable
              onDragEnd={(e) => {
                const lat = e.latLng?.lat();
                const lng = e.latLng?.lng();
                if (typeof lat === "number" && typeof lng === "number") {
                  handlePinChange(lat, lng);
                }
              }}
            >
              <Pin
                background="hsl(217 91% 35%)"
                borderColor="white"
                glyphColor="white"
              />
            </AdvancedMarker>
          )}
        </Map>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5" />
        {pin
          ? geocodingAddress
            ? "Looking up address…"
            : `Pinned at ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}. Click or drag to adjust.`
          : "Search, click on the map, or use your current location to drop a pin."}
      </p>
    </div>
  );
};

// Re-centers the map when the pin changes from outside (e.g. autocomplete).
const RecenterOnPin = ({ pin }: { pin: { lat: number; lng: number } | null }) => {
  const map = useMap();
  const lastRef = useRef<string>("");
  useEffect(() => {
    if (!map || !pin) return;
    const key = `${pin.lat.toFixed(6)},${pin.lng.toFixed(6)}`;
    if (lastRef.current === key) return;
    lastRef.current = key;
    map.panTo(pin);
    const current = map.getZoom() ?? 5;
    if (current < 13) map.setZoom(15);
  }, [map, pin]);
  return null;
};

// Google Places autocomplete text box.
const AutocompleteSearch = ({
  defaultCity,
  onPlace,
}: {
  defaultCity?: string;
  onPlace: (lat: number, lng: number, address?: string, city?: string) => void;
}) => {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "in" },
      fields: ["geometry", "formatted_address", "address_components", "name"],
    });
    autocompleteRef.current = ac;
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      if (typeof lat !== "number" || typeof lng !== "number") return;
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
      onPlace(lat, lng, place.formatted_address ?? place.name, city);
      setQuery(place.formatted_address ?? place.name ?? "");
    });
    return () => {
      listener.remove();
      autocompleteRef.current = null;
    };
  }, [places, onPlace]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search address${defaultCity ? ` in ${defaultCity}` : " in India"}...`}
        className="pl-9 h-9"
      />
    </div>
  );
};

export default LocationPicker;
