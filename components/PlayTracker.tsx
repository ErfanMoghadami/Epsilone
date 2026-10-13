"use client";

import { useEffect } from "react";
import WaveformTracker from "@arraypress/waveform-tracker";

let trackerInitialized = false;

/**
 * Mounted once in app/layout.tsx, so every page with a player
 * (home, discover, trending, ...) reports plays to /api/analytics/play.
 * One tracker session ID per page load allows the API/database to deduplicate
 * repeated POSTs for the same beat. Keep initialization singleton-safe under
 * React Strict Mode in development.
 */
export default function PlayTracker() {
  useEffect(() => {
    if (trackerInitialized) return;
    trackerInitialized = true;

    WaveformTracker.init({
      endpoint: "/api/analytics/play",
      events: { play: 3 },
      session: true,
    });
  }, []);

  return null;
}
