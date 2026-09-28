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
]);

export async function GET(request: Request) {
  const url = new URL(request.url);

  const username = (
    url.searchParams.get("username") || ""
  )
    .trim()
    .toLowerCase();

  // --------------------------------------------------------
  // Validate format
  // --------------------------------------------------------

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

  // --------------------------------------------------------
  // Reserved usernames
  // --------------------------------------------------------

  if (RESERVED_USERNAMES.has(username)) {
    return NextResponse.json({
      available: false,
    });
  }

  // --------------------------------------------------------
  // Check authentication
  // --------------------------------------------------------

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        available: false,
        error: "You must be logged in.",
      },
      { status: 401 },
    );
  }

  // --------------------------------------------------------
  // Check producer role
  // --------------------------------------------------------

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "producer") {
    return NextResponse.json(
      {
        available: false,
        error: "Producer account not found.",
      },
      { status: 403 },
    );
  }

  // --------------------------------------------------------
  // Use service role for username lookup
  // because RLS should not expose every producer profile
  // to the client.
  // --------------------------------------------------------

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
  );

  const {
    data: existingUsername,
    error: usernameLookupError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (usernameLookupError) {
    console.error(
      "Username lookup error:",
      usernameLookupError,
    );

    return NextResponse.json(
      {
        available: false,
        error:
          "Could not check username availability.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    available: !existingUsername,
  });
}