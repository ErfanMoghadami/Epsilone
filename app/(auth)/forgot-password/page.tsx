"use client";

import AuthShell from "@/components/auth/AuthShell";
import { authFieldClass, authPrimaryButtonClass, authErrorClass, authSuccessClass, authLinkClass } from "@/components/auth/authStyles";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/update-password`,
      },
    );

    if (error) {
      console.error("Password reset error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "If an account exists with this email, a password reset link has been sent.",
    );

    setLoading(false);
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <Link href="/login" className={authLinkClass}>← بازگشت به ورود</Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">رمز عبورت رو فراموش کردی؟</h1>
        <p className="mt-3 text-sm leading-7 text-ep-muted">ایمیلت رو وارد کن تا لینک ساخت رمز عبور جدید رو برات بفرستیم.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">ایمیل</label>
          <input id="email" type="email" dir="ltr" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ایمیل" required disabled={loading} className={authFieldClass} />
        </div>

        {error && <div role="alert" className={authErrorClass}>{error}</div>}
        {message && <div role="status" className={authSuccessClass}>{message}</div>}

        <button type="submit" disabled={loading} className={authPrimaryButtonClass}>
          {loading ? "در حال ارسال..." : "ارسال لینک بازیابی"}
        </button>
      </form>
    </AuthShell>
  );
}
