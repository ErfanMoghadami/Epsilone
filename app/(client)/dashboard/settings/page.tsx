"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ChangeEmailForm from "@/components/auth/change-email-form";
export default function SettingsPage() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingAuthMethod, setLoadingAuthMethod] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkPasswordMethod() {
      const supabase = createClient();

      const { data: identityData, error: identityError } =
        await supabase.auth.getUserIdentities();

      if (identityError) {
        console.error("Identity lookup error:", identityError);
        setError(identityError.message);
        return;
      }

      const hasEmailIdentity =
        identityData?.identities.some(
          (identity) => identity.provider === "email",
        ) ?? false;
      if (error) {
        console.error("Get user identities error:", error);
        setError("Could not determine your authentication method.");
        setLoadingAuthMethod(false);
        return;
      }

      const passwordIdentity =
        identityData?.identities.some(
          (identity) => identity.provider === "email",
        ) ?? false;

      setHasPassword(Boolean(passwordIdentity));
      setLoadingAuthMethod(false);
    }

    checkPasswordMethod();
  }, []);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (hasPassword && !currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (hasPassword && currentPassword === newPassword) {
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
      console.error("Password update error:", error);
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

  if (loadingAuthMethod) {
    return (
      <div className="max-w-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Settings</h1>

          <p className="mt-2 text-sm text-zinc-500">
            Manage your Epsilone account.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">Loading account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl ">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>

        <p className="mt-2 text-sm text-zinc-500">
          Manage your Epsilone account.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium">
            {hasPassword ? "Change password" : "Set a password"}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {hasPassword
              ? "Update the password you use to sign in to Epsilone."
              : "You signed in with Google. You can create a password to also sign in with your email."}
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                onChange={(event) => setCurrentPassword(event.target.value)}
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
              {hasPassword ? "New password" : "Password"}
            </label>

            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={
                hasPassword ? "Enter your new password" : "Create a password"
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
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm your password"
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
      <ChangeEmailForm redirectPath="/dashboard/settings" />
    </div>
  );
}
