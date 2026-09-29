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
            "Could not load your account.",
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

        setError("Could not load your profile.");
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
          "Could not determine your authentication method.",
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
      setError("Name must be 50 characters or less.");
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
          "Could not update your name.",
      );

      setSavingName(false);
      return;
    }

    setMessage("Your name has been updated successfully.");
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
        "Password must be at least 8 characters.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (hasPassword && !currentPassword) {
      setError(
        "Please enter your current password.",
      );
      return;
    }

    if (
      hasPassword &&
      currentPassword === newPassword
    ) {
      setError(
        "Your new password must be different from your current password.",
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
        ? "Your password has been changed successfully."
        : "Your password has been set successfully.",
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
            Settings
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Manage your Epsilone account.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Loading account settings...
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
          Settings
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Manage your Epsilone account.
        </p>
      </div>

      {/* Account */}

      <section className="mb-6 rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium">
            Account
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Manage your profile information.
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
            Name
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              placeholder="Enter your name"
              maxLength={50}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.06]"
            />

            <button
              type="submit"
              disabled={savingName}
              className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingName ? "Saving..." : "Save"}
            </button>
          </div>

          <p className="text-xs text-zinc-600">
            This name will be used as your display name on
            Epsilone.
          </p>
        </form>

        {/* Email */}

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-zinc-500">
              Email
            </span>

            <span className="break-all text-sm text-white">
              {accountEmail || "Not available"}
            </span>
          </div>
        </div>

        {/* Authentication */}

        <div className="mt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-zinc-500">
              Sign-in method
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
                  Not available
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Password */}

      <section className="mb-6 rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium">
            {hasPassword
              ? "Change password"
              : "Set a password"}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {hasPassword
              ? "Update the password you use to sign in to Epsilone."
              : "You signed in with Google. You can create a password to also sign in with your email."}
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
                Current password
              </label>

              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                placeholder="Enter your current password"
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
                ? "New password"
                : "Password"}
            </label>

            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              placeholder={
                hasPassword
                  ? "Enter your new password"
                  : "Create a password"
              }
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.06]"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Confirm password
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm your password"
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
                ? "Updating..."
                : "Setting password..."
              : hasPassword
                ? "Change password"
                : "Set password"}
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