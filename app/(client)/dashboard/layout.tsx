import { ReactNode } from "react";

import SignOutButton from "@/components/auth/sign-out-button";
import PanelShell from "@/components/panel/PanelShell";
import type { PanelNavItem } from "@/components/panel/PanelNav";

const ITEMS: PanelNavItem[] = [
  { href: "/dashboard", label: "نمای کلی", icon: "overview", exact: true },
  { href: "/dashboard/favorites", label: "علاقه‌مندی‌ها", icon: "heart" },
  { href: "/dashboard/purchases", label: "خریدها", icon: "bag" },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PanelShell
      title="حساب کاربری شما"
      items={ITEMS}
      settings={{
        href: "/dashboard/settings",
        label: "تنظیمات",
        icon: "settings",
      }}
      signOut={<SignOutButton />}
    >
      {children}
    </PanelShell>
  );
}
