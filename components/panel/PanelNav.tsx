"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import NavIcon, { type NavIconName } from "@/components/panel/NavIcon";

export type PanelNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  /** Active only on an exact path match (e.g. the overview page). */
  exact?: boolean;
};

function useIsActive() {
  const pathname = usePathname();

  return (item: PanelNavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Desktop: vertical list of icon links. */
export function PanelSideLinks({ items }: { items: PanelNavItem[] }) {
  const isActive = useIsActive();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active
                ? "bg-brand/15 text-brand shadow-[inset_0_0_0_1px_rgba(255,127,92,0.35)]"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile: horizontally scrollable pill tabs (no title). */
export function PanelTabs({
  items,
  trailing,
}: {
  items: PanelNavItem[];
  trailing?: ReactNode;
}) {
  const isActive = useIsActive();

  return (
    <nav className="flex items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const active = isActive(item);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition ${
              active
                ? "border-brand/60 bg-brand/15 text-brand"
                : "border-white/10 bg-white/5 text-zinc-300"
            }`}
          >
            <NavIcon name={item.icon} size={16} />
            {item.label}
          </Link>
        );
      })}

      {trailing && (
        <div className="shrink-0 whitespace-nowrap">{trailing}</div>
      )}
    </nav>
  );
}
