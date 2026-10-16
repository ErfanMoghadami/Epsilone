import LMark from "@/components/LMark";
import WaveBackground from "@/components/WaveBackground";

/**
 * Full-screen branded loading state (used by app/loading.tsx).
 * Layout follows the Android splash: mark on a tile, brand line underneath,
 * but styled with the home page's tokens so it flips with day / night mode.
 */
export default function BrandLoader({
  label = "در حال بارگذاری…",
}: {
  label?: string;
}) {
  return (
    <main
      dir="rtl"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="font-fa relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-ep-bg px-6 text-ep-fg"
    >
      {/* soft halo behind the tile */}
      <div
        aria-hidden="true"
        className="loader-halo pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-[62%] rounded-full blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="loader-tile glass-card flex h-28 w-28 items-center justify-center rounded-[28px] sm:h-32 sm:w-32">
          <LMark animated className="h-14 w-auto sm:h-16" />
        </div>

        <p
          dir="ltr"
          className="font-logo mt-9 text-center text-lg font-light tracking-[0.18em] text-ep-fg sm:text-xl"
        >
          Epsilone
        </p>
        <p
          dir="ltr"
          className="mt-1.5 text-center text-[11px] tracking-[0.28em] text-ep-muted uppercase"
        >
          Mood to Beat
        </p>

        <div
          aria-hidden="true"
          className="loader-track mt-8 h-[3px] w-28 overflow-hidden rounded-full"
        >
          <span className="loader-bar block h-full w-1/2 rounded-full" />
        </div>
      </div>

      <span className="sr-only">{label}</span>

      <WaveBackground />
    </main>
  );
}
