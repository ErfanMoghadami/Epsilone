import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function isRecentlyCreatedGoogleUser(user: {
  created_at?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  identities?: Array<{
    provider?: string;
  }>;
}) {
  if (!user.created_at) {
    return false;
  }

  const isGoogleUser =
    user.app_metadata?.provider === "google" ||
    user.app_metadata?.providers?.includes("google") ||
    user.identities?.some(
      (identity) => identity.provider === "google",
    );

  if (!isGoogleUser) {
    return false;
  }

  const createdAt = new Date(user.created_at).getTime();

  if (Number.isNaN(createdAt)) {
    return false;
  }

  // Treat a newly-created Google account as a new signup
  // for up to 10 minutes after creation.
  const TEN_MINUTES = 10 * 60 * 1000;

  return Date.now() - createdAt <= TEN_MINUTES;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const mode = url.searchParams.get("mode") ?? "client-login";

  const safeNext = next.startsWith("/") ? next : "/";

  // --------------------------------------------------------
  // Missing OAuth code
  // --------------------------------------------------------

  if (!code) {
    const errorPath =
      mode === "producer-signup" ||
      mode === "producer-login"
        ? "/producer/login"
        : "/login";

    return NextResponse.redirect(
      new URL(
        `${errorPath}?error=Google authentication failed.`,
        url.origin,
      ),
    );
  }

  const supabase = await createClient();

  // --------------------------------------------------------
  // Exchange OAuth code for session
  // --------------------------------------------------------

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      "Google OAuth exchange error:",
      exchangeError,
    );

    const errorMessage =
      exchangeError.message ||
      "Google authentication failed.";

    const errorPath =
      mode === "producer-signup" ||
      mode === "producer-login"
        ? "/producer/login"
        : "/login";

    return NextResponse.redirect(
      new URL(
        `${errorPath}?error=${encodeURIComponent(
          errorMessage,
        )}`,
        url.origin,
      ),
    );
  }

  // --------------------------------------------------------
  // Get authenticated user
  // --------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login?error=User session could not be loaded.",
        url.origin,
      ),
    );
  }

  // --------------------------------------------------------
  // Get existing profile
  // --------------------------------------------------------

  const {
    data: existingProfile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Profile lookup error:",
      profileError,
    );

    await supabase.auth.signOut();

    const errorPath =
      mode === "producer-signup" ||
      mode === "producer-login"
        ? "/producer/login"
        : "/login";

    return NextResponse.redirect(
      new URL(
        `${errorPath}?error=Could not load your account.`,
        url.origin,
      ),
    );
  }

  const isNewGoogleUser =
    isRecentlyCreatedGoogleUser(user);

  // ========================================================
  // PRODUCER SIGNUP THROUGH GOOGLE
  // ========================================================

  if (mode === "producer-signup") {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Supabase admin environment variables are missing.",
      );

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

    // ------------------------------------------------------
    // Brand-new Google account
    //
    // A DB trigger may have already created a buyer profile.
    // Convert that fresh profile into a producer profile.
    // ------------------------------------------------------

    if (
      isNewGoogleUser &&
      (!existingProfile ||
        existingProfile.role === "buyer")
    ) {
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Producer";

      const {
        error: producerProfileError,
      } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: user.id,
            role: "producer",
            display_name: displayName,
            username: null,
            bio: "",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          },
        );

      if (producerProfileError) {
        console.error(
          "Google producer profile creation error:",
          producerProfileError,
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
        new URL(
          "/producer/setup",
          url.origin,
        ),
      );
    }

    // ------------------------------------------------------
    // Existing account
    // ------------------------------------------------------

    if (existingProfile) {
      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/producer/signup?error=This email already has an account. Please use Producer Login.",
          url.origin,
        ),
      );
    }

    // ------------------------------------------------------
    // No profile for some reason
    // ------------------------------------------------------

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Producer";

    const {
      error: createProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        role: "producer",
        display_name: displayName,
        username: null,
        bio: "",
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
      new URL(
        "/producer/setup",
        url.origin,
      ),
    );
  }

  // ========================================================
  // PRODUCER LOGIN THROUGH GOOGLE
  // ========================================================

  if (mode === "producer-login") {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Supabase admin environment variables are missing.",
      );

      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/producer/login?error=Server configuration error.",
          url.origin,
        ),
      );
    }

    const supabaseAdmin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
    );

    // ------------------------------------------------------
    // Brand-new Google account
    //
    // If the DB trigger created a buyer profile,
    // convert it into producer.
    // ------------------------------------------------------

    if (
      isNewGoogleUser &&
      (!existingProfile ||
        existingProfile.role === "buyer")
    ) {
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Producer";

      const {
        error: producerProfileError,
      } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: user.id,
            role: "producer",
            display_name: displayName,
            username: null,
            bio: "",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          },
        );

      if (producerProfileError) {
        console.error(
          "Google producer profile creation error:",
          producerProfileError,
        );

        await supabase.auth.signOut();

        return NextResponse.redirect(
          new URL(
            "/producer/login?error=Could not create your producer profile.",
            url.origin,
          ),
        );
      }

      return NextResponse.redirect(
        new URL(
          "/producer/setup",
          url.origin,
        ),
      );
    }

    // ------------------------------------------------------
    // Existing producer
    // ------------------------------------------------------

    if (
      existingProfile &&
      existingProfile.role === "producer"
    ) {
      if (!existingProfile.username) {
        return NextResponse.redirect(
          new URL(
            "/producer/setup",
            url.origin,
          ),
        );
      }

      return NextResponse.redirect(
        new URL(
          `/producer/${encodeURIComponent(
            existingProfile.username,
          )}`,
          url.origin,
        ),
      );
    }

    // ------------------------------------------------------
    // Existing non-producer account
    // ------------------------------------------------------

    if (
      existingProfile &&
      existingProfile.role !== "producer"
    ) {
      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/producer/login?error=This Google account is not registered as a producer.",
          url.origin,
        ),
      );
    }

    // ------------------------------------------------------
    // No profile
    // ------------------------------------------------------

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Producer";

    const {
      error: createProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        role: "producer",
        display_name: displayName,
        username: null,
        bio: "",
        updated_at: new Date().toISOString(),
      });

    if (createProfileError) {
      console.error(
        "Google producer profile creation error:",
        createProfileError,
      );

      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL(
          "/producer/login?error=Could not create your producer profile.",
          url.origin,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(
        "/producer/setup",
        url.origin,
      ),
    );
  }

  // ========================================================
  // CLIENT SIGNUP THROUGH GOOGLE
  // ========================================================

  if (mode === "client-signup") {
    if (!existingProfile) {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

      const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        console.error(
          "Supabase admin environment variables are missing.",
        );

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

      const {
        error: createProfileError,
      } = await supabaseAdmin
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

  // ========================================================
  // CLIENT LOGIN THROUGH GOOGLE
  // ========================================================

  if (
    !existingProfile ||
    existingProfile.role !== "buyer"
  ) {
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL(
        "/login?error=This Google account is not registered as a client.",
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      safeNext,
      url.origin,
    ),
  );
}