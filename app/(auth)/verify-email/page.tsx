"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN = 60;

function friendlyError(err: unknown, fallback: string) {
  const e = err as { code?: string; message?: string; status?: number } | null;
  const msg = (e?.message ?? "").toLowerCase();

  if (
    e?.code === "otp_expired" ||
    msg.includes("expired") ||
    msg.includes("invalid")
  ) {
    return "That code is wrong or has expired. Request a new one and try again.";
  }
  if (
    e?.status === 429 ||
    e?.code === "over_email_send_rate_limit" ||
    msg.includes("rate limit")
  ) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return e?.message || fallback;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nextPath, setNextPath] = useState("/");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail((params.get("email") ?? "").trim().toLowerCase());
    const requestedNext = params.get("next") ?? "/";
    setNextPath(
      requestedNext.startsWith("/") && !requestedNext.startsWith("//")
        ? requestedNext
        : "/",
    );
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Email address is missing. Please return to sign up.");
      return;
    }
    if (!/^\d{8}$/.test(otp)) {
      setError("Enter the eight-digit code from your email.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (verifyError) throw verifyError;
      if (!data.user)
        throw new Error(
          "Verification succeeded, but no user session was returned.",
        );

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, username")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Profile lookup after OTP verification failed:",
          profileError,
        );
        throw new Error(
          "Your email is verified, but we could not load your profile. Please log in.",
        );
      }

      if (profile?.role === "producer") {
        router.replace(
          profile.username
            ? `/producer/${encodeURIComponent(profile.username)}`
            : "/producer/setup",
        );
      } else if (profile?.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace(nextPath === "/producer/setup" ? "/" : nextPath);
      }
      router.refresh();
    } catch (caught) {
      console.error("OTP verification failed:", caught);
      setError(
        friendlyError(
          caught,
          "That code could not be verified. Request a new one and try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setMessage("");
    if (!email) {
      setError("Email address is missing. Please return to sign up.");
      return;
    }

    setResending(true);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (resendError) throw resendError;
      setMessage(
        "A new verification code has been sent. Check your inbox and spam folder.",
      );
      setOtp("");
      setCooldown(RESEND_COOLDOWN);
    } catch (caught) {
      console.error("OTP resend failed:", caught);
      setError(
        friendlyError(
          caught,
          "Could not resend the code. Please wait a moment and try again.",
        ),
      );
      setCooldown(RESEND_COOLDOWN);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-bold text-black">
            E
          </div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Email verification
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Check your inbox
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Enter the six-digit code sent to{" "}
            {email ? (
              <span className="text-white">{email}</span>
            ) : (
              "your email address"
            )}
            .
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Verification code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{8}"
                maxLength={8}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))
                }
                placeholder="00000000"
                required
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-4 text-center text-2xl tracking-[0.35em] text-white outline-none placeholder:text-neutral-700 focus:border-white/30 disabled:opacity-50"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-400"
              >
                {error}
              </div>
            )}
            {message && (
              <div
                role="status"
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-400"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 8}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify email"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || loading || cooldown > 0}
              className="text-sm font-medium text-white/70 transition hover:text-white disabled:opacity-50"
            >
              {resending
                ? "Sending new code..."
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : "Resend code"}
            </button>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-neutral-600">
            Didn&apos;t get a code? You may already have an account —{" "}
            <Link
              href={
                nextPath === "/producer/setup" ? "/producer/login" : "/login"
              }
              className="text-neutral-400 hover:text-white"
            >
              try logging in
            </Link>
            .
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Wrong email?{" "}
          <Link
            href={
              nextPath === "/producer/setup" ? "/producer/signup" : "/signup"
            }
            className="text-white hover:text-neutral-300"
          >
            Go back to sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
