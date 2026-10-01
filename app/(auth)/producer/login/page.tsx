"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ProducerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // ------------------------------------------------------
      // 1. Try normal login
      // ------------------------------------------------------

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      // ------------------------------------------------------
      // 2. Existing account -> normal login
      // ------------------------------------------------------

      if (!loginError) {
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

          await supabase.auth.signOut();

          setError("Could not load your account.");
          return;
        }

        if (!profile) {
          await supabase.auth.signOut();

          setError("Your account profile was not found.");
          return;
        }

        if (profile.role !== "producer") {
          await supabase.auth.signOut();

          setError("This account is not registered as a producer.");

          return;
        }

        // Producer exists but has not chosen username yet.
        if (!profile.username) {
          router.push("/producer/setup");
          router.refresh();
          return;
        }

        // Existing producer with username.
        router.push(`/producer/${encodeURIComponent(profile.username)}`);

        router.refresh();
        return;
      }

      // ------------------------------------------------------
      // 3. Login failed
      //
      // Try creating a producer account using the same
      // email + password.
      // ------------------------------------------------------

      const signupResponse = await fetch("/api/auth/producer-auto-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const signupData = await signupResponse.json();

      // ------------------------------------------------------
      // 4. Account could not be created
      //
      // Most likely:
      // - account already exists
      // - wrong password
      // - Google-only account
      // ------------------------------------------------------

      if (!signupResponse.ok || !signupData.success) {
        setError("Invalid email or password.");
        return;
      }

      // ------------------------------------------------------
      // 5. New producer account created
      //
      // Sign in immediately with same credentials.
      // ------------------------------------------------------

      const { data: newLoginData, error: newLoginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (newLoginError || !newLoginData.user) {
        console.error("Auto-created producer login error:", newLoginError);

        setError(
          "Your account was created, but automatic login failed. Please try again.",
        );

        return;
      }

      // ------------------------------------------------------
      // 6. Send new producer to username setup
      // ------------------------------------------------------

      router.push("/producer/setup");
      router.refresh();
    } catch (error) {
      console.error("Producer login error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          `${window.location.origin}/auth/callback` +
          `?next=${encodeURIComponent("/producer/setup")}` +
          `&mode=producer-login`,
      },
    });

    if (error) {
      console.error("Google producer login error:", error);
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-bold text-black">
              E
            </div>

            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Producer
            </p>

            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              Log in to manage your beats and producer account.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
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
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 transition focus:border-white/30 focus:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 transition focus:border-white/30 focus:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <div className="flex justify-end">
                  <Link
                    href="/producer/forgot-password"
                    className="text-sm text-white/50 transition hover:text-white"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Log in as producer"}
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

          <div className="mt-6 space-y-3 text-center text-sm">
            <p className="text-neutral-500">
              Don't have a producer account?{" "}
              <button
                type="button"
                onClick={() => router.push("/producer/signup")}
                className="font-medium text-white transition hover:text-neutral-300"
              >
                Become a producer
              </button>
            </p>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-neutral-600 transition hover:text-neutral-300"
            >
              ← Back to client login
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}