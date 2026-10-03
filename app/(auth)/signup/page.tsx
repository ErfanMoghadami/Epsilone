"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();

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
          `?next=/&mode=client-signup`,
      },
    });

    if (error) {
      console.error("Google signup error:", error);
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { role: "buyer" },
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (!data.session) {
        router.push(
          `/verify-email?email=${encodeURIComponent(cleanEmail)}&type=signup&next=${encodeURIComponent("/")}`,
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Signup error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black text-xl font-bold">
            E
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Create your account
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Start discovering beats with Epsilone.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
          <form onSubmit={handleSignup} className="space-y-5">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 transition focus:border-white/30 focus:bg-black/60 disabled:opacity-50"
              />
            </div>

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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 transition focus:border-white/30 focus:bg-black/60 disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-neutral-600">OR</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-white transition hover:text-neutral-300"
          >
            Log in
          </button>
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="text-sm text-neutral-500">Are you a producer?</p>

          <button
            type="button"
            onClick={() => router.push("/producer/signup")}
            className="mt-2 text-sm font-medium text-white transition hover:text-neutral-300"
          >
            Become a producer →
          </button>
        </div>
      </div>
    </main>
  );
}
