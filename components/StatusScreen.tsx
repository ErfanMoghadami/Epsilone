import type { ReactNode } from "react";
import LMark from "@/components/LMark";
import WaveBackground from "@/components/WaveBackground";

// ارتفاع میله‌ها (۰ تا ۱)؛ میله‌ی HOT_INDEX «افتاده» و نارنجی می‌شه
const BARS = [
  0.35, 0.55, 0.42, 0.78, 0.6, 0.9, 0.5, 0.7, 0.18, 0.66, 0.84, 0.46, 0.72,
  0.4, 0.58, 0.32, 0.48,
];
const HOT_INDEX = 8;

function BrokenWave() {
  const barW = 4;
  const gap = 6;
  const h = 40;
  const w = BARS.length * (barW + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      className="h-9 w-auto text-ep-fg"
    >
      {BARS.map((v, i) => {
        const bh = Math.max(4, v * h);
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - bh}
            width={barW}
            height={bh}
            rx={2}
            className={i === HOT_INDEX ? "status-bar status-bar-hot" : "status-bar"}
          />
        );
      })}
    </svg>
  );
}

/**
 * Shared layout for the error and 404 screens: same look as BrandLoader
 * (L tile, brand tokens, wave at the bottom) with a message and actions.
 * Pure markup (no hooks), so it works in server and client components.
 */
export default function StatusScreen({
  code,
  title,
  description,
  detail,
  children,
}: {
  code: string;
  title: string;
  description: string;
  /** Technical hint, only passed in development */
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <main
      dir="rtl"
      className="font-fa relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-ep-bg px-6 py-16 text-ep-fg"
    >
      <div
        aria-hidden="true"
        className="loader-halo pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-[62%] rounded-full blur-3xl"
      />

      <div className="status-rise relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="glass-card loader-tile flex h-24 w-24 items-center justify-center rounded-[26px]">
          <LMark className="h-12 w-auto" />
        </div>

        <div className="mt-8">
          <BrokenWave />
        </div>

        <p
          dir="ltr"
          className="font-logo mt-6 text-sm font-light tracking-[0.32em] text-brand"
        >
          {code}
        </p>

        <h1 className="mt-3 text-2xl font-semibold text-ep-fg sm:text-3xl">
          {title}
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-8 text-ep-muted">
          {description}
        </p>

        {detail ? (
          <pre
            dir="ltr"
            className="mt-5 max-h-32 w-full overflow-auto rounded-xl border border-ep-border bg-ep-field px-4 py-3 text-left text-[11px] leading-5 text-ep-muted"
          >
            {detail}
          </pre>
        ) : null}

        {children ? (
          <div className="mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:flex-row-reverse sm:justify-center">
            {children}
          </div>
        ) : null}
      </div>

      <WaveBackground />
    </main>
  );
}

/** Class names shared by the action buttons/links on these screens. */
export const statusPrimaryClass =
  "glass-btn inline-flex h-11 items-center justify-center rounded-full px-7 text-sm font-semibold text-ink transition hover:brightness-110";

export const statusSecondaryClass =
  "inline-flex h-11 items-center justify-center rounded-full border border-brand/60 px-7 text-sm font-medium text-ep-fg transition hover:bg-brand/10";
