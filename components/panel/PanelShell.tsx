import Link from "next/link";
import type { ReactNode } from "react";

import EpsiloneLogo from "@/components/EpsiloneLogo";
import {
  PanelSideLinks,
  PanelTabs,
  type PanelNavItem,
} from "@/components/panel/PanelNav";

type PanelShellProps = {
  /** e.g. "Producer Panel" / "Your account" */
  title: string;
  /** e.g. "@username" */
  subtitle?: string | null;
  items: PanelNavItem[];
  settings: PanelNavItem;
  signOut: ReactNode;
  children: ReactNode;
};

/**
 * Shared shell for the producer and customer panels:
 * glass sidebar on desktop, pill tabs on top for mobile.
 */
export default function PanelShell({
  title,
  subtitle,
  items,
  settings,
  signOut,
  children,
}: PanelShellProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mobile: tabs */}
      <div className="border-b border-white/10 bg-zinc-950 md:hidden">
        <PanelTabs items={[...items, settings]} trailing={signOut} />
      </div>

      {/* Desktop: full-height glass sidebar, pinned to the left edge and
          above the global top bar (which is offset by GlobalNav). */}
      <aside className="fixed inset-y-0 left-0 z-[60] hidden w-64 flex-col border-r border-white/10 bg-zinc-950/70 shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl md:flex">
        <div className="p-5 pb-4">
          <Link href="/" aria-label="Epsilone" className="block w-32">
            <EpsiloneLogo />
          </Link>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <p className="text-xs font-medium text-zinc-300">{title}</p>

            {subtitle && (
              <p dir="ltr" className="mt-0.5 truncate text-xs text-zinc-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <PanelSideLinks items={items} />
        </div>

        <div className="border-t border-white/10 p-3">
          <PanelSideLinks items={[settings]} />

          <div className="mt-1">{signOut}</div>
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0 p-4 sm:p-6 md:ml-64 md:p-8">{children}</main>
    </div>
  );
}
