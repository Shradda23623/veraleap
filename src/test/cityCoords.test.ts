import { describe, it, expect } from "vitest";
import { CITY_COORDS, INDIA_CENTER, jitter } from "@/lib/cityCoords";

describe("CITY_COORDS", () => {
  it("covers the core Indian cities we list in the UI", () => {
    for (const city of ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai"]) {
      expect(CITY_COORDS[city]).toBeDefined();
    }
  });

  it("has coordinates inside plausible India bounds", () => {
    for (const [city, { lat, lng }] of Object.entries(CITY_COORDS)) {
      expect(lat, `${city} lat`).toBeGreaterThan(6);
      expect(lat, `${city} lat`).toBeLessThan(37);
      expect(lng, `${city} lng`).toBeGreaterThan(68);
      expect(lng, `${city} lng`).toBeLessThan(98);
    }
  });
});

describe("INDIA_CENTER", () => {
  it("sits near the geographic centre of India", () => {
    expect(INDIA_CENTER.lat).toBeCloseTo(22.6, 0);
    expect(INDIA_CENTER.lng).toBeCloseTo(78.9, 0);
  });
});

describe("jitter", () => {
  it("is deterministic for the same seed", () => {
    const a = jitter(19, 72, "prop-123");
    const b = jitter(19, 72, "prop-123");
    expect(a).toEqual(b);
  });

  it("stays within ~4-5km of the source point", () => {
    const base = { lat: 19, lng: 72 };
    for (const seed of ["a", "b", "c", "zzz-property-9999"]) {
      const j = jitter(base.lat, base.lng, seed);
      expect(Math.abs(j.lat - base.lat)).toBeLessThan(0.05);
      expect(Math.abs(j.lng - base.lng)).toBeLessThan(0.05);
    }
  });

  it("produces different offsets for different seeds", () => {
    const a = jitter(19, 72, "seed-one");
    const b = jitter(19, 72, "seed-two");
    expect(a).not.toEqual(b);
  });
});
