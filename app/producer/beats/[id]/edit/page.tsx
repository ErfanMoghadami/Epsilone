"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { musicalKey } from "@/lib/uploadConfig";

const supabase = createClient();

type Beat = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
};

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const beatId = params.id;

  const [beat, setBeat] = useState<Beat | null>(null);
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("C Major");
  const [genre, setGenre] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadBeat() {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/producer/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("beats")
        .select("id, title, bpm, key, genre")
        .eq("id", beatId)
        .eq("producer_id", user.id)
        .single();

      if (fetchError) {
        console.error("Failed to load beat:", fetchError);
        setError("Beat not found or you do not have access to it.");
        setIsLoading(false);
        return;
      }

      const loadedBeat = data as Beat;

      setBeat(loadedBeat);
      setTitle(loadedBeat.title ?? "");
      setBpm(loadedBeat.bpm?.toString() ?? "");
      setKey(loadedBeat.key ?? "C Major");
      setGenre(loadedBeat.genre ?? "");
      setIsLoading(false);
    }

    if (beatId) {
      loadBeat();
    }
  }, [beatId, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const parsedBpm = Number(bpm);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!Number.isInteger(parsedBpm) || parsedBpm < 50 || parsedBpm > 250) {
      setError("BPM must be between 50 and 250.");
      return;
    }

    if (!key) {
      setError("Key is required.");
      return;
    }

    setIsSaving(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("You must be logged in.");
      setIsSaving(false);
      return;
    }

    const { data: updatedBeat, error: updateError } = await supabase
      .from("beats")
      .update({
        title: title.trim(),
        bpm: parsedBpm,
        key,
        genre: genre.trim() || null,
      })
      .eq("id", beatId)
      .eq("producer_id", user.id)
      .select("id, title, bpm, key, genre")
      .single();

    if (updateError) {
      console.error("Failed to update beat:", updateError);
      setError(updateError.message);
      setIsSaving(false);
      return;
    }

    setBeat(updatedBeat as Beat);
    setSuccess("Beat updated successfully.");
    setIsSaving(false);
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <p className="text-sm text-zinc-400">Loading beat...</p>
      </div>
    );
  }

  if (!beat) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/producer/beats"
            className="mb-6 inline-block text-sm text-zinc-400 transition hover:text-white"
          >
            ← Back to My Beats
          </Link>

          <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error ?? "Beat not found."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/producer/beats"
          className="mb-6 inline-block text-sm text-zinc-400 transition hover:text-white"
        >
          ← Back to My Beats
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">Edit Beat</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Update your beat information.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Beat title"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
            />
          </div>

          <div>
            <label
              htmlFor="bpm"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              BPM
            </label>
            <input
              id="bpm"
              type="number"
              min={50}
              max={250}
              step={1}
              value={bpm}
              onChange={(event) => setBpm(event.target.value)}
              placeholder="140"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
            />
          </div>

          <div>
            <label
              htmlFor="key"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Key
            </label>
            <select
              id="key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
            >
              {musicalKey.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="genre"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Genre
            </label>
            <input
              id="genre"
              type="text"
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              placeholder="Trap"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/producer/beats"
              className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
