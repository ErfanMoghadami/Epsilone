import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const mode = url.searchParams.get("mode") ?? "client-login";

  // Only allow internal relative paths.
  const safeNext = next.startsWith("/") ? next : "/";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Google authentication failed.", url.origin),
    );
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Google OAuth exchange error:", exchangeError);

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          "Google authentication failed. Please try again.",
        )}`,
        url.origin,
      ),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=User session could not be loaded.", url.origin),
    );
  }

  // --------------------------------------------------------
  // Get existing profile
  // --------------------------------------------------------

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error:", profileError);

    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL(
        "/login?error=Could not load your account.",
        url.origin,
      ),
    );
  }

  // --------------------------------------------------------
  // Producer signup through Google
  // --------------------------------------------------------

  if (mode === "producer-signup") {
    // Existing account: never silently change its role.
    if (existingProfile) {
      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/producer/signup?error=This email already has an account. Please use Producer Login.",
          url.origin,
        ),
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase admin environment variables are missing.");

      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/producer/signup?error=Server configuration error.",
          url.origin,
        ),
      );
    }

    const supabaseAdmin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
    );

    const { error: createProfileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        role: "producer",
        updated_at: new Date().toISOString(),
      });

    if (createProfileError) {
      console.error(
        "Producer profile creation error:",
        createProfileError,
      );

      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/producer/signup?error=Could not create your producer profile.",
          url.origin,
        ),
      );
    }

    return NextResponse.redirect(
      new URL("/producer", url.origin),
    );
  }

  // --------------------------------------------------------
  // Producer login through Google
  // --------------------------------------------------------

  if (mode === "producer-login") {
    if (!existingProfile || existingProfile.role !== "producer") {
      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/producer/login?error=This Google account is not registered as a producer.",
          url.origin,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(safeNext.startsWith("/producer") ? safeNext : "/producer", url.origin),
    );
  }

  // --------------------------------------------------------
  // Client signup through Google
  // --------------------------------------------------------

  if (mode === "client-signup") {
    if (!existingProfile) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        console.error("Supabase admin environment variables are missing.");

        await supabase.auth.signOut();

        return NextResponse.redirect(
          new URL(
            "/signup?error=Server configuration error.",
            url.origin,
          ),
        );
      }

      const supabaseAdmin = createAdminClient(
        supabaseUrl,
        serviceRoleKey,
      );

      const { error: createProfileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          role: "buyer",
          updated_at: new Date().toISOString(),
        });

      if (createProfileError) {
        console.error(
          "Buyer profile creation error:",
          createProfileError,
        );

        await supabase.auth.signOut();

        return NextResponse.redirect(
          new URL(
            "/signup?error=Could not create your account profile.",
            url.origin,
          ),
        );
      }
    } else if (existingProfile.role !== "buyer") {
      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/signup?error=This account is not registered as a client.",
          url.origin,
        ),
      );
    }

    return NextResponse.redirect(
      new URL("/", url.origin),
    );
  }

  // --------------------------------------------------------
  // Client login through Google
  // --------------------------------------------------------

  if (!existingProfile || existingProfile.role !== "buyer") {
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL(
        "/login?error=This Google account is not registered as a client.",
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(safeNext, url.origin),
  );
}