import { redirect, notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type ProducerPanelPageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function ProducerPanelPage({
  params,
}: ProducerPanelPageProps) {
  const { username } = await params;

  const supabase = await createClient();

  // --------------------------------------------------------
  // Current user
  // --------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/producer/login");
  }

  // --------------------------------------------------------
  // Current producer profile
  // --------------------------------------------------------

  const { data: producer, error: producerError } =
    await supabase
      .from("profiles")
      .select("id, role, display_name, username")
      .eq("id", user.id)
      .eq("role", "producer")
      .single();

  if (producerError || !producer) {
    notFound();
  }

  // --------------------------------------------------------
  // Make sure URL belongs to current producer
  // --------------------------------------------------------

  if (
    !producer.username ||
    producer.username.toLowerCase() !==
      username.toLowerCase()
  ) {
    redirect(
      `/producer/${producer.username}`,
    );
  }

  // --------------------------------------------------------
  // Producer beats
  // --------------------------------------------------------

  const { data: beats, error: beatsError } =
    await supabase
      .from("beats")
      .select("id, analysis_status")
      .eq("producer_id", user.id);

  if (beatsError) {
    throw new Error(
      `Could not load producer beats: ${beatsError.message}`,
    );
  }

  const total = beats?.length ?? 0;

  const pending =
    beats?.filter(
      (beat) =>
        beat.analysis_status === "pending",
    ).length ?? 0;

  const completed =
    beats?.filter(
      (beat) =>
        beat.analysis_status === "completed",
    ).length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-zinc-500">
          Producer Panel
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-white">
          {producer.username}
        </h1>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Total Beats
          </p>

          <p className="text-3xl font-bold text-white">
            {total}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Pending Analysis
          </p>

          <p className="text-3xl font-bold text-white">
            {pending}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Completed
          </p>

          <p className="text-3xl font-bold text-white">
            {completed}
          </p>
        </div>
      </div>
    </div>
  );
}