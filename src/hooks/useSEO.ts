import { useEffect } from "react";

type SEOInput = {
  title?: string;
  description?: string;
  image?: string;
  /**
   * Canonical path relative to origin, e.g. "/properties". If omitted, the current pathname is used.
   */
  path?: string;
};

const DEFAULTS = {
  title: "VeraLeap - Rental Scam Prevention",
  description:
    "Verify rental listings, check landlord credibility, and connect with trusted brokers before you commit.",
  image: "/logo.png",
  siteName: "VeraLeap",
};

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Imperatively update `<title>` and SEO meta tags for the current page.
 * Keeps a single source of truth without pulling in react-helmet.
 */
export function useSEO({ title, description, image, path }: SEOInput = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${DEFAULTS.siteName}` : DEFAULTS.title;
    const desc = description || DEFAULTS.description;
    const img = image || DEFAULTS.image;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const url = `${origin}${path ?? pathname}`;
    const absoluteImg = img.startsWith("http") ? img : `${origin}${img}`;

    document.title = fullTitle;

    upsertMeta('meta[name="description"]', { name: "description", content: desc });

    upsertMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: desc });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: absoluteImg });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: DEFAULTS.siteName });

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: desc });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: absoluteImg });

    upsertLink("canonical", url);
  }, [title, description, image, path]);
}
