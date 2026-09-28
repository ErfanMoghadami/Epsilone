import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Producer = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default async function ProducersPage() {
  const supabase = await createClient();

  const { data: producers, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, avatar_url, bio",
    )
    .eq("role", "producer")
    .order("display_name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load producers: ${error.message}`,
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="mb-2 text-sm text-zinc-500">
            Epsilone
          </p>

          <h1 className="text-4xl font-bold">
            Producers
          </h1>

          <p className="mt-2 text-zinc-500">
            Discover producers and explore their beats.
          </p>
        </div>

        {!producers || producers.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <p className="text-zinc-500">
              No producers found.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {producers.map((producer: Producer) => {
              const producerName =
                producer.display_name?.trim() ||
                producer.username?.trim() ||
                "Producer";

              const producerInitial =
                producerName.charAt(0).toUpperCase();

              return (
                <Link
                  key={producer.id}
                  href={`/producers/${producer.username}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-4">
                    {producer.avatar_url ? (
                      <img
                        src={producer.avatar_url}
                        alt={producerName}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-xl font-semibold">
                        {producerInitial}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">
                        {producerName}
                      </h2>

                      {producer.username && (
                        <p className="mt-1 text-sm text-zinc-500">
                          @{producer.username}
                        </p>
                      )}
                    </div>
                  </div>

                  {producer.bio && (
                    <p className="mt-5 line-clamp-3 text-sm text-zinc-500">
                      {producer.bio}
                    </p>
                  )}

                  <div className="mt-6 text-sm text-zinc-400">
                    View Profile →
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}