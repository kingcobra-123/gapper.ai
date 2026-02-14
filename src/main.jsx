import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./auth/AuthProvider";

// --- 1. IMPORT POSTHOG ---
import posthog from "posthog-js";

// --- 2. INITIALIZE POSTHOG USING VITE ENV VARS ---
// Configure these in a local `.env` file (not committed to git):
// VITE_POSTHOG_API_KEY=phc_xxx...
// VITE_POSTHOG_API_HOST=https://us.i.posthog.com
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_API_HOST =
  import.meta.env.VITE_POSTHOG_API_HOST || "https://us.i.posthog.com";

if (POSTHOG_API_KEY) {
  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_API_HOST,
    person_profiles: "identified_only",
  });
} else {
  console.warn(
    "[Gapper.ai] PostHog not initialized: VITE_POSTHOG_API_KEY is not set"
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
