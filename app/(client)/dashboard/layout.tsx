import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 border-r border-white/10 bg-zinc-950 p-5">
          <div className="mb-8">
            <h1 className="text-xl font-bold">
              Epsilone
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Your account
            </p>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Overview
            </Link>

            <Link
              href="/dashboard/favorites"
              className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Favorites
            </Link>

            <Link
              href="/dashboard/purchases"
              className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Purchases
            </Link>

            <Link
              href="/dashboard/settings"
              className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Settings
            </Link>
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}