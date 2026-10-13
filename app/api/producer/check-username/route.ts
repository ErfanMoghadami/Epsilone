import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const RESERVED_USERNAMES = new Set([
  "login",
  "signup",
  "setup",
  "forgot-password",
  "beats",
  "upload",
  "settings",
  "producers",
  "producer",
  "api",
  "auth",
  "cart",
  "checkout",
  "dashboard",
  "discover",
  "favorites",
  "purchases",
  "payment",
  "payments",
  "about",
  "privacy",
  "terms",
  "contact",
  "support",
  "admin",
  "root",
  "www",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);

  const username = (
    url.searchParams.get("username") ?? ""
  )
    .trim()
    .toLowerCase();

  if (!/^[a-z0-9_-]{3,20}$/.test(username)) {
    return NextResponse.json(
      {
        available: false,
        error:
          "Username must be 3–20 characters and contain only letters, numbers, underscores, or hyphens.",
      },
      { status: 400 },
    );
  }

  if (RESERVED_USERNAMES.has(username)) {
    return NextResponse.json({
      available: false,
      error: "This username is reserved.",
    });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        available: false,
        error: "You must be logged in.",
      },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("id, username, role")
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "producer"
  ) {
    return NextResponse.json(
      {
        available: false,
        error: "Producer account not found.",
      },
      { status: 403 },
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Supabase admin environment variables are missing.",
    );

    return NextResponse.json(
      {
        available: false,
        error: "Server configuration error.",
      },
      { status: 500 },
    );
  }

  const supabaseAdmin = createAdminClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // Check the currently active username.
  const {
    data: existingProfile,
    error: existingProfileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfileError) {
    console.error(
      "Username lookup failed:",
      existingProfileError,
    );

    return NextResponse.json(
      {
        available: false,
        error: "Could not check username availability.",
      },
      { status: 500 },
    );
  }

  // Check whether this name is reserved as an old username.
  const {
    data: alias,
    error: aliasError,
  } = await supabaseAdmin
    .from("producer_username_aliases")
    .select("producer_id")
    .eq("username", username)
    .maybeSingle();

  if (aliasError) {
    console.error("Username alias lookup failed:", aliasError);

    return NextResponse.json(
      {
        available: false,
        error: "Could not check username availability.",
      },
      { status: 500 },
    );
  }

  const activeNameAvailable =
    !existingProfile ||
    existingProfile.id === user.id;

  const aliasAvailable =
    !alias ||
    alias.producer_id === user.id;

  return NextResponse.json({
    available:
      activeNameAvailable && aliasAvailable,
  });
}