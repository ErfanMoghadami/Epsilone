"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import hamburger from "../public/HAMBURGER.svg"
import ThemeControls from "@/components/ThemeControls";
const ITEMS = [
  { href: "/discover", label: "کشف بیت‌ها" },
  { href: "/producers", label: "پرودیوسرها" },
  { href: "/dashboard", label: "داشبورد" },
  { href: "/cart", label: "سبد خرید" },
];

export default function HomeMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="باز کردن منو"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:text-brand"
      >
        
        <Image width={29} src={hamburger} alt="hamburger"></Image>
        {/*<svg width="24" height="22" viewBox="0 0 24 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M20 2h2" />
          <path d="M2 8h20" />
          <path d="M2 14h20" />
          <path d="M2 20h20" />
        </svg>*/}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-ink/95 p-2 shadow-2xl backdrop-blur">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
        
      )}
    </div>
  );
}
