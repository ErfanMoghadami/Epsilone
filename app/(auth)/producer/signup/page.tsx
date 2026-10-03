"use client";

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
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-bold text-black">
              E
            </div>

            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Producer
            </p>

            <h1 className="text-3xl font-semibold tracking-tight">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              Join Epsilone and start selling your beats.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <form
              onSubmit={handleSignup}
              className="space-y-5"
            >
              {/* Display Name */}
              <div>
                <label
                  htmlFor="display-name"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Display Name
                </label>

                <input
                  id="display-name"
                  type="text"
                  placeholder="Narciboi"
                  value={displayName}
                  onChange={(e) =>
                    setDisplayName(e.target.value)
                  }
                  maxLength={50}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-white/30 focus:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Username
                </label>

                <div className="flex items-center rounded-xl border border-white/10 bg-black/40 focus-within:border-white/30">
                  <span className="pl-4 text-sm text-neutral-500">
                    @
                  </span>

                  <input
                    id="username"
                    type="text"
                    placeholder="narciboi"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s/g, ""),
                      )
                    }
                    maxLength={30}
                    required
                    disabled={loading}
                    className="w-full bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-neutral-600"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label
                  htmlFor="bio"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Bio
                </label>

                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) =>
                    setBio(e.target.value)
                  }
                  placeholder="Tell artists a little about you..."
                  maxLength={300}
                  rows={4}
                  required
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-white/30 focus:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="mt-2 text-right text-xs text-neutral-600">
                  {bio.length}/300
                </p>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-white/30 focus:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-white/30 focus:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-400">
                  {error}
                </div>
              )}

              {/* Success */}
              {message && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-400">
                  {message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Creating account..."
                  : "Create producer account"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />

              <span className="text-xs text-neutral-600">
                OR
              </span>

              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue with Google
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 space-y-3 text-center text-sm">
            <p className="text-neutral-500">
              Already have a producer account?{" "}
              <Link
                href="/producer/login"
                className="font-medium text-white transition hover:text-neutral-300"
              >
                Log in
              </Link>
            </p>

            <Link
              href="/signup"
              className="text-neutral-600 transition hover:text-neutral-300"
            >
              ← Create a client account instead
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}