import { describe, it, expect } from "vitest";
import { scoreTier } from "@/components/TrustScoreBadge";

describe("scoreTier", () => {
  it("labels high scores as Trusted", () => {
    expect(scoreTier(100).label).toBe("Trusted");
    expect(scoreTier(75).label).toBe("Trusted");
  });

  it("labels mid-range scores as Caution", () => {
    expect(scoreTier(74.9).label).toBe("Caution");
    expect(scoreTier(50).label).toBe("Caution");
  });

  it("labels low scores as High risk", () => {
    expect(scoreTier(49.9).label).toBe("High risk");
    expect(scoreTier(0).label).toBe("High risk");
  });

  it("never returns overlapping or gapped boundaries across the full 0-100 range", () => {
    const labels = new Set<string>();
    for (let s = 0; s <= 100; s += 0.5) {
      labels.add(scoreTier(s).label);
    }
    expect(labels).toEqual(new Set(["Trusted", "Caution", "High risk"]));
  });

  it("pairs each tier with a distinct icon and color class", () => {
    const trusted = scoreTier(90);
    const caution = scoreTier(60);
    const risk = scoreTier(20);
    expect(trusted.Icon).not.toBe(caution.Icon);
    expect(caution.Icon).not.toBe(risk.Icon);
    expect(new Set([trusted.color, caution.color, risk.color]).size).toBe(3);
  });
});
