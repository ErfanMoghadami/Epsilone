export default function BeatGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-zinc-900 bg-zinc-950 p-4"
        >
          <div className="aspect-square rounded-xl bg-zinc-900" />
          <div className="mt-4 h-4 w-2/3 rounded bg-zinc-900" />
          <div className="mt-2 h-3 w-1/2 rounded bg-zinc-900" />
          <div className="mt-4 h-10 rounded-xl bg-zinc-900" />
        </div>
      ))}
    </div>
  );
}
