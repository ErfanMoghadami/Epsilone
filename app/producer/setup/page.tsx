import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsernameAvailabilityInput from "@/components/producer/username-availability-input";
const RESERVED_USERNAMES = new Set([
  "login",
  "signup",
  "setup",
  "forgot-password",
  "beats",
  "upload",
  "settings",
]);

export default async function ProducerSetupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/producer/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "producer") {
    redirect("/producer/login");
  }

  if (profile.username) {
    redirect(`/producer/${encodeURIComponent(profile.username)}`);
  }

  async function completeProducerSetup(formData: FormData) {
    "use server";

    const usernameValue = formData.get("username");
    const passwordValue = formData.get("password");
    const confirmPasswordValue = formData.get("confirmPassword");

    const username =
      typeof usernameValue === "string"
        ? usernameValue.trim().toLowerCase()
        : "";

    const password = typeof passwordValue === "string" ? passwordValue : "";

    const confirmPassword =
      typeof confirmPasswordValue === "string" ? confirmPasswordValue : "";

    if (!/^[a-z0-9_-]{3,20}$/.test(username)) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens.",
        )}`,
      );
    }

    if (RESERVED_USERNAMES.has(username)) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "This username is reserved. Please choose another one.",
        )}`,
      );
    }

    if (password.length < 8) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "Password must be at least 8 characters.",
        )}`,
      );
    }

    if (password !== confirmPassword) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "Passwords do not match.",
        )}`,
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/producer/login");
    }

    const { data: existingUsername, error: usernameLookupError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .maybeSingle();

    if (usernameLookupError) {
      console.error("Username availability check error:", usernameLookupError);

      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "Could not check username availability.",
        )}`,
      );
    }

    if (existingUsername) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "This username is already taken.",
        )}`,
      );
    }

    // Set password first while the authenticated Google session is active.
    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      console.error("Producer password setup error:", passwordError);

      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "Could not set your password. Please try again.",
        )}`,
      );
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        username,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .eq("role", "producer");

    if (profileUpdateError) {
      console.error("Producer username setup error:", profileUpdateError);

      if (profileUpdateError.code === "23505") {
        redirect(
          `/producer/setup?error=${encodeURIComponent(
            "This username is already taken.",
          )}`,
        );
      }

      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "Could not save your username.",
        )}`,
      );
    }

    redirect(`/producer/${encodeURIComponent(username)}`);
  }

  const { error } = await searchParams;

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center">
      <div className="mt-6">
        <UsernameAvailabilityInput />
      </div>
    </main>
  );
}
