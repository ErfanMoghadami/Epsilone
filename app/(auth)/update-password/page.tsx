"use client";

import AuthShell from "@/components/auth/AuthShell";
import { authFieldClass, authPrimaryButtonClass, authErrorClass, authSuccessClass, authLinkClass } from "@/components/auth/authStyles";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [sessionReady, setSessionReady] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setSessionReady(true);
        setInitializing(false);
        setError("");
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) {
          setSessionReady(true);
        }

        setInitializing(false);
      })
      .catch((error) => {
        console.error("Password recovery session error:", error);
        setError("This password reset link is invalid or expired.");
        setInitializing(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!sessionReady) {
      setError("Your password reset session is not ready.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Update password error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Your password has been changed successfully.");

    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  if (initializing) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <div className="h-2 w-16 animate-pulse rounded-full bg-brand/70" />
          <p className="text-sm text-ep-muted">در حال بررسی لینک بازیابی رمز عبور...</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <Link href="/login" className={authLinkClass}>← بازگشت به ورود</Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">ساخت رمز عبور جدید</h1>
        <p className="mt-3 text-sm leading-7 text-ep-muted">رمز عبور جدیدت رو وارد کن.</p>
      </div>

      {!sessionReady ? (
        <div className="space-y-4">
          <div role="alert" className={authErrorClass}>{error || "This password reset link is invalid or expired."}</div>
          <Link href="/forgot-password" className="block text-center text-sm text-ep-brand-text transition hover:opacity-80">درخواست لینک جدید</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">رمز عبور جدید</label>
            <input id="password" type="password" dir="ltr" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="رمز عبور جدید (حداقل ۸ کاراکتر)" minLength={8} required disabled={loading} className={authFieldClass} />
          </div>

          <div>
            <label htmlFor="confirm-password" className="sr-only">تکرار رمز عبور</label>
            <input id="confirm-password" type="password" dir="ltr" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="تکرار رمز عبور" minLength={8} required disabled={loading} className={authFieldClass} />
          </div>

          {error && <div role="alert" className={authErrorClass}>{error}</div>}
          {message && <div role="status" className={authSuccessClass}>{message}</div>}

          <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
            {loading ? "در حال ذخیره..." : "تغییر رمز عبور"}
          </button>

          {message && <Link href="/login" className="block text-center text-sm text-ep-brand-text transition hover:opacity-80">بازگشت به ورود</Link>}
        </form>
      )}
    </AuthShell>
  );
}
