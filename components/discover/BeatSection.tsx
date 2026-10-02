import BeatCard from "./BeatCard";
import type { DiscoverBeat } from "@/lib/discover";

type BeatSectionProps = {
  title: string;
  description: string;
  beats: DiscoverBeat[];
};

export default function BeatSection({
  title,
  description,
  beats,
}: BeatSectionProps) {
  if (beats.length === 0) return null;

  return (
    <section className="mb-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">{title}</h2>

            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-500">
              {beats.length}
            </span>
          </div>

          <p className="mt-2 text-sm text-zinc-600">{description}</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {beats.map((beat) => (
          <BeatCard key={beat.id} beat={beat} />
        ))}
      </div>
    </section>
  );
}