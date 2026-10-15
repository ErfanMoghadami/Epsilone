"use client";

import { usePathname } from "next/navigation";
import HomeMenu from "@/components/HomeMenu";

/** Panel routes render a fixed full-height sidebar on desktop (see PanelShell). */
const PANEL_AUTH_PATHS = [
  "/producer/login",
  "/producer/signup",
  "/producer/forgot-password",
];

function hasPanelSidebar(pathname: string) {
  if (PANEL_AUTH_PATHS.some((path) => pathname === path)) return false;

  return (
    pathname === "/producer" ||
    pathname.startsWith("/producer/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  );
}

export default function GlobalNav() {
  const pathname = usePathname();

  // The home page already renders HomeMenu itself.
  if (pathname === "/") {
    return null;
  }

  // Keep the top bar clear of the panel sidebar (which sits on the right, RTL) on desktop.
  return (
    <div className={hasPanelSidebar(pathname) ? "md:pr-64" : undefined}>
      <HomeMenu />
    </div>
  );
}