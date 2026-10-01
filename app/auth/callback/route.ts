import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  let next = requestUrl.searchParams.get("next") ?? "/";

  // Only allow internal relative paths.
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/";
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", requestUrl.origin),
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error);

    return NextResponse.redirect(
      new URL(
        "/login?error=auth_callback_failed",
        requestUrl.origin,
      ),
    );
  }

  // In production Vercel may sit behind a proxy.
  // Use the forwarded host when available.
  const forwardedHost = request.headers.get(
    "x-forwarded-host",
  );

  const isLocal =
    process.env.NODE_ENV === "development";

  let origin = requestUrl.origin;

  if (!isLocal && forwardedHost) {
    const forwardedProto =
      request.headers.get("x-forwarded-proto") || "https";

    origin = `${forwardedProto}://${forwardedHost}`;
  }

  return NextResponse.redirect(
    new URL(next, origin),
  );
}