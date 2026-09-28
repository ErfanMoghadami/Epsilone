"use client";

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
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
          <div className="w-full">
            <p className="text-sm text-white/50">
              Verifying your password reset link...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
        <div className="w-full">
          <div className="mb-8">
            <Link
              href="/login"
              className="text-sm text-white/50 transition hover:text-white"
            >
              ← Back to login
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              Set a new password
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/50">
              Enter your new password below.
            </p>
          </div>

          {!sessionReady ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error || "This password reset link is invalid or expired."}
              </div>

              <Link
                href="/forgot-password"
                className="block text-center text-sm text-white/50 transition hover:text-white"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-white/80"
                >
                  New password
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your new password"
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
                  placeholder="Confirm your new password"
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
                {loading ? "Updating..." : "Update password"}
              </button>

              {message && (
                <Link
                  href="/login"
                  className="block text-center text-sm text-white/50 transition hover:text-white"
                >
                  Back to login
                </Link>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}