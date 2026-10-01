"use client";

import Link from "next/link";
import { useState } from "react";

export default function HomeMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-5 top-5 z-50 sm:right-6 sm:top-6">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-zinc-300 shadow-lg transition hover:border-white/20 hover:text-white"
      >
        <span className="sr-only">Menu</span>

        <div className="space-y-1.5">
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl">
          <Link
            href="/discover"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            Discover
          </Link>
          <Link
            href="/producers"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            Producers
          </Link>

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            Dashboard
          </Link>

          <Link
            href="/cart"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            <span>Cart</span>
          </Link>
        </div>
      )}
    </div>
  );
}
