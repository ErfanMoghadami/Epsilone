"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import EpsiloneMark from "@/components/EpsiloneMark";
import NavIcon, { type NavIconName } from "@/components/panel/NavIcon";
import { createClient } from "@/lib/supabase/client";

/** Pages where the bottom bar would only get in the way. */
const HIDDEN_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/update-password",
  "/verify-email",
  "/producer/login",
  "/producer/signup",
  "/producer/forgot-password",
  "/auth",
  "/checkout",
  "/payment",
  "/offline",
];

type Role = "producer" | "admin" | "customer" | null;

function isHidden(pathname: string) {
  return HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function settingsHref(role: Role) {
  if (role === "producer") return "/producer/settings";
  if (role) return "/dashboard/settings";
  return "/login";
}

type Item = {
  key: string;
  href: string;
  label: string;
  icon: NavIconName | "mark";
  active: boolean;
};

/**
 * Mobile-only bottom bar. Left to right:
 * Settings • Producers • L (home) • Trending • Discover
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setRole(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      setRole((data?.role as Role | undefined) ?? "customer");
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        void load();
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (isHidden(pathname)) return null;

  const starts = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);

  const settings = settingsHref(role);

  const items: Item[] = [
    {
      key: "settings",
      href: settings,
      label: "تنظیمات",
      icon: "settings",
      active: pathname === settings,
    },
    {
      key: "producers",
      href: "/producers",
      label: "هنرمندان",
      icon: "users",
      active: starts("/producers"),
    },
    {
      key: "home",
      href: "/",
      label: "صفحه اصلی",
      icon: "mark",
      active: pathname === "/",
    },
    {
      key: "trending",
      href: "/trending",
      label: "ترند",
      icon: "trending",
      active: starts("/trending"),
    },
    {
      key: "discover",
      href: "/discover",
      label: "کشف بیت‌ها",
      icon: "compass",
      active: starts("/discover"),
    },
  ];

  return (
    <>
      {/* Spacer so page content never hides behind the fixed bar. */}
      {pathname !== "/" && <div aria-hidden="true" className="h-20 md:hidden" />}

      <nav
        dir="ltr"
        aria-label="منوی اصلی"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ep-border bg-ep-nav backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
          {items.map((item) => (
            <li key={item.key} className="flex justify-center">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={item.active ? "page" : undefined}
                className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                  item.active
                    ? "bg-brand/15 text-brand"
                    : "text-ep-muted hover:text-ep-fg"
                }`}
              >
                {item.icon === "mark" ? (
                  <EpsiloneMark glow={item.active} className="h-8 w-auto" />
                ) : (
                  <NavIcon name={item.icon} size={24} />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
