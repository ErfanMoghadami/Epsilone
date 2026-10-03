"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          `${window.location.origin}/auth/callback` +
          `?next=/&mode=client-login`,
      },
    });

    if (error) {
      console.error("Google login error:", error);
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        // Account exists but the email was never verified -> send to OTP page.
        if (loginError.code === "email_not_confirmed") {
          await supabase.auth.resend({ type: "signup", email: cleanEmail });
          router.push(
            `/verify-email?email=${encodeURIComponent(cleanEmail)}&next=${encodeURIComponent("/")}`,
          );
          return;
        }

        setError(loginError.message);
        return;
      }

      if (!data.user) {
        setError("User account was not found.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, username")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile lookup error:", profileError);
        setError("Could not load your account.");
        return;
      }

      if (!profile) {
        setError("Your account profile was not found.");
        return;
      }

      if (profile.role === "producer") {
        if (!profile.username) {
          router.push("/producer/setup");
        } else {
          router.push(
            `/producer/${encodeURIComponent(profile.username)}`,
          );
        }
      } else if (profile.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }

      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
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
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Log in to continue to Epsilone.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
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
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-neutral-300"
                >
                  Password
                </label>
              </div>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 transition focus:border-white/30 focus:bg-black/60 disabled:opacity-50"
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-white/50 transition hover:text-white"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-neutral-600">OR</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="text-white transition hover:text-neutral-300"
          >
            Create one
          </button>
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="text-sm text-neutral-500">Are you a producer?</p>

          <button
            type="button"
            onClick={() => router.push("/producer/login")}
            className="mt-2 text-sm font-medium text-white transition hover:text-neutral-300"
          >
            Login as a producer →
          </button>
        </div>
      </div>
    </main>
  );
}