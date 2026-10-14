import { ReactNode } from "react";

import SignOutButton from "@/components/auth/sign-out-button";
import PanelShell from "@/components/panel/PanelShell";
import type { PanelNavItem } from "@/components/panel/PanelNav";

const ITEMS: PanelNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", exact: true },
  { href: "/dashboard/favorites", label: "Favorites", icon: "heart" },
  { href: "/dashboard/purchases", label: "Purchases", icon: "bag" },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PanelShell
      title="Your account"
      items={ITEMS}
      settings={{
        href: "/dashboard/settings",
        label: "Settings",
        icon: "settings",
      }}
      signOut={<SignOutButton />}
    >
      {children}
    </PanelShell>
  );
}
