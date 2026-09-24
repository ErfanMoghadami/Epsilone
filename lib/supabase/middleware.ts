import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

export async function updateSession(
  request: NextRequest
) {
  let supabaseResponse = NextResponse.next({
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
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          supabaseResponse =
            NextResponse.next({
              request,
            });

          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  // --------------------------------------------------------
  // Public producer signup
  // --------------------------------------------------------

  const isProducerSignup =
    pathname === "/producer/signup";

  // --------------------------------------------------------
  // Producer routes
  // --------------------------------------------------------

  const isProducerRoute =
    pathname.startsWith("/producer") &&
    !isProducerSignup;

  // --------------------------------------------------------
  // Buyer dashboard routes
  // --------------------------------------------------------

  const isDashboardRoute =
    pathname.startsWith("/dashboard");

  // --------------------------------------------------------
  // Nothing to protect
  // --------------------------------------------------------

  if (
    !isProducerRoute &&
    !isDashboardRoute
  ) {
    return supabaseResponse;
  }

  // --------------------------------------------------------
  // User must be logged in
  // --------------------------------------------------------

  if (!user) {
    const url =
      request.nextUrl.clone();

    url.pathname = "/login";

    return NextResponse.redirect(url);
  }

  // --------------------------------------------------------
  // Get user role
  // --------------------------------------------------------

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // If profile cannot be loaded,
  // don't allow access to protected areas.
  if (
    profileError ||
    !profile
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname = "/";

    return NextResponse.redirect(url);
  }

  // --------------------------------------------------------
  // Producer protection
  // --------------------------------------------------------

  if (isProducerRoute) {
    if (profile.role !== "producer") {
      const url =
        request.nextUrl.clone();

      url.pathname = "/dashboard";

      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // --------------------------------------------------------
  // Buyer dashboard protection
  // --------------------------------------------------------

  if (isDashboardRoute) {
    if (profile.role === "producer") {
      const url =
        request.nextUrl.clone();

      url.pathname = "/producer";

      return NextResponse.redirect(url);
    }

    if (profile.role !== "buyer") {
      const url =
        request.nextUrl.clone();

      url.pathname = "/";

      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}