"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FavoriteButtonProps = {
  beatId: string;
  onFavoriteChange?: (favorited: boolean) => void;
};

export default function FavoriteButton({
  beatId,
  onFavoriteChange,
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
      const response = await fetch(
        "/api/favorites/toggle",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            beatId,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        alert("ابتدا وارد حساب خودت شو.");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Favorite failed"
        );
      }

      setFavorited(data.favorited);

      onFavoriteChange?.(data.favorited);
    } catch (error) {
      console.error(
        "Favorite toggle error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={loading}
      aria-label={
        favorited
          ? "Remove from favorites"
          : "Add to favorites"
      }
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-xl backdrop-blur transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {favorited ? "❤️" : "♡"}
    </button>
  );
}