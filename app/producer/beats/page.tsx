"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function Page() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [beats, setBeats] = useState<any[]>([]);

  async function dataUser() {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }
    if (!data.user) {
      setError("User not authenticated");
      setIsLoading(false);
      return;
    }
    setUser(data.user);
  }

  useEffect(() => {
    dataUser();
  }, []);

  async function fetchBeats(userId: string) {
    const { data, error: fetchError } = await supabase
      .from("beats")
      .select("*")
      .eq("producer_id", userId);
    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }
    setBeats(data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    fetchBeats(user.id);
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">My Beats</h1>

      {isLoading && <p className="text-zinc-400 text-sm">Loading beats...</p>}

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {!isLoading && !error && beats.length === 0 && (
        <p className="text-zinc-500 text-sm">هنوز بیتی آپلود نکردی.</p>
      )}

      {!isLoading && !error && beats.length > 0 && (
        <div className="grid gap-3">
          {beats.map((beat) => (
            <div
              key={beat.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950 px-5 py-4 hover:bg-white/5 transition"
            >
              <div>
                <p className="font-medium">{beat.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {beat.bpm} BPM &middot; {beat.key} &middot; {beat.genre}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  beat.analysis_status === "completed"
                    ? "bg-green-900/40 text-green-400"
                    : beat.analysis_status === "processing"
                      ? "bg-yellow-900/40 text-yellow-400"
                      : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {beat.analysis_status ?? "unknown"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
