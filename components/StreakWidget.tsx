"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { tehranDay } from "@/lib/streak";

type BeatCard = {
  id: string;
  title: string | null;
  producer: string;
  coverUrl: string | null;
};

type StreakStatus = {
  authenticated: boolean;
  verified?: boolean;
  target?: number;
  currentStreak?: number;
  countedToday?: boolean;
  weeklyBeat?: BeatCard | null;
  reward?: { id: string; expiresAt: string; beat: BeatCard | null } | null;
};

const POLL_MS = 15_000;
const TOAST_KEY = "epsilone-streak-toast";
const TOAST_MS = 8_000;

/**
 * Shows a reminder only when the user is on a streak of 2+ days
 * (and has no reward waiting yet).
 */
function buildToast(
  data: StreakStatus,
): { key: string; text: string } | null {
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

function BeatRow({ beat, label }: { beat: BeatCard; label: string }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-black p-3">
      {beat.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={beat.coverUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-lg bg-zinc-900" />
      )}

      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-zinc-600">
          {label}
        </p>
        <p className="truncate text-sm font-medium">
          {beat.title ?? "Untitled Beat"}
        </p>
        <p className="truncate text-xs text-zinc-500">{beat.producer}</p>
      </div>
    </div>
  );
}

export default function StreakWidget() {
  const [status, setStatus] = useState<StreakStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedTitle, setClaimedTitle] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const hadRewardRef = useRef<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/streak/status", { cache: "no-store" });
      const data: StreakStatus = await res.json();

      setStatus(data);

      const hasReward = Boolean(data.reward);

      if (hadRewardRef.current === false && hasReward) {
        setOpen(true);
      }

      hadRewardRef.current = hasReward;

      // streak reminder (once per day/state)
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

  async function claim() {
    if (!status?.reward) return;

    setClaiming(true);
    setError("");

    try {
      const res = await fetch("/api/streak/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: status.reward.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to claim.");
      }

      setClaimedTitle(data.beat?.title ?? "your beat");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim.");
    } finally {
      setClaiming(false);
    }
  }

  if (!status?.authenticated) return null;

  const target = status.target ?? 7;
  const reward = status.reward ?? null;
  const streak = reward ? target : (status.currentStreak ?? 0);
  const weeklyBeat = status.weeklyBeat ?? null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {toast && !open && (
        <div
          role="status"
          className="flex w-72 items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-white shadow-xl"
        >
          <button
            type="button"
            onClick={() => {
              setToast(null);
              setOpen(true);
            }}
            className="flex-1 text-left"
          >
            {toast}
          </button>

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

      {open && (
        <div className="w-72 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-white shadow-xl">
          <p className="text-sm font-semibold">
            {claimedTitle
              ? "Enjoy your free beat 🎉"
              : reward
                ? "Your free beat is ready 🎁"
                : "Daily play streak"}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {claimedTitle
              ? `"${claimedTitle}" was added to your purchases.`
              : reward
                ? "This week's beat is waiting for you."
                : "Play a beat every day. Complete 7 days to get this week's free beat."}
          </p>

          <div className="mt-4 flex items-center justify-between">
            {Array.from({ length: target }).map((_, index) => {
              const filled = index < streak;
              const last = index === target - 1;

              return (
                <div
                  key={index}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${
                    filled
                      ? "border-white bg-white text-black"
                      : "border-zinc-800 bg-black text-zinc-600"
                  }`}
                >
                  {last ? "🎁" : index + 1}
                </div>
              );
            })}
          </div>

          {!reward && !claimedTitle && (
            <p className="mt-3 text-xs text-zinc-500">
              {status.countedToday
                ? "Today is counted. Come back tomorrow!"
                : "Play any beat today to count this day."}
            </p>
          )}

          {status.verified === false && (
            <p className="mt-3 text-xs text-amber-400">
              Verify your email to earn streak rewards.
            </p>
          )}

          {/* Reward beat / weekly beat */}
          {reward?.beat ? (
            <BeatRow beat={reward.beat} label="Your free beat" />
          ) : weeklyBeat && !claimedTitle ? (
            <BeatRow beat={weeklyBeat} label="This week's free beat" />
          ) : null}

          {error && (
            <p className="mt-3 text-xs text-red-400">{error}</p>
          )}

          {reward && (
            <>
              <p className="mt-3 text-xs text-zinc-500">
                Expires {new Date(reward.expiresAt).toLocaleDateString()}
              </p>

              <button
                type="button"
                onClick={claim}
                disabled={claiming}
                className="mt-3 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {claiming ? "Claiming..." : "Claim free beat"}
              </button>
            </>
          )}

          {claimedTitle && !reward && (
            <Link
              href="/dashboard/purchases"
              onClick={() => setOpen(false)}
              className="mt-4 block text-center text-sm font-medium text-white underline"
            >
              Go to my purchases →
            </Link>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:border-zinc-600"
        aria-label="Daily play streak"
      >
        {reward ? "🎁 Free beat" : `🔥 ${streak}/${target}`}
      </button>
    </div>
  );
}