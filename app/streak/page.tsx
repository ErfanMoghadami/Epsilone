"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BeatResultCard, { type Beat } from "@/components/BeatResultCard";

type StreakStatus = {
  authenticated: boolean;
  verified?: boolean;
  target?: number;
  currentStreak?: number;
  countedToday?: boolean;
  weeklyBeat?: Beat | null;
  reward?: { id: string; expiresAt: string; beat: Beat | null } | null;
};

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function StreakPage() {
  const [status, setStatus] = useState<StreakStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimedTitle, setClaimedTitle] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/streak/status", { cache: "no-store" });
      setStatus(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
        throw new Error(data.error || "دریافت بیت ناموفق بود.");
      }

      setClaimedTitle(data.beat?.title ?? "بیت رایگان");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت بیت ناموفق بود.");
    } finally {
      setClaiming(false);
    }
  }

  const target = status?.target ?? 7;
  const reward = status?.reward ?? null;
  const streak = reward ? target : (status?.currentStreak ?? 0);
  const weeklyBeat = status?.weeklyBeat ?? null;

  return (
    <main
      dir="rtl"
      className="font-fa min-h-[calc(100svh-64px)] overflow-x-hidden bg-ink px-5 py-8 text-white sm:py-16"
    >
      <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-8 md:flex-row md:gap-24">
        {/* متن + مراحل */}
        <section className="w-full md:flex-1">
          <h1 className="text-[1.7rem] font-black leading-[1.7] sm:text-4xl">
            {fa(target)} روز جستجو کن ،
            <br />
            یه <span className="text-brand">بیت رایگان</span> بگیر
          </h1>

          <p className="mt-5 text-sm leading-8 text-white/80 sm:mt-6 sm:text-base">
            هر روز که جستجو میکنی ی روز به بیت رایگان نزدیک میشی
            <br />
            بعد از {fa(target)} روز ی بیت رایگان از اپسیلون میگیری
          </p>

          {/* مراحل: ۱ سمت راست، ۷ سمت چپ */}
          <ol className="mt-7 flex w-full max-w-md items-center sm:mt-8 sm:max-w-none">
            {Array.from({ length: target }).map((_, i) => {
              const filled = i < streak;
              const isLast = i === target - 1;

              return (
                <li
                  key={i}
                  className={`flex items-center ${
                    isLast ? "" : "flex-1 sm:flex-none"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold sm:h-11 sm:w-11 sm:text-base ${
                      filled
                        ? "border-brand bg-brand text-ink shadow-[0_4px_14px_rgba(255,127,92,0.4)]"
                        : "border-white/10 bg-gradient-to-b from-white/10 to-ink text-white"
                    }`}
                  >
                    {fa(i + 1)}
                  </span>

                  {!isLast && (
                    <span
                      className={`h-0.5 min-w-1 flex-1 sm:w-7 sm:flex-none ${
                        i < streak - 1 ? "bg-brand" : "bg-white/15"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {/* وضعیت */}
          <div className="mt-7 w-full max-w-xl text-sm sm:mt-8">
            {status && !status.authenticated && (
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-full border border-brand/70 px-8 text-sm font-bold text-white transition hover:bg-brand/10"
              >
                برای شروع وارد شو
              </Link>
            )}

            {status?.authenticated && !reward && !claimedTitle && (
              <p className="text-zinc-400">
                {status.countedToday
                  ? "امروز حساب شد. فردا دوباره بیا!"
                  : "امروز یه بیت پخش کن تا این روز حساب بشه."}
              </p>
            )}

            {status?.authenticated && status.verified === false && (
              <p className="mt-3 text-amber-400">
                برای گرفتن جایزه، اول ایمیلت رو تأیید کن.
              </p>
            )}

            {reward && !claimedTitle && (
              <>
                <p className="font-bold text-brand">بیت رایگانت آماده‌ست 🎁</p>

                {reward.beat && (
                  <div className="mt-4" dir="rtl">
                    <BeatResultCard beat={reward.beat} />
                  </div>
                )}

                <p className="mt-3 text-xs text-zinc-500">
                  اعتبار تا{" "}
                  {new Date(reward.expiresAt).toLocaleDateString("fa-IR")}
                </p>

                <button
                  type="button"
                  onClick={claim}
                  disabled={claiming}
                  className="glass-btn mt-4 flex h-12 w-full items-center justify-center rounded-full text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-60"
                >
                  {claiming ? "در حال دریافت..." : "دریافت بیت رایگان"}
                </button>
              </>
            )}

            {claimedTitle && (
              <>
                <p className="font-bold text-brand">
                  «{claimedTitle}» به خریدهات اضافه شد 🎉
                </p>

                <Link
                  href="/dashboard/purchases"
                  className="mt-3 inline-block underline"
                >
                  رفتن به خریدهای من ←
                </Link>
              </>
            )}

            {/* بیت رایگان این هفته: همون کارت صفحه‌ی نتایج */}
            {status &&
              !reward &&
              !claimedTitle &&
              (weeklyBeat ? (
                <div className="mt-5">
                  <p className="mb-2 text-xs text-zinc-500">
                    بیت رایگان این هفته
                  </p>
                  <BeatResultCard beat={weeklyBeat} />
                </div>
              ) : (
                <p className="mt-5 text-xs text-zinc-500">
                  بیت رایگان این هفته هنوز مشخص نشده.
                </p>
              ))}

            {error && <p className="mt-3 text-red-400">{error}</p>}
          </div>
        </section>

        {/* عکس CD: سه قاب پشت هم */}
        <div className="w-full max-w-[15rem] shrink-0 sm:max-w-xs md:max-w-md">
          <div className="relative">
            {[2, 1].map((n) => (
              <Image
                key={n}
                src="/streak-cd.webp"
                alt=""
                aria-hidden="true"
                width={900}
                height={784}
                className="absolute inset-0 h-full w-full brightness-[0.7]"
                style={{ transform: `translateX(-${n * 8}%)` }}
              />
            ))}

            <Image
              src="/streak-cd.webp"
              alt="CD بیت رایگان اپسیلون"
              width={900}
              height={784}
              priority
              className="relative h-auto w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>
      </div>
    </main>
  );
}