import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function ProducerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-white/10 bg-zinc-950 p-6">
          {/* Logo */}
          <div className="mb-10">
            <h1 className="text-2xl font-bold tracking-tight">Epsilone</h1>

            <p className="mt-1 text-xs text-zinc-500">Producer Panel</p>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <Link
              href="/producer"
              className="block rounded-lg px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/producer/beats"
              className="block rounded-lg px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              My Beats
            </Link>

            <Link
              href="/producer/upload"
              className="block rounded-lg px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Upload Beat
            </Link>
          </nav>

          {/* Bottom */}
          <div className="mt-10 border-t border-white/10 pt-6">
            <Link
              href="/producer/settings"
              className="mb-2 block rounded-lg px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Settings
            </Link>

            <LogoutButton />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
