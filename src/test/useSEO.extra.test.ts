import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useSEO } from "@/hooks/useSEO";

/**
 * Additional coverage on useSEO that goes beyond the smoke tests in
 * example.test.ts: Twitter Card meta tags, og:url derivation, and
 * idempotency on rerender (we shouldn't be appending duplicate meta tags).
 */
describe("useSEO — extended", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });
  afterEach(() => cleanup());

  it("writes a Twitter Card with summary_large_image", () => {
    renderHook(() => useSEO({ title: "Listing detail" }));
    const card = document.head.querySelector<HTMLMetaElement>('meta[name="twitter:card"]');
    expect(card?.content).toBe("summary_large_image");
  });

  it("writes og:url derived from origin + supplied path", () => {
    renderHook(() => useSEO({ path: "/brokers/ravi" }));
    const og = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    expect(og?.content.endsWith("/brokers/ravi")).toBe(true);
  });

  it("does not duplicate meta tags on rerender", () => {
    const { rerender } = renderHook(({ title }: { title: string }) => useSEO({ title }), {
      initialProps: { title: "First" },
    });
    rerender({ title: "Second" });
    rerender({ title: "Third" });

    const descTags = document.head.querySelectorAll('meta[name="description"]');
    const ogTitleTags = document.head.querySelectorAll('meta[property="og:title"]');
    const canonicals = document.head.querySelectorAll('link[rel="canonical"]');

    expect(descTags.length).toBe(1);
    expect(ogTitleTags.length).toBe(1);
    expect(canonicals.length).toBe(1);
    expect(document.title).toBe("Third — VeraLeap");
  });

  it("falls back to default description when none is supplied", () => {
    renderHook(() => useSEO({ title: "About" }));
    const desc = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    expect(desc?.content.length).toBeGreaterThan(0);
    expect(desc?.content.toLowerCase()).toContain("verify");
  });
});
