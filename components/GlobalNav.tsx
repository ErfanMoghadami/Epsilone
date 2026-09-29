"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const CART_KEY = "epsilone-cart";

function getCartCount() {
  try {
    const storedCart = JSON.parse(
      localStorage.getItem(CART_KEY) ?? "[]",
    );

    return Array.isArray(storedCart) ? storedCart.length : 0;
  } catch {
    return 0;
  }
}

export default function GlobalNav() {
  const pathname = usePathname();

  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(getCartCount());
    };

    updateCartCount();

    window.addEventListener("cart-updated", updateCartCount);
    window.addEventListener("storage", updateCartCount);

    return () => {
      window.removeEventListener("cart-updated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname === "/") {
    return null;
  }

  const links = [
    {
      href: "/",
      label: "Home",
    },
    {
      href: "/producers",
      label: "Producers",
    },
    {
      href: "/dashboard",
      label: "Dashboard",
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-white"
        >
          Epsilone
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <Link
            href="/cart"
            className={`rounded-lg px-3 py-2 text-sm transition ${
              pathname === "/cart"
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            Cart
            {cartCount > 0 && (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-black">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Mobile */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            <div className="space-y-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl">
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href ||
                      pathname.startsWith(`${link.href}/`);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block rounded-xl px-4 py-3 text-sm transition ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <Link
                href="/cart"
                className={`block rounded-xl px-4 py-3 text-sm transition ${
                  pathname === "/cart"
                    ? "bg-white/10 text-white"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                Cart
                {cartCount > 0 && (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-black">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}