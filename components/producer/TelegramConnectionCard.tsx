
"use client";

import { FormEvent, useEffect, useState } from "react";

type ConnectionStatus =
  | "loading"
  | "linked"
  | "unlinked"
  | "error";

type ApiResponse = {
  success?: boolean;
  linked?: boolean;
  message?: string;
  error?: string;
};

export default function TelegramConnectionCard() {
  const [status, setStatus] =
    useState<ConnectionStatus>("loading");

  const [code, setCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadStatus() {
    setStatus("loading");
    setError("");

    try {
      const response = await fetch(
        "/api/producer/telegram",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "بررسی وضعیت اتصال ممکن نشد.",
        );
      }

      setStatus(data.linked ? "linked" : "unlinked");
    } catch (error) {
      setStatus("error");

      setError(
        error instanceof Error
          ? error.message
          : "ارتباط برقرار نشد.",
      );
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleConnect(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedCode = code.trim().toUpperCase();

    if (!/^[A-HJ-NP-Z2-9]{10}$/.test(normalizedCode)) {
      setError("کد واردشده معتبر نیست.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        "/api/producer/telegram",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: normalizedCode,
          }),
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "اتصال حساب تلگرام انجام نشد.",
        );
      }

      setCode("");
      setStatus("linked");

      setMessage(
        data.message ?? "حساب تلگرام متصل شد.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "اتصال تلگرام انجام نشد.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      "از قطع اتصال حساب تلگرام مطمئنی؟",
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setBusy(true);

    try {
      const response = await fetch(
        "/api/producer/telegram",
        {
          method: "DELETE",
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "قطع اتصال انجام نشد.",
        );
      }

      setStatus("unlinked");

      setMessage(
        data.message ?? "اتصال تلگرام قطع شد.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "قطع اتصال انجام نشد.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-6">
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">
            اتصال Telegram
          </h2>

          {status === "linked" && (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              متصل
            </span>
          )}

          {status === "unlinked" && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              متصل نیست
            </span>
          )}

          {status === "loading" && (
            <span className="text-xs text-white/40">
              در حال بررسی...
            </span>
          )}
        </div>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          حساب تلگرامت رو به Producer Profile متصل کن تا
          اعلان‌های مربوط به فعالیت‌های حساب Epsilone رو
          دریافت کنی.
        </p>
      </div>

      {status === "loading" && (
        <p className="text-sm text-white/50">
          در حال دریافت وضعیت اتصال...
        </p>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <p className="text-sm text-red-300">
            {error}
          </p>

          <button
            type="button"
            onClick={loadStatus}
            disabled={busy}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5 disabled:opacity-50"
          >
            بررسی مجدد
          </button>
        </div>
      )}

      {status === "unlinked" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">
              مرحله اول
            </p>

            <p className="mt-1 text-sm leading-6 text-zinc-400">
              ربات Epsilone رو در تلگرام باز کن و دستور
              زیر رو بفرست:
            </p>

            <code className="mt-3 inline-block rounded-lg bg-black px-4 py-2 text-sm text-emerald-300">
              /link
            </code>

            <a
              href="https://t.me/EpsiloneAiBot"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm text-white underline underline-offset-4"
            >
              باز کردن Epsilone Telegram Bot
            </a>
          </div>

          <form
            onSubmit={handleConnect}
            className="space-y-3"
          >
            <div>
              <label
                htmlFor="telegram-link-code"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                کد اتصال
              </label>

              <input
                id="telegram-link-code"
                type="text"
                dir="ltr"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={10}
                value={code}
                onChange={(event) => {
                  const value = event.target.value
                    .toUpperCase()
                    .replace(/[^A-HJ-NP-Z2-9]/g, "")
                    .slice(0, 10);

                  setCode(value);
                  setError("");
                }}
                placeholder="XXXXXXXXXX"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center font-mono tracking-[0.3em] text-white outline-none transition placeholder:text-white/20 focus:border-white/30"
              />

              <p className="mt-2 text-xs text-zinc-500">
                کد فقط ۱۰ دقیقه اعتبار داره و یک‌بار قابل
                استفاده است.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy || code.length !== 10}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy
                ? "در حال اتصال..."
                : "اتصال حساب تلگرام"}
            </button>
          </form>
        </div>
      )}

      {status === "linked" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
            <p className="text-sm font-medium text-emerald-300">
              حساب تلگرام متصل است.
            </p>

            <p className="mt-1 text-sm leading-6 text-zinc-400">
              اتصال Producer Profile به ربات Epsilone با
              موفقیت ثبت شده است.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDisconnect}
            disabled={busy}
            className="rounded-xl border border-red-500/20 px-4 py-3 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {busy
              ? "در حال انجام..."
              : "قطع اتصال Telegram"}
          </button>
        </div>
      )}

      {error && status !== "error" && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}
    </section>
  );
}
