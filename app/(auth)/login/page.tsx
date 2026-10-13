"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import EpsiloneMark2 from "@/components/EpsiloneMark2";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          `${window.location.origin}/auth/callback` +
          `?next=/&mode=client-login`,
      },
    });

    if (error) {
      console.error("Google login error:", error);
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        // Account exists but the email was never verified -> send to OTP page.
        if (loginError.code === "email_not_confirmed") {
          await supabase.auth.resend({ type: "signup", email: cleanEmail });
          router.push(
            `/verify-email?email=${encodeURIComponent(cleanEmail)}&next=${encodeURIComponent("/")}`,
          );
          return;
        }

        setError(
          loginError.code === "invalid_credentials"
            ? "ایمیل یا رمز عبور اشتباه است."
            : loginError.message,
        );
        return;
      }

      if (!data.user) {
        setError("حساب کاربری پیدا نشد.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, username")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        setError("بارگذاری حساب ممکن نشد.");
        return;
      }

      if (!profile) {
        setError("پروفایل حساب شما پیدا نشد.");
        return;
      }

      if (profile.role === "producer") {
        if (!profile.username) {
          router.push("/producer/setup");
        } else {
          router.push(`/producer/${encodeURIComponent(profile.username)}`);
        }
      } else if (profile.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }

      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      setError("مشکلی پیش اومد، دوباره تلاش کن.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "h-14 w-full rounded-2xl border border-ep-border bg-ep-field px-5 text-sm text-ep-fg outline-none transition placeholder:text-ep-muted focus:border-brand disabled:opacity-50";

  return (
    <main
      dir="rtl"
      className="font-fa relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-ep-bg text-ep-fg"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16">
        {/* Form (right side in RTL) */}
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <h1 className="mb-8 text-3xl font-bold tracking-tight">خوش آمدی</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                ایمیل
              </label>
              <input
                id="email"
                type="email"
                dir="auto"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ایمیل"
                autoComplete="email"
                required
                disabled={loading}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                رمز عبور
              </label>
              <input
                id="password"
                type="password"
                dir="auto"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور"
                autoComplete="current-password"
                required
                disabled={loading}
                className={fieldClass}
              />
            </div>

            <div>
              <Link
                href="/forgot-password"
                className="text-xs text-ep-brand-text transition hover:opacity-80"
              >
                رمز عبورت رو فراموش کردی؟
              </Link>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="glass-btn h-12 w-full rounded-2xl text-sm font-bold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "در حال ورود..." : "ورود"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4" aria-hidden="true">
            <div className="h-0.5 flex-1 rounded-full bg-ep-border" />
            <span className="text-xs text-ep-muted">یا</span>
            <div className="h-0.5 flex-1 rounded-full bg-ep-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-ep-border bg-ep-field text-sm text-ep-fg transition hover:border-brand/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"
              />
              <path
                fill="#FBBC05"
                d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
              />
            </svg>
            ادامه با گوگل
          </button>

          <p className="mt-6 text-center text-xs text-ep-muted">
            حساب کاربری ندارم ،{" "}
            <Link
              href="/signup"
              className="text-ep-brand-text transition hover:opacity-80"
            >
              ثبت نام
            </Link>
          </p>

          <Link
            href="/producer/login"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-2xl border border-ep-border bg-ep-field text-sm text-ep-fg transition hover:border-brand/60"
          >
            آهنگسازی؟ ورود به پنل
          </Link>
        </div>

        {/* Art (left side in RTL) */}
        <div
          aria-hidden="true"
          className="relative mx-auto hidden aspect-square w-full max-w-[34rem] lg:block"
        >
          <div className="pointer-events-none absolute inset-[12%] rounded-full bg-brand/10 blur-3xl" />

          {/* orbit rings */}
          <div className="absolute inset-0 animate-[spin_90s_linear_infinite] motion-reduce:animate-none">
            <div className="absolute inset-[3%] rounded-full border border-[color:var(--ep-orbit)]" />
            <span className="absolute top-[3%] left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] bg-brand" />
            <span className="absolute right-[3%] bottom-[28%] h-2 w-2 rounded-full bg-brand" />
          </div>
          <div className="absolute inset-[-8%] animate-[spin_140s_linear_infinite_reverse] motion-reduce:animate-none">
            <div className="absolute inset-[22%] rounded-full border border-[color:var(--ep-orbit)] opacity-70" />
            <span className="absolute top-[50%] left-[22%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
          </div>

          <EpsiloneMark2
            glow
            priority
            className="absolute top-1/2 left-1/2 h-[60%] w-auto -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      </div>
    </main>
  );
}
