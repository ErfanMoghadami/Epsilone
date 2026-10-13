"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Status =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "error";

const RESERVED_USERNAMES = new Set([
  "login",
  "signup",
  "setup",
  "forgot-password",
  "beats",
  "upload",
  "settings",
  "producers",
  "producer",
  "api",
  "auth",
  "cart",
  "checkout",
  "dashboard",
  "discover",
  "favorites",
  "purchases",
  "payment",
  "payments",
  "about",
  "privacy",
  "terms",
  "contact",
  "support",
  "admin",
  "root",
  "www",
]);

export default function ChangeUsernameForm() {
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const requestId = useRef(0);

  // --------------------------------------------------------
  // Load current producer username
  // --------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Please sign in again.");
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("username, role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError || !profile) {
          throw new Error("Could not load your profile.");
        }

        if (profile.role !== "producer") {
          throw new Error(
            "Username settings are available to producers only.",
          );
        }

        if (!cancelled) {
          const initialUsername =
            profile.username?.trim().toLowerCase() ?? "";

          setCurrentUsername(initialUsername);
          setUsername(initialUsername);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your profile.",
          );
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------------------------------------------
  // Live availability check
  // --------------------------------------------------------

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    const normalized = username.trim().toLowerCase();
    const currentRequestId = ++requestId.current;

    setError("");
    setSavedMessage("");

    if (!normalized) {
      setStatus("idle");
      setMessage(
        "3–20 characters · letters, numbers, _ and -",
      );
      return;
    }

    if (!/^[a-z0-9_-]{3,20}$/.test(normalized)) {
      setStatus("invalid");
      setMessage(
        "Use 3–20 characters: letters, numbers, _ and -.",
      );
      return;
    }

    if (RESERVED_USERNAMES.has(normalized)) {
      setStatus("taken");
      setMessage("This username is reserved.");
      return;
    }

    if (
      currentUsername &&
      normalized === currentUsername.toLowerCase()
    ) {
      setStatus("idle");
      setMessage("This is your current username.");
      return;
    }

    setStatus("checking");
    setMessage("Checking username availability...");

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/producer/check-username?username=${encodeURIComponent(normalized)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (currentRequestId !== requestId.current) {
          return;
        }

        if (!response.ok) {
          setStatus("error");
          setMessage(
            data?.error || "Could not check username.",
          );
          return;
        }

        if (data.available) {
          setStatus("available");
          setMessage("Username is available.");
        } else {
          setStatus("taken");
          setMessage(
            data?.error ||
              "This username is already taken or reserved.",
          );
        }
      } catch {
        if (currentRequestId !== requestId.current) {
          return;
        }

        setStatus("error");
        setMessage("Could not check username availability.");
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [username, currentUsername, profileLoading]);

  // --------------------------------------------------------
  // Save new username
  // --------------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSavedMessage("");

    const normalized = username.trim().toLowerCase();

    if (!/^[a-z0-9_-]{3,20}$/.test(normalized)) {
      setError(
        "Username must be 3–20 characters and contain only letters, numbers, underscores, or hyphens.",
      );
      return;
    }

    if (normalized === currentUsername.toLowerCase()) {
      setError("This is already your username.");
      return;
    }

    if (status !== "available") {
      setError(
        "Choose a username marked as available before saving.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/producer/change-username",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: normalized,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error || "Could not update your username.",
        );
        return;
      }

      const savedUsername = String(data.username);

      setCurrentUsername(savedUsername);
      setUsername(savedUsername);
      setSavedMessage(
        "Username updated. Your previous public profile URL is reserved and will redirect to this profile.",
      );
    } catch (saveError) {
      console.error("Change username failed:", saveError);

      setError(
        "Could not update your username. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const normalizedUsername =
    username.trim().toLowerCase();

  const hasChanged =
    normalizedUsername !==
    currentUsername.toLowerCase();

  const messageClass =
    status === "available"
      ? "text-emerald-400"
      : status === "taken" ||
          status === "invalid" ||
          status === "error"
        ? "text-red-400"
        : "text-zinc-500";

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-medium">
          Username
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Your username is part of your public producer
          profile URL. Previous usernames stay reserved
          for you.
        </p>
      </div>

      {profileLoading ? (
        <p className="text-sm text-zinc-500">
          Loading username...
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="producer-username"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Username
            </label>

            <div
              className={`flex items-center rounded-xl border bg-white/[0.04] px-4 transition ${
                status === "available"
                  ? "border-emerald-500/40"
                  : status === "taken" ||
                      status === "invalid" ||
                      status === "error"
                    ? "border-red-500/40"
                    : "border-white/10 focus-within:border-white/30"
              }`}
            >
              <span className="mr-2 text-zinc-500">
                @
              </span>

              <input
                id="producer-username"
                name="username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                required
                autoComplete="off"
                maxLength={20}
                minLength={3}
                spellCheck={false}
                autoCapitalize="none"
                placeholder="narciboi"
                className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-zinc-700"
              />

              {status === "checking" && (
                <span className="ml-3 text-xs text-zinc-500">
                  ...
                </span>
              )}

              {status === "available" && (
                <span className="ml-3 text-emerald-400">
                  ✓
                </span>
              )}

              {(status === "taken" ||
                status === "invalid" ||
                status === "error") && (
                <span className="ml-3 text-red-400">
                  ×
                </span>
              )}
            </div>

            <p
              aria-live="polite"
              className={`mt-2 text-xs leading-5 ${messageClass}`}
            >
              {message ||
                "3–20 characters · letters, numbers, _ and -"}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500">
              Public profile URL preview
            </p>

            <p className="mt-2 break-all text-sm text-white">
              /producers/
              {normalizedUsername || currentUsername || "..."}
            </p>

            {currentUsername && (
              <Link
                href={`/producers/${encodeURIComponent(currentUsername)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs text-zinc-400 underline underline-offset-4 transition hover:text-white"
              >
                Open current public profile →
              </Link>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {savedMessage && (
            <div
              role="status"
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
            >
              {savedMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={
              saving ||
              status !== "available" ||
              !hasChanged
            }
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Updating username..."
              : "Save username"}
          </button>
        </form>
      )}
    </section>
  );
}