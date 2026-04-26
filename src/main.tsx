import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";

// Fire-and-forget — both no-op gracefully when their env keys are missing
void initSentry();
void initPostHog();

createRoot(document.getElementById("root")!).render(<App />);
