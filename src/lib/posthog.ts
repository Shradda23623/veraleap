/**
 * PostHog initialization.
 *
 * No-ops gracefully when VITE_POSTHOG_KEY is not set. Tracks page views
 * automatically and exposes a `track()` helper for custom events.
 *
 * Install once you have a key:
 *   npm install posthog-js
 */

type PostHogClient = {
  init: (key: string, config: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
};

// Hide the package name from TypeScript so the type-checker doesn't
// require posthog-js to be installed at type-check time.
const POSTHOG_PKG = "posthog-js";

let client: PostHogClient | null = null;

export async function initPostHog(): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) {
    if (import.meta.env.DEV) {
      console.info("[posthog] disabled — set VITE_POSTHOG_KEY to enable");
    }
    return;
  }

  try {
    const mod = (await import(/* @vite-ignore */ POSTHOG_PKG).catch(
      () => null,
    )) as { default: PostHogClient } | null;

    if (!mod) {
      console.warn(
        "[posthog] posthog-js is not installed — run `npm install posthog-js`",
      );
      return;
    }

    client = mod.default;
    client.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      mask_all_text: false,
      mask_all_element_attributes: false,
      autocapture: { css_selector_allowlist: ["[data-track]"] },
      respect_dnt: true,
    });
  } catch (err) {
    console.warn("[posthog] failed to initialize", err);
  }
}

/** Track a custom event. No-ops when PostHog isn't initialized. */
export function track(event: string, props?: Record<string, unknown>): void {
  client?.capture(event, props);
}

/** Identify the current user once they sign in. */
export function identify(userId: string, props?: Record<string, unknown>): void {
  client?.identify(userId, props);
}

/** Reset the session on sign out. */
export function resetAnalytics(): void {
  client?.reset();
}
