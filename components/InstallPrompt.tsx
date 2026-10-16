"use client";

import { useEffect, useState } from "react";

// Chrome / Edge / Samsung Internet (Android) fire this; it isn't in lib.dom yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "epsilone-install-dismissed-at";
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && safari;
}

/**
 * Top banner that suggests installing the web app.
 * - Android (Chrome/Edge/Samsung): uses the native `beforeinstallprompt` flow.
 * - iOS Safari has no install event, so it shows a short "Add to Home Screen" hint.
 * Hidden when already installed, and for 7 days after the user closes it.
 * Only works over HTTPS with the manifest + service worker (production build).
 */
export default function InstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    function onBeforeInstall(event: Event) {
      // keep the browser's own mini-infobar from showing; we show ours
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function onInstalled() {
      setVisible(false);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIosSafari()) {
      timer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // storage can be blocked; the banner just won't be remembered
    }
  }

  async function install() {
    if (!installEvent) return;

    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;

    // the event can only be used once
    setInstallEvent(null);
    if (outcome === "accepted") setVisible(false);
    else dismiss();
  }

  if (!visible || (!installEvent && !iosHint)) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="نصب Epsilone"
      className="install-prompt font-fa fixed inset-x-0 top-0 z-[60] px-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="glass-bar glass-card mx-auto flex max-w-xl items-center gap-3 rounded-2xl p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ep-fg">
            Epsilone رو نصب کن
          </p>
          <p className="truncate text-xs text-ep-muted">
            {iosHint
              ? "دکمه‌ی Share و بعد «Add to Home Screen»"
              : "سریع‌تر باز می‌شه و مثل یه اپ کامل اجرا می‌شه"}
          </p>
        </div>

        {installEvent ? (
          <button
            type="button"
            onClick={install}
            className="glass-btn h-9 shrink-0 rounded-full px-5 text-xs font-semibold text-ink transition hover:brightness-110"
          >
            نصب
          </button>
        ) : null}

        <button
          type="button"
          onClick={dismiss}
          aria-label="بستن"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ep-muted transition hover:bg-brand/10 hover:text-ep-fg"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
