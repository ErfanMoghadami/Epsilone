
"use client";

import { useEffect, useState } from "react";

type ThemeMode = "system" | "iran-time" | "light" | "dark";

const STORAGE_KEY = "epsilone-theme-mode";

function getIranHour(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  return Number(
    parts.find((part) => part.type === "hour")?.value ?? "12"
  );
}

function applyTheme(mode: ThemeMode): boolean {
  let dark: boolean;

  if (mode === "dark") {
    dark = true;
  } else if (mode === "light") {
    dark = false;
  } else if (mode === "iran-time") {
    const hour = getIranHour();
    dark = hour < 7 || hour >= 19;
  } else {
    dark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
  }

  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark
    ? "dark"
    : "light";

  return dark;
}

function getSavedMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (
    saved === "system" ||
    saved === "iran-time" ||
    saved === "light" ||
    saved === "dark"
  ) {
    return saved;
  }

  return "system";
}

export default function ThemeControls() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      const savedMode = getSavedMode();

      setMode(savedMode);
      setIsDark(applyTheme(savedMode));
    };

    syncTheme();

    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const onSystemChange = () => {
      if (getSavedMode() === "system") {
        setIsDark(applyTheme("system"));
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncTheme();
      }
    };

    const timer = window.setInterval(() => {
      if (getSavedMode() === "iran-time") {
        setIsDark(applyTheme("iran-time"));
      }
    }, 60_000);

    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(timer);
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function chooseMode(nextMode: ThemeMode) {
    localStorage.setItem(STORAGE_KEY, nextMode);
    setMode(nextMode);
    setIsDark(applyTheme(nextMode));
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Theme mode"
        value={mode}
        onChange={(event) =>
          chooseMode(event.target.value as ThemeMode)
        }
        className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="system">System</option>
        <option value="iran-time">Iran Time</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>

      <button
        type="button"
        onClick={() => chooseMode(isDark ? "light" : "dark")}
        aria-label={
          isDark ? "Switch to light mode" : "Switch to dark mode"
        }
        title={isDark ? "Light mode" : "Dark mode"}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 bg-white text-lg text-zinc-900 transition hover:opacity-80 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
      >
        {isDark ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
