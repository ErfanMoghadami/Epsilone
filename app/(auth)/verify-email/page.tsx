"use client";

import AuthShell from "@/components/auth/AuthShell";
import { authFieldClass, authPrimaryButtonClass, authErrorClass, authSuccessClass, authLinkClass } from "@/components/auth/authStyles";

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
    <AuthShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ep-brand-text">Email verification</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">ایمیلت رو بررسی کن</h1>
        <p className="mt-3 text-sm leading-7 text-ep-muted">
          کد ۸ رقمی ارسال‌شده به{" "}
          {email ? <span dir="ltr" className="break-all font-medium text-ep-fg">{email}</span> : "ایمیل شما"}
          {" "}رو وارد کن.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="otp" className="sr-only">کد تأیید</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{8}"
            maxLength={8}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="۰۰۰۰۰۰۰۰"
            required
            disabled={loading}
            dir="ltr"
            className={`${authFieldClass} text-center text-2xl tracking-[0.35em]`}
          />
        </div>

        {error && <div role="alert" className={authErrorClass}>{error}</div>}
        {message && <div role="status" className={authSuccessClass}>{message}</div>}

        <button type="submit" disabled={loading || otp.length !== 8} className={authPrimaryButtonClass}>
          {loading ? "در حال بررسی..." : "تأیید ایمیل"}
        </button>
      </form>

      <div className="mt-5 text-center">
        <button type="button" onClick={handleResend} disabled={resending || loading || cooldown > 0} className="text-sm font-medium text-ep-brand-text transition hover:opacity-80 disabled:opacity-50">
          {resending ? "در حال ارسال کد جدید..." : cooldown > 0 ? `ارسال دوباره تا ${cooldown} ثانیه` : "ارسال دوباره کد"}
        </button>
      </div>

      <p className="mt-5 text-center text-xs leading-6 text-ep-muted">
        قبلاً حساب ساختی؟{" "}
        <Link href={nextPath === "/producer/setup" ? "/producer/login" : "/login"} className="text-ep-brand-text hover:opacity-80">وارد شو</Link>
      </p>

      <p className="mt-4 text-center text-xs text-ep-muted">
        ایمیل اشتباهه؟{" "}
        <Link href={nextPath === "/producer/setup" ? "/producer/signup" : "/signup"} className={authLinkClass}>بازگشت به ثبت‌نام</Link>
      </p>
    </AuthShell>
  );
}
