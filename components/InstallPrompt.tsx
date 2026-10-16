"use client";

import { useEffect, useState } from "react";

// Chrome / Edge / Samsung Internet (Android) fire this; it isn't in lib.dom yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Set the first time the banner is actually shown; after that it never returns.
const SEEN_KEY = "epsilone-install-prompt-seen";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function alreadySeen() {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    // storage blocked: we can't remember anything, so don't nag at all
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // ignore
  }
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && safari;
}

/**
 * Bottom banner that suggests installing the web app.
 * - Android (Chrome/Edge/Samsung): uses the native `beforeinstallprompt` flow.
 * - iOS Safari has no install event, so it shows a short "Add to Home Screen" hint.
 * Shown only once per browser: the first time it appears it is flagged as seen,
 * so it never comes back (close, install, or just ignoring it all count).
 * It sits at the bottom (above the mobile bottom nav) so it never covers the navbar.
 * Only works over HTTPS with the manifest + service worker (production build).
 */
export default function InstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || alreadySeen()) return;

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

  // First real appearance = the one and only time the user gets it.
  useEffect(() => {
    if (visible) markSeen();
  }, [visible]);

  function dismiss() {
    setVisible(false);
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
      className="install-prompt font-fa fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] px-3 md:bottom-4"
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