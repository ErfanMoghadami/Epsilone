"use client";

import { FormEvent, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import ChangeEmailForm from "@/components/auth/change-email-form";

export default function SettingsPage() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [authProviders, setAuthProviders] = useState<string[]>([]);
  const [accountEmail, setAccountEmail] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // --------------------------------------------------------
  // Load account + authentication method
  // --------------------------------------------------------

  useEffect(() => {
    async function loadAccount() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Get user error:", userError);

        setError(
          userError?.message ||
            "بارگذاری حساب کاربری ممکن نشد.",
        );

        setLoadingAccount(false);
        return;
      }

      setAccountEmail(user.email ?? "");

      // ----------------------------------------------------
      // Load profile
      // ----------------------------------------------------

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "Profile lookup error:",
          profileError,
        );

        setError("بارگذاری پروفایل ممکن نشد.");
        setLoadingAccount(false);
        return;
      }

      setDisplayName(profile?.display_name ?? "");

      // ----------------------------------------------------
      // Load authentication methods
      // ----------------------------------------------------

      const {
        data: identityData,
        error: identityError,
      } = await supabase.auth.getUserIdentities();

      if (identityError) {
        console.error(
          "Identity lookup error:",
          identityError,
        );

        setError(
          "تشخیص روش ورود به حساب ممکن نشد.",
        );

        setLoadingAccount(false);
        return;
      }

      const providers =
        identityData?.identities.map(
          (identity) => identity.provider,
        ) ?? [];

      setAuthProviders(
        Array.from(new Set(providers)),
      );

      const hasEmailIdentity =
        identityData?.identities.some(
          (identity) => identity.provider === "email",
        ) ?? false;

      setHasPassword(hasEmailIdentity);
      setLoadingAccount(false);
    }

    loadAccount();
  }, []);

  // --------------------------------------------------------
  // Save name
  // --------------------------------------------------------

  async function handleNameSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const trimmedName = displayName.trim();

    if (trimmedName.length > 50) {
      setError("نام باید حداکثر ۵۰ کاراکتر باشه.");
      return;
    }

    setSavingName(true);

    const supabase = createClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: trimmedName || null,
      })
      .eq("id", (
        await supabase.auth.getUser()
      ).data.user?.id);

    if (profileError) {
      console.error(
        "Profile update error:",
        profileError,
      );

      setError(
        profileError.message ||
          "به‌روزرسانی نام ممکن نشد.",
      );

      setSavingName(false);
      return;
    }

    setMessage("نامت با موفقیت به‌روزرسانی شد.");
    setSavingName(false);
  }

  // --------------------------------------------------------
  // Password
  // --------------------------------------------------------

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError(
        "رمز عبور باید حداقل ۸ کاراکتر باشه.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("رمزهای عبور جدید با هم یکی نیستن.");
      return;
    }

    if (hasPassword && !currentPassword) {
      setError(
        "لطفاً رمز عبور فعلی‌ت رو وارد کن.",
      );
      return;
    }

    if (
      hasPassword &&
      currentPassword === newPassword
    ) {
      setError(
        "رمز عبور جدید باید با رمز فعلی‌ت فرق داشته باشه.",
      );
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error } = hasPassword
      ? await supabase.auth.updateUser({
          password: newPassword,
          current_password: currentPassword,
        })
      : await supabase.auth.updateUser({
          password: newPassword,
        });

    if (error) {
      console.error(
        "Password update error:",
        error,
      );

      setError(error.message);
      setLoading(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setMessage(
      hasPassword
        ? "رمز عبورت با موفقیت تغییر کرد."
        : "رمز عبورت با موفقیت تنظیم شد.",
    );

    setHasPassword(true);
    setLoading(false);
  }

  // --------------------------------------------------------
  // Loading
  // --------------------------------------------------------

  if (loadingAccount) {
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">
            تنظیمات
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            حساب Epsilone خودت رو مدیریت کن.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-6">
          <p className="text-sm text-zinc-500">
            در حال بارگذاری...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // Settings
  // --------------------------------------------------------

  return (
    <div className="max-w-2xl">
      {/* Header */}

      <div className="mb-8">
        <h1 className="text-2xl font-semibold">
          تنظیمات
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          حساب Epsilone خودت رو مدیریت کن.
        </p>
      </div>

      {/* Account */}

      <section className="mb-6 rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium">
            حساب کاربری
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            اطلاعات پروفایلت رو مدیریت کن.
          </p>
        </div>

        {/* Name */}

        <form
          onSubmit={handleNameSubmit}
          className="space-y-3"
        >
          <label
            htmlFor="display-name"
            className="block text-sm font-medium text-white/80"
          >
            نام
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              placeholder="نامت رو وارد کن"
              maxLength={50}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.06]"
            />

            <button
              type="submit"
              disabled={savingName}
              className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingName ? "در حال ذخیره..." : "ذخیره"}
            </button>
          </div>

          <p className="text-xs text-zinc-600">
            این نام به‌عنوان نام نمایشی تو در Epsilone استفاده می‌شه.
          </p>
        </form>

        {/* Email */}

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-zinc-500">
              ایمیل
            </span>

            <span className="break-all text-sm text-white">
              <span dir="ltr">{accountEmail || "در دسترس نیست"}</span>
            </span>
          </div>
        </div>

        {/* Authentication */}

        <div className="mt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-zinc-500">
              روش ورود
            </span>

            <div className="flex flex-wrap gap-2">
              {authProviders.length > 0 ? (
                authProviders.map((provider) => (
                  <span
                    key={provider}
                    className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs capitalize text-zinc-300"
                  >
                    {provider}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-500">
                  در دسترس نیست
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Password */}

      <section className="mb-6 rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium">
            {hasPassword
              ? "تغییر رمز عبور"
              : "تنظیم رمز عبور"}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {hasPassword
              ? "رمز عبوری که با اون وارد Epsilone می‌شی رو تغییر بده."
              : "با گوگل وارد شدی. می‌تونی یه رمز عبور بسازی تا با ایمیلت هم بتونی وارد بشی."}
          </p>
        </div>

        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-4"
        >
          {hasPassword && (
            <div>
              <label
                htmlFor="current-password"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                رمز عبور فعلی
              </label>

              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                dir="ltr"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                placeholder="رمز عبور فعلی‌ت رو وارد کن"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.06]"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              {hasPassword
                ? "رمز عبور جدید"
                : "رمز عبور"}
            </label>

            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              placeholder={
                hasPassword
                  ? "رمز عبور جدیدت رو وارد کن"
                  : "یه رمز عبور بساز"
              }
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.06]"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              تکرار رمز عبور
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="رمز عبور رو دوباره وارد کن"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.06]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? hasPassword
                ? "در حال به‌روزرسانی..."
                : "در حال تنظیم رمز عبور..."
              : hasPassword
                ? "تغییر رمز عبور"
                : "تنظیم رمز عبور"}
          </button>
        </form>
      </section>

      {/* Email */}

      <ChangeEmailForm redirectPath="/dashboard/settings" />

      {/* Global messages */}

      {(error || message) && (
        <div className="mt-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && !error && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}