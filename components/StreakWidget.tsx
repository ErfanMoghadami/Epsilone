"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { tehranDay } from "@/lib/streak";

type StreakStatus = {
  authenticated: boolean;
  verified?: boolean;
  target?: number;
  currentStreak?: number;
  countedToday?: boolean;
  reward?: { id: string; expiresAt: string } | null;
};

const POLL_MS = 15_000;
const TOAST_KEY = "epsilone-streak-toast";
const TOAST_MS = 8_000;

/**
 * Shows a reminder only when the user is on a streak of 2+ days
 * (and has no reward waiting yet).
 */
function buildToast(data: StreakStatus): { key: string; text: string } | null {
  if (!data.authenticated || data.reward) return null;

  const target = data.target ?? 7;
  const streak = data.currentStreak ?? 0;

  if (streak < 2 || streak >= target) return null;

  const left = target - streak;
  const days = `${left} ${left === 1 ? "day" : "days"}`;
  const today = tehranDay(0);

  if (data.countedToday) {
    return {
      key: `${today}:${streak}:done`,
      text: `🔥 Day ${streak} done! ${days} left until your free beat.`,
    };
  }

  return {
    key: `${today}:${streak}:keep`,
    text: `Your ${streak}-day streak is alive. Play a beat today to keep it, ${days} to go!`,
  };
}

export default function StreakWidget() {
  const pathname = usePathname();

  const [status, setStatus] = useState<StreakStatus | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const hadRewardRef = useRef<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/streak/status", { cache: "no-store" });
      const data: StreakStatus = await res.json();

      setStatus(data);

      const hasReward = Boolean(data.reward);

      // جایزه تازه آماده شد
      if (hadRewardRef.current === false && hasReward) {
        setToast("🎁 Your free beat is ready! Tap to claim it.");
      } else {
        // یادآوری استریک (روزی یک بار برای هر وضعیت)
        const next = buildToast(data);

        if (next) {
          try {
            if (localStorage.getItem(TOAST_KEY) !== next.key) {
              localStorage.setItem(TOAST_KEY, next.key);
              setToast(next.text);
            }
          } catch {
            // storage unavailable: skip the notification
          }
        }
      }

      hadRewardRef.current = hasReward;
    } catch {
      // ignore, we poll again later
    }
  }, []);

  useEffect(() => {
    refresh();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // auto-dismiss the notification
  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => setToast(null), TOAST_MS);

    return () => clearTimeout(timeout);
  }, [toast]);

  // روی خود صفحه‌ی streak لازم نیست
  if (!status?.authenticated || pathname === "/streak") return null;

  const target = status.target ?? 7;
  const streak = status.reward ? target : (status.currentStreak ?? 0);
  const label = status.reward ? "Free beat" : `${streak}/${target}`;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {toast && (
        <div
          role="status"
          className="flex w-72 items-start gap-3 rounded-2xl border border-white/10 bg-ep-bg/95 p-4 text-sm text-white shadow-xl backdrop-blur"
        >
          <Link
            href="/streak"
            onClick={() => setToast(null)}
            className="flex-1 text-left"
          >
            {toast}
          </Link>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 text-zinc-500 transition hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <Link
        href="/streak"
        aria-label={`Daily play streak ${label}`}
        className="group flex items-center rounded-full border border-white/10 bg-ep-bg/90 py-1.5 pl-4 pr-2 text-sm font-medium text-white shadow-lg backdrop-blur transition hover:border-brand/0"
      >
        {/*<span>{label}</span>*/}

        <Image
          src="/streak-cd.webp"
          alt=""
          width={36}
          height={31}
          className="h-8 w-auto transition group-hover:-rotate-6"
        />
      </Link>
    </div>
  );
}