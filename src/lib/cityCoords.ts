// Approximate centroid coordinates for supported Indian cities.
// Used to plot properties/brokers on the map without precise lat/lng in the DB.
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Chandigarh: { lat: 30.7333, lng: 76.7794 },
  Jalandhar: { lat: 31.326, lng: 75.5762 },
  Gurgaon: { lat: 28.4595, lng: 77.0266 },
  Noida: { lat: 28.5355, lng: 77.391 },
  Goa: { lat: 15.2993, lng: 74.124 },
  Manali: { lat: 32.2432, lng: 77.1892 },
};

export const INDIA_CENTER = { lat: 22.5937, lng: 78.9629 };

// Deterministic small jitter so multiple pins in the same city don't stack.
export function jitter(lat: number, lng: number, seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const dx = ((h & 0xff) / 0xff - 0.5) * 0.08; // ~4-5km
  const dy = (((h >> 8) & 0xff) / 0xff - 0.5) * 0.08;
  return { lat: lat + dy, lng: lng + dx };
}

export function coordsForCity(city: string | null | undefined, seed: string) {
  const base = (city && CITY_COORDS[city]) || INDIA_CENTER;
  return jitter(base.lat, base.lng, seed);
}
