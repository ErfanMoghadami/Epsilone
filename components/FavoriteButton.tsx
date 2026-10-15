"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FavoriteButtonProps = {
  beatId: string;
  onFavoriteChange?: (favorited: boolean) => void;
  minimal?: boolean;
};

export default function FavoriteButton({
  beatId,
  onFavoriteChange,
  minimal = false,
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkFavorite() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("beat_id", beatId)
        .maybeSingle();

      setFavorited(Boolean(data));
    }

    checkFavorite();
  }, [beatId, supabase]);

  async function toggleFavorite() {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          beatId,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        alert("ابتدا وارد حساب خودت شو.");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Favorite failed");
      }

      setFavorited(data.favorited);

      onFavoriteChange?.(data.favorited);
    } catch (error) {
      console.error("Favorite toggle error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={loading}
      aria-label={favorited ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      className={
        minimal
          ? "flex h-8 w-8 items-center justify-center text-zinc-400 transition hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
          : "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-xl backdrop-blur transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {minimal ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={favorited ? "#ff7f5c" : "none"}
          stroke={favorited ? "#ff7f5c" : "currentColor"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      ) : favorited ? (
        "❤️"
      ) : (
        "♡"
      )}
    </button>
  );
}