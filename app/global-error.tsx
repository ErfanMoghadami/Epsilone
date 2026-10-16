"use client";

import { useEffect } from "react";
import { Vazirmatn, Jura } from "next/font/google";
import "./globals.css";
import StatusScreen, {
  statusPrimaryClass,
  statusSecondaryClass,
} from "@/components/StatusScreen";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
});

const jura = Jura({
  variable: "--font-jura",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

// Same rule as the root layout (without the Iran-time mode): global-error
// replaces the layout, so the day/night class has to be restored here.
const themeInitScript = `
(function () {
  try {
    var mode = localStorage.getItem("epsilone-theme-mode");
    var dark = mode === "dark" ||
      (mode !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();
`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${vazirmatn.variable} ${jura.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <StatusScreen
          code="ERROR"
          title="برنامه با مشکل روبه‌رو شد"
          description="یه خطای جدی پیش اومد. صفحه رو دوباره بارگذاری کن؛ اگه تکرار شد، چند دقیقه‌ی دیگه سر بزن."
          detail={
            process.env.NODE_ENV === "development"
              ? `${error.message}${error.digest ? `\n(digest: ${error.digest})` : ""}`
              : undefined
          }
        >
          <button
            type="button"
            onClick={() => reset()}
            className={statusPrimaryClass}
          >
            تلاش دوباره
          </button>
          {/* لینک ساده (نه next/link): توی global-error ممکنه روتر سالم نباشه */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={statusSecondaryClass}>
            بازگشت به خانه
          </a>
        </StatusScreen>
      </body>
    </html>
  );
}
