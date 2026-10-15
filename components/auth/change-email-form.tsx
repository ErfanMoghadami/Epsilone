"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ChangeEmailFormProps = {
  redirectPath: string;
};

export default function ChangeEmailForm({
  redirectPath,
}: ChangeEmailFormProps) {
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setError("بارگذاری حساب کاربری ممکن نشد.");
        setLoading(false);
        return;
      }

      setCurrentEmail(user.email ?? "");
      setLoading(false);
    }

    loadUser();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    const email = newEmail.trim().toLowerCase();

    if (!email) {
      setError("لطفاً ایمیل جدیدت رو وارد کن.");
      return;
    }

    if (email === currentEmail.toLowerCase()) {
      setError("ایمیل جدید باید با ایمیل فعلی‌ت فرق داشته باشه.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser(
      {
        email,
      },
      {
        emailRedirectTo: `${window.location.origin}${redirectPath}`,
      },
    );

    if (error) {
      console.error("Change email error:", error);
      setError(error.message);
      setSubmitting(false);
      return;
    }

    setNewEmail("");

    setMessage(
      "لینک تأیید برای ایمیل فعلی و ایمیل جدیدت ارسال شد.",
    );

    setSubmitting(false);
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <p className="text-sm text-zinc-500">در حال بارگذاری...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium">تغییر ایمیل</h2>

        <p className="mt-1 text-sm text-zinc-500">
          ایمیلی که با اون وارد Epsilone می‌شی رو تغییر بده.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="current-email"
            className="mb-2 block text-sm font-medium text-white/80"
          >
            ایمیل فعلی
          </label>

          <input
            id="current-email"
            type="email"
            dir="ltr"
            value={currentEmail}
            readOnly
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="new-email"
            className="mb-2 block text-sm font-medium text-white/80"
          >
            ایمیل جدید
          </label>

          <input
            id="new-email"
            type="email"
            autoComplete="email"
            dir="ltr"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="new@example.com"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.06]"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "در حال ارسال..." : "تغییر ایمیل"}
        </button>
      </form>
    </section>
  );
}