// export default function BeatGridSkeleton({ count = 6 }: { count?: number }) {
//   return (
//     <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
//       {Array.from({ length: count }).map((_, index) => (
//         <div
//           key={index}
//           className="animate-pulse rounded-2xl border border-zinc-900 bg-zinc-950 p-4"
//         >
//           <div className="aspect-square rounded-xl bg-zinc-900" />
//           <div className="mt-4 h-4 w-2/3 rounded bg-zinc-900" />
//           <div className="mt-2 h-3 w-1/2 rounded bg-zinc-900" />
//           <div className="mt-4 h-10 rounded-xl bg-zinc-900" />
//         </div>
//       ))}
//     </div>
//   );
// }


import { BEAT_GRID_CLASS } from "@/lib/discover";

export default function BeatGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={BEAT_GRID_CLASS}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass-card overflow-hidden rounded-2xl">
          <div className="aspect-square animate-pulse bg-white/[0.05]" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.04]" />
            <div className="h-10 animate-pulse rounded-full bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}