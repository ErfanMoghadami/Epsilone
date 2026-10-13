"use client";

import AuthShell, { GoogleIcon } from "@/components/auth/AuthShell";
import { authFieldClass, authTextareaClass, authPrimaryButtonClass, authSecondaryButtonClass, authErrorClass, authSuccessClass, authDividerLineClass } from "@/components/auth/authStyles";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProducerSignupPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

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
          `?next=/producer/setup&mode=producer-signup`,
      },
    });

    if (error) {
      console.error("Google producer signup error:", error);
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleSignup(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/auth/producer-signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            displayName: displayName.trim(),
            username: username.trim().toLowerCase(),
            bio: bio.trim(),
            email: email.trim(),
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Producer signup failed. Please try again.",
        );
      }

      router.push(
        `/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&type=signup&next=${encodeURIComponent("/producer/setup")}`,
      );
    } catch (error) {
      console.error("Producer signup error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ep-brand-text">Producer</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">ساخت حساب پرودیوسر</h1>
        <p className="mt-3 text-sm leading-7 text-ep-muted">حساب بساز و بیت‌هات رو در Epsilone عرضه کن.</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="display-name" className="sr-only">نام نمایشی</label>
          <input id="display-name" type="text" dir="auto" placeholder="نام نمایشی" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} required disabled={loading} className={authFieldClass} />
        </div>

        <div>
          <label htmlFor="username" className="sr-only">نام کاربری</label>
          <div className="flex h-14 items-center rounded-2xl border border-ep-border bg-ep-field px-4 transition focus-within:border-brand">
            <span className="text-sm text-ep-muted">@</span>
            <input id="username" type="text" dir="ltr" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))} maxLength={30} required disabled={loading} className="w-full bg-transparent px-2 text-sm text-ep-fg outline-none placeholder:text-ep-muted" />
          </div>
        </div>

        <div>
          <label htmlFor="bio" className="sr-only">معرفی کوتاه</label>
          <textarea id="bio" dir="auto" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="کمی درباره خودت و سبک بیت‌هات بنویس..." maxLength={300} rows={4} required disabled={loading} className={`${authTextareaClass} min-h-28`} />
          <p className="mt-2 text-left text-xs text-ep-muted">{bio.length}/300</p>
        </div>

        <div>
          <label htmlFor="email" className="sr-only">ایمیل</label>
          <input id="email" type="email" dir="ltr" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required disabled={loading} className={authFieldClass} />
        </div>

        <div>
          <label htmlFor="password" className="sr-only">رمز عبور</label>
          <input id="password" type="password" dir="ltr" placeholder="رمز عبور (حداقل ۸ کاراکتر)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required disabled={loading} className={authFieldClass} />
        </div>

        {error && <div role="alert" className={authErrorClass}>{error}</div>}
        {message && <div role="status" className={authSuccessClass}>{message}</div>}

        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? "در حال ساخت حساب..." : "ساخت حساب پرودیوسر"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4" aria-hidden="true">
        <div className={authDividerLineClass} />
        <span className="text-xs text-ep-muted">یا</span>
        <div className={authDividerLineClass} />
      </div>

      <button type="button" onClick={handleGoogleSignup} disabled={loading} className={authSecondaryButtonClass}>
        <GoogleIcon />
        ثبت‌نام با گوگل
      </button>

      <p className="mt-6 text-center text-xs text-ep-muted">
        قبلاً حساب پرودیوسر ساختی؟{" "}
        <Link href="/producer/login" className="text-ep-brand-text transition hover:opacity-80">ورود</Link>
      </p>

      <Link href="/signup" className="mt-4 block text-center text-xs text-ep-muted transition hover:text-ep-fg">
        ساخت حساب کاربری عادی
      </Link>
    </AuthShell>
  );
}
