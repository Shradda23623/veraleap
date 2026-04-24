import { describe, it, expect } from "vitest";
import { AMENITY_OPTIONS, type Amenity } from "@/lib/amenities";

describe("AMENITY_OPTIONS", () => {
  it("has no duplicates", () => {
    const set = new Set(AMENITY_OPTIONS);
    expect(set.size).toBe(AMENITY_OPTIONS.length);
  });

  it("contains the core marketplace amenities we advertise on the landing page", () => {
    const required: Amenity[] = ["Parking", "Power Backup", "Water Supply", "24/7 Security"];
    for (const amenity of required) {
      expect(AMENITY_OPTIONS).toContain(amenity);
    }
  });

  it("is non-empty and has reasonable breadth for Indian rentals", () => {
    expect(AMENITY_OPTIONS.length).toBeGreaterThanOrEqual(15);
  });

  it("exposes entries as plain strings (safe for DB text[] storage)", () => {
    for (const a of AMENITY_OPTIONS) {
      expect(typeof a).toBe("string");
      expect(a.length).toBeGreaterThan(0);
    }
  });
});
