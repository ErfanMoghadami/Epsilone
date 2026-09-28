import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProducerEntryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in
  if (!user) {
    redirect("/producer/login");
  }

  // Get producer profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();

  // No producer profile
  if (!profile || profile.role !== "producer") {
    redirect("/producer/login");
  }

  // Producer has not chosen username yet
  if (!profile.username) {
    redirect("/producer/setup");
  }

  // Go to personal producer panel
  redirect(
    `/producer/${encodeURIComponent(profile.username)}`,
  );
}