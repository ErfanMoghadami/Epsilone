import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProducerSignOutButton from "@/components/auth/producer-sign-out-button";
import PanelShell from "@/components/panel/PanelShell";
import type { PanelNavItem } from "@/components/panel/PanelNav";

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
    redirect("/producer/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "producer") {
    redirect("/producer/login");
  }

  const username = profile.username?.trim().toLowerCase() || null;

  const items: PanelNavItem[] = [
    ...(username
      ? [
          {
            href: `/producer/${encodeURIComponent(username)}`,
            label: "داشبورد",
            icon: "overview" as const,
            exact: true,
          },
        ]
      : []),
    { href: "/producer/beats", label: "بیت‌های من", icon: "beats" },
    { href: "/producer/upload", label: "آپلود بیت", icon: "upload" },
  ];

  return (
    <PanelShell
      title="پنل آهنگساز"
      subtitle={username ? `@${username}` : null}
      items={items}
      settings={{
        href: "/producer/settings",
        label: "تنظیمات",
        icon: "settings",
      }}
      signOut={<ProducerSignOutButton />}
    >
      {children}
    </PanelShell>
  );
}
