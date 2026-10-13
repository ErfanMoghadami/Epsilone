// "use client";

// import Link from "next/link";
// import { useEffect, useRef, useState } from "react";
// import { usePathname } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";
// import EpsiloneMark from "@/components/EpsiloneMark";
// import ThemeToggle from "@/components/ThemeToggle";

// const CART_KEY = "epsilone-cart";

// const LINKS = [
//   { href: "/producers", label: "پرودیوسرها" },
//   { href: "/discover", label: " بیت‌ها" },
//   { href: "/trending", label: "Trending" },
// ];

// type NavProfile = {
//   role: string | null;
//   username: string | null;
//   avatar_url: string | null;
// };

// type NavUser = {
//   email: string | null;
//   profile: NavProfile | null;
// };

// function getCartCount() {
//   try {
//     const storedCart = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");

//     return Array.isArray(storedCart) ? storedCart.length : 0;
//   } catch {
//     return 0;
//   }
// }

// function getPanelHref(profile: NavProfile | null) {
//   if (profile?.role === "producer") {
//     return profile.username
//       ? `/producer/${encodeURIComponent(profile.username)}`
//       : "/producer/setup";
//   }

//   if (profile?.role === "admin") {
//     return "/admin";
//   }

//   return "/dashboard";
// }

// function HamburgerIcon() {
//   return (
//     <svg
//       width="28"
//       height="24"
//       viewBox="0 0 28 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2.6"
//       strokeLinecap="round"
//       aria-hidden="true"
//     >
//       <path d="M22 3h4" />
//       <path d="M2 9h24" />
//       <path d="M2 15h24" />
//       <path d="M2 21h24" />
//     </svg>
//   );
// }

// function CartIcon() {
//   return (
//     <svg
//       width="20"
//       height="20"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       aria-hidden="true"
//     >
//       <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2" />
//       <circle cx="9.5" cy="20" r="1.3" />
//       <circle cx="17" cy="20" r="1.3" />
//     </svg>
//   );
// }

// export default function GlobalNav() {
//   const pathname = usePathname();

//   const [supabase] = useState(() => createClient());
//   const [cartCount, setCartCount] = useState(0);
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [user, setUser] = useState<NavUser | null>(null);
//   const [authReady, setAuthReady] = useState(false);
//   const menuRef = useRef<HTMLDivElement>(null);

//   // Cart badge
//   useEffect(() => {
//     const updateCartCount = () => setCartCount(getCartCount());

//     updateCartCount();

//     window.addEventListener("cart-updated", updateCartCount);
//     window.addEventListener("storage", updateCartCount);

//     return () => {
//       window.removeEventListener("cart-updated", updateCartCount);
//       window.removeEventListener("storage", updateCartCount);
//     };
//   }, []);

//   // Current user + profile (avatar, role). Re-runs on login/logout.
//   useEffect(() => {
//     let cancelled = false;

//     async function load() {
//       const {
//         data: { user: authUser },
//       } = await supabase.auth.getUser();

//       if (cancelled) return;

//       if (!authUser) {
//         setUser(null);
//         setAuthReady(true);
//         return;
//       }

//       const { data: profile } = await supabase
//         .from("profiles")
//         .select("role, username, avatar_url")
//         .eq("id", authUser.id)
//         .maybeSingle();

//       if (cancelled) return;

//       setUser({
//         email: authUser.email ?? null,
//         profile: (profile as NavProfile | null) ?? null,
//       });
//       setAuthReady(true);
//     }

//     load();

//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange(() => {
//       // Don't call Supabase inside this callback directly.
//       setTimeout(load, 0);
//     });

//     return () => {
//       cancelled = true;
//       subscription.unsubscribe();
//     };
//   }, [supabase]);

//   useEffect(() => {
//     setMenuOpen(false);
//   }, [pathname]);

//   // Close the mobile menu on outside click / Escape
//   useEffect(() => {
//     if (!menuOpen) return;

//     const onPointerDown = (event: PointerEvent) => {
//       if (!menuRef.current?.contains(event.target as Node)) {
//         setMenuOpen(false);
//       }
//     };
//     const onKeyDown = (event: KeyboardEvent) => {
//       if (event.key === "Escape") setMenuOpen(false);
//     };

//     document.addEventListener("pointerdown", onPointerDown);
//     document.addEventListener("keydown", onKeyDown);

//     return () => {
//       document.removeEventListener("pointerdown", onPointerDown);
//       document.removeEventListener("keydown", onKeyDown);
//     };
//   }, [menuOpen]);

//   // The home page has its own header (HomeMenu).
//   if (pathname === "/") {
//     return null;
//   }

//   const isActive = (href: string) =>
//     pathname === href || pathname.startsWith(`${href}/`);

//   const panelHref = getPanelHref(user?.profile ?? null);
//   const displayName =
//     user?.profile?.username || user?.email?.split("@")[0] || "";
//   const initial = displayName.charAt(0).toUpperCase() || "E";

//   const cartBadge =
//     cartCount > 0 ? (
//       <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-ink">
//         {cartCount}
//       </span>
//     ) : null;

//   const account = !authReady ? (
//     <span className="block h-10 w-10" aria-hidden="true" />
//   ) : user ? (
//     <Link
//       href={panelHref}
//       aria-label="پنل کاربری"
//       title="پنل کاربری"
//       className="block h-10 w-10 overflow-hidden rounded-full border-2 border-brand/70 transition hover:border-brand"
//     >
//       {user.profile?.avatar_url ? (
//         <img
//           src={user.profile.avatar_url}
//           alt={displayName || "پروفایل"}
//           className="h-full w-full object-cover"
//         />
//       ) : (
//         <span className="flex h-full w-full items-center justify-center bg-ep-field text-sm font-bold text-ep-fg">
//           {initial}
//         </span>
//       )}
//     </Link>
//   ) : (
//     <div className="flex items-center gap-4">
//       <Link
//         href="/signup"
//         className="hidden text-xs text-ep-fg/90 transition hover:text-brand sm:block"
//       >
//         ثبت نام
//       </Link>
//       <Link
//         href="/login"
//         className="rounded-full border border-brand/70 px-7 py-2 text-xs font-bold text-ep-fg transition hover:bg-brand/10"
//       >
//         ورود
//       </Link>
//     </div>
//   );

//   return (
//     <header
//       dir="rtl"
//       className="font-fa sticky top-0 z-50 border-b border-ep-border bg-ep-nav backdrop-blur-md"
//     >
//       <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8">
//         {/* Start (right in RTL): hamburger on mobile, L on laptop */}
//         <div className="flex items-center justify-start">
//           <div ref={menuRef} className="relative md:hidden">
//             <button
//               type="button"
//               onClick={() => setMenuOpen((current) => !current)}
//               aria-label="باز کردن منو"
//               aria-expanded={menuOpen}
//               className="flex h-10 w-10 items-center justify-center rounded-full text-ep-fg transition hover:text-brand"
//             >
//               <HamburgerIcon />
//             </button>

//             {menuOpen && (
//               <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-ep-border bg-ep-bg/95 p-2 shadow-2xl backdrop-blur">
//                 {LINKS.map((link) => (
//                   <Link
//                     key={link.href}
//                     href={link.href}
//                     className={`block rounded-xl px-4 py-3 text-sm transition hover:bg-ep-fg/5 ${
//                       isActive(link.href) ? "text-brand-text" : "text-ep-fg"
//                     }`}
//                   >
//                     {link.label}
//                   </Link>
//                 ))}

//                 <Link
//                   href="/cart"
//                   className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition hover:bg-ep-fg/5 ${
//                     pathname === "/cart" ? "text-brand-text" : "text-ep-fg"
//                   }`}
//                 >
//                   سبد خرید
//                   {cartBadge}
//                 </Link>

//                 {authReady && !user && (
//                   <Link
//                     href="/signup"
//                     className="block rounded-xl px-4 py-3 text-sm text-ep-fg transition hover:bg-ep-fg/5"
//                   >
//                     ثبت نام
//                   </Link>
//                 )}

//                 <div className="mt-1 flex items-center justify-between border-t border-ep-border px-4 pt-2">
//                   <span className="text-sm text-ep-muted">حالت نمایش</span>
//                   <ThemeToggle />
//                 </div>
//               </div>
//             )}
//           </div>

//           <Link href="/" aria-label="Epsilone" className="hidden md:block">
//             <EpsiloneMark glow priority className="h-10 w-auto" />
//           </Link>
//         </div>

//         {/* Center: L on mobile, links on laptop */}
//         <div className="flex items-center justify-center">
//           <Link href="/" aria-label="Epsilone" className="md:hidden">
//             <EpsiloneMark glow priority className="h-10 w-auto" />
//           </Link>

//           <nav className="hidden items-center gap-2 md:flex">
//             {LINKS.map((link) => (
//               <Link
//                 key={link.href}
//                 href={link.href}
//                 className={`relative rounded-lg px-4 py-2 text-sm transition ${
//                   isActive(link.href)
//                     ? "text-ep-fg after:absolute after:inset-x-4 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand"
//                     : "text-ep-muted hover:text-ep-fg"
//                 }`}
//               >
//                 {link.label}
//               </Link>
//             ))}
//           </nav>
//         </div>

//         {/* End (left in RTL): cart + theme (laptop) and login / profile */}
//         <div className="flex items-center justify-end gap-2">
//           <Link
//             href="/cart"
//             aria-label="سبد خرید"
//             className="relative hidden h-10 w-10 items-center justify-center rounded-full text-ep-fg transition hover:text-brand md:flex"
//           >
//             <CartIcon />
//             {cartCount > 0 && (
//               <span className="absolute -top-0.5 -right-0.5">{cartBadge}</span>
//             )}
//           </Link>

//                     <ThemeToggle className="hidden md:flex" />

//           {account}
//         </div>
//       </div>
//     </header>
//   );
// }

"use client";

import { usePathname } from "next/navigation";
import HomeMenu from "@/components/HomeMenu";

export default function GlobalNav() {
  const pathname = usePathname();

  // The home page already renders HomeMenu itself.
  if (pathname === "/") {
    return null;
  }

  return <HomeMenu />;
}