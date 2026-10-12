"use client";

import { useEffect, useRef } from "react";

const LINE_COUNT = 34; // بیشتر = پرتر و بافته‌تر
const VB_WIDTH = 680;
const VB_HEIGHT = 320;
const SAMPLE_STEP = 8; // کمتر = نرم‌تر ولی سنگین‌تر
const LOOP_SECONDS = 10; // مدت یک دور کامل (بی‌درز)

function buildPath(index: number, time: number) {
  const off = (index - LINE_COUNT / 2) * 3.6;
  const phase = index * 0.09 + time;
  const amp = 70 + Math.sin(index * 0.3) * 10;
  let d = "";

  for (let x = 0; x <= VB_WIDTH; x += SAMPLE_STEP) {
    // خطوط رو به لبه‌ها جمع می‌شن و وسط پهن می‌شن
    const envelope = Math.sin((x / VB_WIDTH) * Math.PI);
    const y =
      VB_HEIGHT / 2 +
      off +
      Math.sin((x / VB_WIDTH) * Math.PI * 2 + phase) * amp * envelope;
    d += (x === 0 ? "M" : "L") + x + "," + y.toFixed(1) + " ";
  }

  return d;
}

export default function WaveBackground() {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const draw = (time: number) => {
      pathRefs.current.forEach((path, i) => {
        path?.setAttribute("d", buildPath(i, time));
      });
    };

    draw(0);

    // کاربرانی که انیمیشن کم رو انتخاب کردن: فقط تصویر ثابت
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = ((now - start) / 1000 / LOOP_SECONDS) % 1;
      draw(progress * Math.PI * 2);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      aria-hidden="true"
      // className="pointer-events-none absolute inset-x-0 bottom-0 h-56 sm:h-72"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-56 sm:h-72"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, black 35%, black 75%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 35%, black 75%, transparent)",
      }}
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveHeroGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff7f5c" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#ff7f5c" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff7f5c" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <g>
          {Array.from({ length: LINE_COUNT }).map((_, i) => (
            <path
              key={i}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              fill="none"
              stroke="url(#waveHeroGradient)"
              strokeWidth="0.6"
              opacity="0.55"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
