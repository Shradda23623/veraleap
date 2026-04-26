/**
 * Sentry initialization.
 *
 * No-ops gracefully when VITE_SENTRY_DSN is not set, so local development
 * and CI builds don't need a key. In production, set the DSN as a Vercel
 * environment variable.
 *
 * Install once you have a DSN:
 *   npm install @sentry/react
 */

type SentryModule = {
  init: (config: Record<string, unknown>) => void;
  browserTracingIntegration?: () => unknown;
  replayIntegration?: (config?: Record<string, unknown>) => unknown;
};

// Hide the package name from TypeScript so the type-checker doesn't
// require @sentry/react to be installed at type-check time.
const SENTRY_PKG = "@sentry/react";

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info("[sentry] disabled — set VITE_SENTRY_DSN to enable");
    }
    return;
  }

  try {
    // Dynamic import via a variable so the module isn't statically resolved
    const mod = (await import(/* @vite-ignore */ SENTRY_PKG).catch(
      () => null,
    )) as SentryModule | null;

    if (!mod) {
      console.warn(
        "[sentry] @sentry/react is not installed — run `npm install @sentry/react`",
      );
      return;
    }

    mod.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_RELEASE_VERSION ?? "dev",
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        mod.browserTracingIntegration?.(),
        mod.replayIntegration?.({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ].filter(Boolean),
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "Non-Error promise rejection captured",
        /^NetworkError/,
      ],
    });
  } catch (err) {
    console.warn("[sentry] failed to initialize", err);
  }
}
