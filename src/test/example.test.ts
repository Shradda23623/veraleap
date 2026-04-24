import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useSEO } from "@/hooks/useSEO";

describe("useSEO", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });
  afterEach(() => cleanup());

  it("sets a default title when no args are passed", () => {
    renderHook(() => useSEO());
    expect(document.title).toContain("VeraLeap");
  });

  it("suffixes a custom title with the site name", () => {
    renderHook(() => useSEO({ title: "Sign in" }));
    expect(document.title).toBe("Sign in — VeraLeap");
  });

  it("writes description + og:description meta tags", () => {
    renderHook(() => useSEO({ description: "Hello, world" }));
    const desc = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    const og = document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    expect(desc?.content).toBe("Hello, world");
    expect(og?.content).toBe("Hello, world");
  });

  it("writes a canonical link for the current path", () => {
    renderHook(() => useSEO({ path: "/properties/abc" }));
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.href).toContain("/properties/abc");
  });

  it("absolutises relative image paths", () => {
    renderHook(() => useSEO({ image: "/logo.png" }));
    const og = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    expect(og?.content.startsWith("http")).toBe(true);
    expect(og?.content.endsWith("/logo.png")).toBe(true);
  });

  it("leaves absolute image URLs untouched", () => {
    renderHook(() => useSEO({ image: "https://cdn.example.com/card.jpg" }));
    const og = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    expect(og?.content).toBe("https://cdn.example.com/card.jpg");
  });
});
