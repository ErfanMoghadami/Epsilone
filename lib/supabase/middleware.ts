import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // --------------------------------------------------------
  // Public auth routes
  // --------------------------------------------------------

  const isClientAuthRoute = pathname === "/login" || pathname === "/signup";

  const isProducerAuthRoute =
    pathname === "/producer/login" ||
    pathname === "/producer/signup" ||
    pathname === "/producer/forgot-password";

  const isPublicAuthRoute = isClientAuthRoute || isProducerAuthRoute;

  // --------------------------------------------------------
  // Protected routes
  // --------------------------------------------------------

  const isProducerRoute =
    pathname.startsWith("/producer/") && !isProducerAuthRoute;

  const isDashboardRoute = pathname.startsWith("/dashboard");

  const isProtectedRoute = isProducerRoute || isDashboardRoute;

  // --------------------------------------------------------
  // Public pages
  // --------------------------------------------------------

  if (!isProtectedRoute) {
    return response;
  }

  // --------------------------------------------------------
  // Authentication required
  // --------------------------------------------------------

  if (!user) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = isProducerRoute ? "/producer/login" : "/login";

    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // --------------------------------------------------------
  // Load user profile / role
  // --------------------------------------------------------

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // --------------------------------------------------------
  // Producer routes
  // --------------------------------------------------------

  if (isProducerRoute) {
    if (profile.role !== "producer") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (!profile.username && pathname !== "/producer/setup") {
      return NextResponse.redirect(new URL("/producer/setup", request.url));
    }

    if (profile.username && pathname === "/producer/setup") {
      return NextResponse.redirect(
        new URL(
          `/producer/${encodeURIComponent(profile.username)}`,
          request.url,
        ),
      );
    }

    return response;
  }

  // --------------------------------------------------------
  // Client dashboard
  // --------------------------------------------------------

  if (isDashboardRoute) {
    if (profile.role === "producer") {
      if (!profile.username) {
        return NextResponse.redirect(
          new URL("/producer/setup", request.url),
        );
      }

      return NextResponse.redirect(
        new URL(
          `/producer/${encodeURIComponent(profile.username)}`,
          request.url,
        ),
      );
    }

    if (profile.role !== "buyer") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  }

  return response;
}
