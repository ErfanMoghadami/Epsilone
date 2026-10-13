"use client";

import AuthShell, { GoogleIcon } from "@/components/auth/AuthShell";
import { authFieldClass, authPrimaryButtonClass, authSecondaryButtonClass, authErrorClass, authSuccessClass, authDividerLineClass } from "@/components/auth/authStyles";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleGoogleSignup() {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          `${window.location.origin}/auth/callback` +
          `?next=/&mode=client-signup`,
      },
    });

    if (error) {
      console.error("Google signup error:", error);
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { role: "buyer" },
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (!data.session) {
        router.push(
          `/verify-email?email=${encodeURIComponent(cleanEmail)}&type=signup&next=${encodeURIComponent("/")}`,
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Signup error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ep-brand-text">Epsilone</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">ساخت حساب کاربری</h1>
        <p className="mt-3 text-sm leading-7 text-ep-muted">برای کشف بیت‌های مناسب حال‌وهوات ثبت‌نام کن.</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">ایمیل</label>
          <input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل" autoComplete="email" required disabled={loading} className={authFieldClass} />
        </div>

        <div>
          <label htmlFor="password" className="sr-only">رمز عبور</label>
          <input id="password" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور (حداقل ۸ کاراکتر)" autoComplete="new-password" required minLength={8} disabled={loading} className={authFieldClass} />
        </div>

        {error && <div role="alert" className={authErrorClass}>{error}</div>}
        {message && <div role="status" className={authSuccessClass}>{message}</div>}

        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? "در حال ساخت حساب..." : "ثبت نام"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4" aria-hidden="true">
        <div className={authDividerLineClass} />
        <span className="text-xs text-ep-muted">یا</span>
        <div className={authDividerLineClass} />
      </div>

      <button type="button" onClick={handleGoogleSignup} disabled={loading} className={authSecondaryButtonClass}>
        <GoogleIcon />
        ادامه با گوگل
      </button>

      <p className="mt-6 text-center text-xs text-ep-muted">
        قبلاً حساب ساختی؟{" "}
        <Link href="/login" className="text-ep-brand-text transition hover:opacity-80">ورود</Link>
      </p>

      <Link href="/producer/signup" className="mt-8 flex h-12 w-full items-center justify-center rounded-2xl border border-ep-border bg-ep-field text-sm text-ep-fg transition hover:border-brand/60">
        پرودیوسری؟ ساخت حساب فروشنده
      </Link>
    </AuthShell>
  );
}
