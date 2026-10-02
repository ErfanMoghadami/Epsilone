"use client";

import { useEffect } from "react";
import WaveformTracker from "@arraypress/waveform-tracker";

/**
 * Mounted once in app/layout.tsx, so every page with a player
 * (home, discover, ...) reports plays to /api/analytics/play.
 * Remove WaveformTracker.init from app/page.tsx.
 */
export default function PlayTracker() {
  useEffect(() => {
    WaveformTracker.init({
      endpoint: "/api/analytics/play",
      events: { play: 3 },
    });
  }, []);

  return null;
}