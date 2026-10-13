"use client";

import AuthShell, { GoogleIcon } from "@/components/auth/AuthShell";
import { authFieldClass, authPrimaryButtonClass, authSecondaryButtonClass, authErrorClass, authDividerLineClass } from "@/components/auth/authStyles";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ProducerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (loginError) {
        // Producer signed up but never verified the email -> OTP page.
        if (loginError.code === "email_not_confirmed") {
          await supabase.auth.resend({
            type: "signup",
            email: normalizedEmail,
          });
          router.push(
            `/verify-email?email=${encodeURIComponent(normalizedEmail)}&next=${encodeURIComponent("/producer/setup")}`,
          );
          return;
        }

        setError("Invalid email or password.");
        return;
      }

      if (!data.user) {
        setError("User account was not found.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, username")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        await supabase.auth.signOut();
        setError("Could not load your account.");
        return;
      }

      if (!profile) {
        await supabase.auth.signOut();
        setError("Your account profile was not found.");
        return;
      }

      if (profile.role !== "producer") {
        await supabase.auth.signOut();
        setError("This account is not registered as a producer.");
        return;
      }

      if (!profile.username) {
        router.push("/producer/setup");
      } else {
        router.push(`/producer/${encodeURIComponent(profile.username)}`);
      }

      router.refresh();
    } catch (error) {
      console.error("Producer login error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          `${window.location.origin}/auth/callback` +
          `?next=${encodeURIComponent("/producer/setup")}` +
          `&mode=producer-login`,
      },
    });

    if (error) {
      console.error("Google producer login error:", error);
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ep-brand-text">Producer</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">ورود پرودیوسر</h1>
        <p className="mt-3 text-sm leading-7 text-ep-muted">برای مدیریت بیت‌ها و حساب پرودیوسرت وارد شو.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">ایمیل</label>
          <input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل" autoComplete="email" required disabled={loading} className={authFieldClass} />
        </div>

        <div>
          <label htmlFor="password" className="sr-only">رمز عبور</label>
          <input id="password" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور" autoComplete="current-password" required disabled={loading} className={authFieldClass} />
          <div className="mt-3 flex justify-start">
            <Link href="/producer/forgot-password" className="text-xs text-ep-brand-text transition hover:opacity-80">رمز عبورت رو فراموش کردی؟</Link>
          </div>
        </div>

        {error && <div role="alert" className={authErrorClass}>{error}</div>}

        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? "در حال ورود..." : "ورود به پنل پرودیوسر"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4" aria-hidden="true">
        <div className={authDividerLineClass} />
        <span className="text-xs text-ep-muted">یا</span>
        <div className={authDividerLineClass} />
      </div>

      <button type="button" onClick={handleGoogleLogin} disabled={loading} className={authSecondaryButtonClass}>
        <GoogleIcon />
        ادامه با گوگل
      </button>

      <p className="mt-6 text-center text-xs text-ep-muted">
        حساب پرودیوسر نداری؟{" "}
        <Link href="/producer/signup" className="text-ep-brand-text transition hover:opacity-80">ساخت حساب</Link>
      </p>

      <Link href="/login" className="mt-8 flex h-12 w-full items-center justify-center rounded-2xl border border-ep-border bg-ep-field text-sm text-ep-fg transition hover:border-brand/60">
        بازگشت به ورود کاربران
      </Link>
    </AuthShell>
  );
}
