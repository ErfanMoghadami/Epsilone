"use client";

import { useEffect, useRef } from "react";

const LINE_COUNT = 18;
const VB_W = 680;
const VB_H = 320;
const STEP = 12; // فاصله‌ی نقطه‌ها (کمتر = نرم‌تر ولی سنگین‌تر)
const LOOP_SECONDS = 10;
const FRAME_MS = 1000 / 30; // سقف ۳۰ فریم بر ثانیه

export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    // مقدارهایی که فقط یک بار محاسبه می‌شن
    const xs: number[] = [];
    for (let x = 0; x <= VB_W; x += STEP) xs.push(x);

    const angle = xs.map((x) => (x / VB_W) * Math.PI * 2);
    const envelope = xs.map((x) => Math.sin((x / VB_W) * Math.PI));

    const lines = Array.from({ length: LINE_COUNT }, (_, i) => ({
      offset: (i - LINE_COUNT / 2) * 3.6 * (34 / LINE_COUNT),
      phase: i * 0.09 * (34 / LINE_COUNT),
      amp: 70 + Math.sin(i * 0.3) * 10,
    }));

    let width = 0;
    let height = 0;
    let gradient: CanvasGradient;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.55;

      const sx = width / VB_W;
      const sy = height / VB_H;

      for (const line of lines) {
        ctx.beginPath();

        for (let k = 0; k < xs.length; k++) {
          const y =
            VB_H / 2 +
            line.offset +
            Math.sin(angle[k] + line.phase + time) * line.amp * envelope[k];

          if (k === 0) ctx.moveTo(xs[k] * sx, y * sy);
          else ctx.lineTo(xs[k] * sx, y * sy);
        }

        ctx.stroke();
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(255,127,92,0.15)");
      gradient.addColorStop(0.5, "rgba(255,127,92,0.9)");
      gradient.addColorStop(1, "rgba(255,127,92,0.15)");

      draw(0);
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // کاربرانی که انیمیشن کم رو انتخاب کردن: تصویر ثابت
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => resizeObserver.disconnect();
    }

    let frame = 0;
    let last = 0;
    const start = performance.now();

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      // توی تب مخفی نمی‌کشه، و فریم‌ها رو روی ۳۰ در ثانیه نگه می‌داره
      if (document.hidden || now - last < FRAME_MS) return;
      last = now;

      const progress = ((now - start) / 1000 / LOOP_SECONDS) % 1;
      draw(progress * Math.PI * 2);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-56 w-full sm:h-72"
    />
  );
}