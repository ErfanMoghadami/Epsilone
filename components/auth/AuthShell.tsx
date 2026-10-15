import type { ReactNode } from "react";
import EpsiloneMark2 from "@/components/EpsiloneMark2";

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main
      dir="rtl"
      className="font-fa relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-ep-bg text-ep-fg"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16">
        <section className="mx-auto w-full max-w-md lg:mx-0">{children}</section>

        <div
          aria-hidden="true"
          className="relative mx-auto hidden aspect-square w-full max-w-[34rem] lg:block"
        >
          <div className="pointer-events-none absolute inset-[12%] rounded-full  blur-3xl" />

          <div className="absolute inset-0 animate-[spin_90s_linear_infinite] motion-reduce:animate-none">
            <div className="absolute inset-[3%] rounded-full border border-[color:var(--ep-orbit)]" />
            <span className="absolute left-1/2 top-[3%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] bg-brand" />
            <span className="absolute bottom-[28%] right-[3%] h-2 w-2 rounded-full bg-brand" />
          </div>

          <div className="absolute inset-[-8%] animate-[spin_140s_linear_infinite_reverse] motion-reduce:animate-none">
            <div className="absolute inset-[22%] rounded-full border border-[color:var(--ep-orbit)] opacity-70" />
            <span className="absolute left-[22%] top-[50%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
          </div>

          <EpsiloneMark2
            glow
            priority
            className="absolute left-1/2 top-1/2 h-[60%] w-auto -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      </div>
    </main>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
