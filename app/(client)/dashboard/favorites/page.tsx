import { createClient } from "@/lib/supabase/server";
import FavoriteBeatsList from "@/components/FavoriteBeatsList";

type Favorite = {
  beat_id: string;
  created_at: string;
};

type Beat = {
  id: string;
  title: string | null;
  cover_url: string | null;
  audio_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
};

export default async function FavoritesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data: favorites,
    error: favoritesError,
  } = await supabase
    .from("favorites")
    .select("beat_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (favoritesError) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold">
          Favorites
        </h1>

        <p className="text-sm text-red-400">
          Could not load your favorites.
        </p>
      </div>
    );
  }

  const beatIds =
    (favorites ?? []).map(
      (favorite: Favorite) =>
        favorite.beat_id
    );

  let beats: Beat[] = [];

  if (beatIds.length > 0) {
    const {
      data,
      error: beatsError,
    } = await supabase
      .from("beats")
      .select(
        "id, title, cover_url, audio_url, bpm, key, genre"
      )
      .in("id", beatIds);

    if (beatsError) {
      return (
        <div>
          <h1 className="mb-2 text-2xl font-semibold">
            Favorites
          </h1>

          <p className="text-sm text-red-400">
            Could not load favorite beats.
          </p>
        </div>
      );
    }

    beats = (data ?? []) as Beat[];

    const beatOrder = new Map(
      beatIds.map((id, index) => [
        id,
        index,
      ])
    );

    beats.sort(
      (a, b) =>
        (beatOrder.get(a.id) ?? 0) -
        (beatOrder.get(b.id) ?? 0)
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold">
          Favorites
        </h1>

        <p className="text-sm text-zinc-500">
          Beats you saved.
        </p>
      </div>

      <FavoriteBeatsList beats={beats} />
    </div>
  );
}