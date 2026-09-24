import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // --------------------------------------------------------
  // Suggested
  // --------------------------------------------------------

  const {
    count: suggestedCount,
    error: suggestedError,
  } = await supabase
    .from("recommendation_events")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id)
    .eq("event_type", "suggested");

  // --------------------------------------------------------
  // Played
  // --------------------------------------------------------

  const {
    count: playedCount,
    error: playedError,
  } = await supabase
    .from("recommendation_events")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id)
    .eq("event_type", "played");

  // --------------------------------------------------------
  // Favorites
  // --------------------------------------------------------

  const {
    count: favoritesCount,
    error: favoritesError,
  } = await supabase
    .from("favorites")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id);

  // --------------------------------------------------------
  // Error handling
  // --------------------------------------------------------

  if (
    suggestedError ||
    playedError ||
    favoritesError
  ) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold">
          Dashboard
        </h1>

        <p className="text-sm text-red-400">
          Could not load your account data.
        </p>
      </div>
    );
  }

  const suggested = suggestedCount ?? 0;
  const played = playedCount ?? 0;
  const favorites = favoritesCount ?? 0;

  const playRate =
    suggested > 0
      ? ((played / suggested) * 100).toFixed(1)
      : "0.0";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold">
          Dashboard
        </h1>

        <p className="text-sm text-zinc-500">
          Your activity on Epsilone.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Suggested */}
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Suggested
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {suggested}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            Beats recommended to you
          </p>
        </div>

        {/* Played */}
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Played
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {played}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            Beats you actually played
          </p>
        </div>

        {/* Favorites */}
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Favorites
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {favorites}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            Beats you saved
          </p>
        </div>

        {/* Play Rate */}
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-500">
            Play Rate
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {playRate}%
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            Suggested beats that you played
          </p>
        </div>
      </div>
    </div>
  );
}