// "use client";

// import Image from "next/image";
// import Link from "next/link";
// import { useEffect, useRef, useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import hamburger from "../public/HAMBURGER.svg";
// import ThemeToggle from "@/components/ThemeToggle";
// // ترتیب DOM در RTL: اولی راستِ‌ترین. نتیجه‌ی دیداری از چپ به راست:
// // ترندینگ، بیت‌ها، پرودیوسرها، و بعد L
// const NAV_LINKS = [
//   { href: "/producers", label: "پرودیوسرها" },
//   { href: "/discover", label: "بیت‌ها" },
//   { href: "/trending", label: "ترندینگ" },
// ];

// const MENU_ITEMS = [
//   ...NAV_LINKS,
//   { href: "/dashboard", label: "داشبورد" },
//   { href: "/cart", label: "سبد خرید" },
// ];

// type NavProfile = {
//   role: string | null;
//   username: string | null;
//   avatar_url: string | null;
// };

// function getPanelHref(profile: NavProfile | null) {
//   if (profile?.role === "producer") {
//     return profile.username
//       ? `/producer/${encodeURIComponent(profile.username)}`
//       : "/producer/setup";
//   }
//   if (profile?.role === "admin") return "/admin";
//   return "/dashboard";
// }

// export default function HomeMenu() {
//   const [supabase] = useState(() => createClient());
//   const [open, setOpen] = useState(false);
//   const [ready, setReady] = useState(false);
//   const [loggedIn, setLoggedIn] = useState(false);
//   const [email, setEmail] = useState<string | null>(null);
//   const [profile, setProfile] = useState<NavProfile | null>(null);
//   const menuRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     let cancelled = false;

//     async function load() {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (cancelled) return;

//       if (!user) {
//         setLoggedIn(false);
//         setProfile(null);
//         setReady(true);
//         return;
//       }

//       const { data } = await supabase
//         .from("profiles")
//         .select("role, username, avatar_url")
//         .eq("id", user.id)
//         .maybeSingle();

//       if (cancelled) return;

//       setEmail(user.email ?? null);
//       setProfile((data as NavProfile | null) ?? null);
//       setLoggedIn(true);
//       setReady(true);
//     }

//     load();

//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange(() => {
//       setTimeout(load, 0);
//     });

//     return () => {
//       cancelled = true;
//       subscription.unsubscribe();
//     };
//   }, [supabase]);

//   useEffect(() => {
//     if (!open) return;

//     const onPointerDown = (e: PointerEvent) => {
//       if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
//     };
//     const onKeyDown = (e: KeyboardEvent) => {
//       if (e.key === "Escape") setOpen(false);
//     };

//     document.addEventListener("pointerdown", onPointerDown);
//     document.addEventListener("keydown", onKeyDown);
//     return () => {
//       document.removeEventListener("pointerdown", onPointerDown);
//       document.removeEventListener("keydown", onKeyDown);
//     };
//   }, [open]);

//   const name = profile?.username || email?.split("@")[0] || "";
//   const initial = name.charAt(0).toUpperCase() || "E";

//   return (
//     <header className="relative z-20 m-2 grid grid-cols-[1fr_auto_1fr] items-center px-5 pt-5 sm:px-12 sm:pt-7">
//       {/* شروع (راست): موبایل همبرگر / کامپیوتر L */}
//       <div className="flex items-center justify-start">
//         <div ref={menuRef} className="relative md:hidden">
//           <button
//             type="button"
//             onClick={() => setOpen((current) => !current)}
//             aria-label="باز کردن منو"
//             aria-expanded={open}
//             className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:text-brand"
//           >
//             <Image width={29} src={hamburger} alt="hamburger" />
//           </button>

//           {open && (
//             <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-ep-bg/95 p-2 shadow-2xl backdrop-blur">
//               {MENU_ITEMS.map((item) => (
//                 <Link
//                   key={item.href}
//                   href={item.href}
//                   onClick={() => setOpen(false)}
//                   className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
//                 >
//                   {item.label}
//                 </Link>
//               ))}
//             </div>
//           )}
//         </div>

//         <Link href="/" aria-label="Epsilone" className="hidden md:block">
//           {/* eslint-disable-next-line @next/next/no-img-element */}
//           <img src="/l.svg" alt="Epsilone" className="h-10 w-auto" />
//         </Link>
//       </div>

//       {/* وسط: فقط کامپیوتر */}
//       <nav className="hidden items-center gap-8 md:flex">
//         {NAV_LINKS.map((link) => (
//           <Link
//             key={link.href}
//             href={link.href}
//             className="text-sm text-white/80 transition hover:text-brand"
//           >
//             {link.label}
//           </Link>
//         ))}
//       </nav>
//       <div className="md:hidden" />

//       {/* پایان (چپ): ورود/ثبت‌نام یا عکس پروفایل */}
//       <div className="flex items-center justify-end gap-3">
//         <ThemeToggle />
//         {!ready ? (
//           <span className="block h-10 w-10" aria-hidden="true" />
//         ) : loggedIn ? (
//           <Link
//             href={getPanelHref(profile)}
//             aria-label="پنل کاربری"
//             title="پنل کاربری"
//             className="block h-10 w-10 overflow-hidden rounded-full border-2 border-brand/70 transition hover:border-brand"
//           >
//             {profile?.avatar_url ? (
//               // eslint-disable-next-line @next/next/no-img-element
//               <img
//                 src={profile.avatar_url}
//                 alt={name || "پروفایل"}
//                 className="h-full w-full object-cover"
//               />
//             ) : (
//               <span className="flex h-full w-full items-center justify-center bg-white/10 text-sm font-bold text-white">
//                 {initial}
//               </span>
//             )}
//           </Link>
//         ) : (
//           <>
//             <Link
//               href="/login"
//               className="rounded-full border border-brand/70 px-8 py-2 text-xs font-bold text-white transition hover:bg-brand/10"
//             >
//               ورود
//             </Link>
//             <Link
//               href="/signup"
//               className="hidden text-xs text-white/90 transition hover:text-brand sm:block"
//             >
//               ثبت نام
//             </Link>
//           </>
//         )}
//       </div>
//     </header>
//   );
// }

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import hamburger from "../public/HAMBURGER.svg";

const CART_KEY = "epsilone-cart";

const NAV_LINKS = [
  { href: "/producers", label: "پرودیوسرها" },
  { href: "/discover", label: "بیت‌ها" },
  { href: "/trending", label: "ترندینگ" },
];

type NavProfile = {
  role: string | null;
  username: string | null;
  avatar_url: string | null;
};

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

function getPanelHref(profile: NavProfile | null) {
  if (profile?.role === "producer") {
    return profile.username
      ? `/producer/${encodeURIComponent(profile.username)}`
      : "/producer/setup";
  }

  if (profile?.role === "admin") {
    return "/admin";
  }

  return "/dashboard";
}

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2" />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </svg>
  );
}

export default function HomeMenu() {
  const pathname = usePathname();

  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<NavProfile | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Update cart count.
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

  // Current user and profile.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setEmail(null);
        setProfile(null);
        setLoggedIn(false);
        setReady(true);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      setEmail(user.email ?? null);
      setProfile((data as NavProfile | null) ?? null);
      setLoggedIn(true);
      setReady(true);
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

  // Close the menu after navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const name = profile?.username || email?.split("@")[0] || "";
  const initial = name.charAt(0).toUpperCase() || "E";
  const panelHref = getPanelHref(profile);

  const cartBadge =
    cartCount > 0 ? (
      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-ink">
        {cartCount}
      </span>
    ) : null;

  return (
    <header
      dir="rtl"
      className="font-fa relative z-50 m-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 pt-5 sm:px-12 sm:pt-7"
    >
      {/* Right: hamburger on mobile, logo on desktop */}
      <div className="flex min-w-0 items-center justify-start">
        <div ref={menuRef} className="relative shrink-0 md:hidden">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? "بستن منو" : "باز کردن منو"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:text-brand"
          >
            <Image
              width={29}
              height={24}
              src={hamburger}
              alt=""
              aria-hidden="true"
              className="home-menu-hamburger"
            />
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-3 w-60 rounded-2xl border border-white/10 bg-ep-bg/95 p-2 shadow-2xl backdrop-blur">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}

              {ready && loggedIn && (
                <Link
                  href={panelHref}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  داشبورد
                </Link>
              )}

              <Link
                href="/cart"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
              >
                سبد خرید
                {cartBadge}
              </Link>

              {ready && !loggedIn && (
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  ثبت نام
                </Link>
              )}
            </div>
          )}
        </div>

        <Link href="/" aria-label="Epsilone" className="hidden md:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/l.svg"
            alt="Epsilone"
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* Center: logo on mobile, navigation links on desktop */}
      <div className="flex min-w-0 items-center justify-center">
        <Link
          href="/"
          aria-label="Epsilone"
          className="md:hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/l.svg"
            alt="Epsilone"
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/80 transition hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Left: cart, theme and account */}
      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
        <Link
          href="/cart"
          aria-label="سبد خرید"
          className="relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:text-brand md:flex"
        >
          <CartIcon />

          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5">
              {cartBadge}
            </span>
          )}
        </Link>

        <ThemeToggle />

        {!ready ? (
          <span
            className="block h-10 w-10 shrink-0"
            aria-hidden="true"
          />
        ) : loggedIn ? (
          <Link
            href={panelHref}
            aria-label="پنل کاربری"
            title="پنل کاربری"
            className="block h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-brand/70 transition hover:border-brand"
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={name || "پروفایل"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-white/10 text-sm font-bold text-white">
                {initial}
              </span>
            )}
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="shrink-0 rounded-full border border-brand/70 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand/10 sm:px-8"
            >
              ورود
            </Link>

            <Link
              href="/signup"
              className="hidden shrink-0 text-xs text-white/90 transition hover:text-brand sm:block"
            >
              ثبت نام
            </Link>
          </>
        )}
      </div>
    </header>
  );
}