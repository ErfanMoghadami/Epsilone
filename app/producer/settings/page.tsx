"use client";

import { FormEvent, useEffect, useState } from "react";
import AvatarUploader from "@/components/producer/avatar-uploader";

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
        setError("Could not load your account.");
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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

    setMessage("Password updated successfully.");

    setChangingPassword(false);
  }

  if (loading) {
    return (
      <div className="max-w-xl">
        <h1 className="mb-2 text-2xl font-semibold">Account Settings</h1>

        <p className="text-sm text-zinc-500">Loading account...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Account Settings</h1>

        <p className="mt-2 text-sm text-zinc-500">
          Manage your Epsilone account.
        </p>
      </div>
      <AvatarUploader initialAvatarUrl={avatarUrl} />
      <div className="space-y-6">
        {/* User ID */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium">User ID</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Your account ID cannot be changed.
            </p>
          </div>

          <input
            type="text"
            value={userId}
            readOnly
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50 outline-none"
          />
        </section>

        {/* Email */}
        <ChangeEmailForm redirectPath="/producer/settings" />

        {/* Password */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium">Change password</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Update the password you use to sign in.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                New password
              </label>

              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
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
                Confirm new password
              </label>

              <input
                id="confirm-password"
                type="password"
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
              {changingPassword ? "Updating..." : "Change Password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
