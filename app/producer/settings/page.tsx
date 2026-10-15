"use client";

import { FormEvent, useEffect, useState } from "react";
import AvatarUploader from "@/components/producer/avatar-uploader";
import ChangeUsernameForm from "@/components/producer/change-username-form";

import { createClient } from "@/lib/supabase/client";
import ChangeEmailForm from "@/components/auth/change-email-form";

export default function ProducerSettingsPage() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [userId, setUserId] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);

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

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setAvatarUrl(profile?.avatar_url ?? null);
      setLoading(false);
    }

    loadUser();
  }, []);

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشه.");
      return;
    }

    if (password !== confirmPassword) {
      setError("رمزهای عبور با هم یکی نیستن.");
      return;
    }

    setChangingPassword(true);

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Change password error:", error);

      setError(error.message);
      setChangingPassword(false);
      return;
    }

    setPassword("");
    setConfirmPassword("");

    setMessage("رمز عبور با موفقیت تغییر کرد.");

    setChangingPassword(false);
  }

  if (loading) {
    return (
      <div className="max-w-xl">
        <h1 className="mb-2 text-2xl font-semibold">تنظیمات حساب</h1>

        <p className="text-sm text-zinc-500">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">تنظیمات حساب</h1>

        <p className="mt-2 text-sm text-zinc-500">
          حساب Epsilone خودت رو مدیریت کن.
        </p>
      </div>
      <AvatarUploader initialAvatarUrl={avatarUrl} />
      <div className="mt-6">
        <ChangeUsernameForm />
      </div>
      <div className="space-y-6">
        {/* User ID */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium">شناسه کاربری</h2>

            <p className="mt-1 text-sm text-zinc-500">
              شناسه حساب شما قابل تغییر نیست.
            </p>
          </div>

          <input
            type="text"
            dir="ltr"
            value={userId}
            readOnly
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50 outline-none"
          />
        </section>

        {/* Email */}
        <ChangeEmailForm redirectPath="/producer/settings" />

        {/* Password */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium">تغییر رمز عبور</h2>

            <p className="mt-1 text-sm text-zinc-500">
              رمز عبوری که باهاش وارد می‌شی رو تغییر بده.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                رمز عبور جدید
              </label>

              <input
                id="new-password"
                type="password"
                dir="ltr"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                تکرار رمز عبور جدید
              </label>

              <input
                id="confirm-password"
                type="password"
                dir="ltr"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changingPassword ? "در حال به‌روزرسانی..." : "تغییر رمز عبور"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
