import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Producer = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default async function ProducersPage() {
  const supabase = await createClient();

  const { data: producers, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .eq("role", "producer")
    .not("username", "is", null)
    .order("display_name", {
      ascending: true,
    });

  if (error) {
    throw new Error(`Could not load producers: ${error.message}`);
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen px-5 py-10 text-white sm:px-6 sm:py-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl font-bold sm:text-4xl">هنرمندان</h1>

          <p className="mt-3 text-sm text-white sm:text-base">
            آهنگسازان را کشف کنید و بیت‌هایشان را بررسی کنید.
          </p>
        </div>

        {!producers || producers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-zinc-500">هنرمندی پیدا نشد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 md:grid-cols-4">
            {producers.map((producer: Producer) => {
              const producerName =
                producer.display_name?.trim() ||
                producer.username?.trim() ||
                "Producer";

              const producerInitial = producerName.charAt(0).toUpperCase();

              return (
                <Link
                  key={producer.id}
                  href={`/producers/${encodeURIComponent(producer.username ?? "")}`}
                  className="group flex flex-col items-center text-center"
                >
                  {producer.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={producer.avatar_url}
                      alt={producerName}
                      className="aspect-square w-full max-w-[150px] rounded-full object-cover transition duration-200 group-hover:scale-[1.03] group-hover:ring-2 group-hover:ring-brand/70"
                    />
                  ) : (
                    <div className="flex aspect-square w-full max-w-[150px] items-center justify-center rounded-full bg-zinc-800 text-3xl font-semibold transition duration-200 group-hover:scale-[1.03] group-hover:ring-2 group-hover:ring-brand/70">
                      {producerInitial}
                    </div>
                  )}

                  <h2
                    dir="auto"
                    className="mt-3 max-w-full truncate text-sm font-medium sm:text-base"
                  >
                    {producerName}
                  </h2>

                  <p
                    dir="ltr"
                    className="mt-1 max-w-full truncate text-xs text-zinc-500 sm:text-sm"
                  >
                    @{producer.username}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}