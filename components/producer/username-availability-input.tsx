"use client";

import { useEffect, useRef, useState } from "react";

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
]);

export default function UsernameAvailabilityInput() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const requestId = useRef(0);

  useEffect(() => {
    const normalized = username.trim().toLowerCase();

    // Empty
    if (!normalized) {
      setStatus("idle");
      setMessage("");
      return;
    }

    // Invalid format
    if (!/^[a-z0-9_-]{3,20}$/.test(normalized)) {
      setStatus("invalid");
      setMessage(
        "3–20 characters · letters, numbers, _ and -",
      );
      return;
    }

    // Reserved username
    if (RESERVED_USERNAMES.has(normalized)) {
      setStatus("taken");
      setMessage("This username is reserved.");
      return;
    }

    setStatus("checking");
    setMessage("Checking username...");

    const timeout = window.setTimeout(async () => {
      const currentRequestId = ++requestId.current;

      try {
        const response = await fetch(
          `/api/producer/check-username?username=${encodeURIComponent(
            normalized,
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await response.json();

        // Ignore old requests
        if (currentRequestId !== requestId.current) {
          return;
        }

        if (!response.ok) {
          setStatus("error");
          setMessage(
            data?.error ||
              "Could not check username availability.",
          );
          return;
        }

        if (data.available) {
          setStatus("available");
          setMessage("Username is available.");
        } else {
          setStatus("taken");
          setMessage("This username is already taken.");
        }
      } catch (error) {
        console.error(
          "Username availability request failed:",
          error,
        );

        if (currentRequestId !== requestId.current) {
          return;
        }

        setStatus("error");
        setMessage(
          "Could not check username availability.",
        );
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [username]);

  const messageClass =
    status === "available"
      ? "text-emerald-400"
      : status === "taken" ||
          status === "invalid" ||
          status === "error"
        ? "text-red-400"
        : "text-zinc-500";

  return (
    <div>
      <label
        htmlFor="username"
        className="mb-2 block text-sm font-medium text-zinc-300"
      >
        Username
      </label>

      <div
        className={`flex items-center rounded-xl border bg-black/40 px-4 transition ${
          status === "available"
            ? "border-emerald-500/40"
            : status === "taken" ||
                status === "invalid" ||
                status === "error"
              ? "border-red-500/40"
              : "border-white/10 focus-within:border-white/30"
        }`}
      >
        <span className="mr-2 text-zinc-500">@</span>

        <input
          id="username"
          name="username"
          type="text"
          value={username}
          onChange={(event) =>
            setUsername(event.target.value)
          }
          required
          autoComplete="username"
          placeholder="narciboi"
          maxLength={20}
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
  );
}