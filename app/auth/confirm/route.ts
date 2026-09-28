import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const redirectUrl = request.nextUrl.clone();

  if (!tokenHash || !type) {
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set(
      "error",
      "Invalid or expired verification link.",
    );

    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("Email verification error:", error);

    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set(
      "error",
      "This verification link is invalid or expired.",
    );

    return NextResponse.redirect(redirectUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("error", "Your session could not be created.");

    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error:", profileError);

    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("error", "Could not load your account.");

    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.search = "";

  if (profile?.role === "producer") {
    if (profile.username) {
      redirectUrl.pathname = `/producer/${encodeURIComponent(profile.username)}`;
    } else {
      redirectUrl.pathname = "/producer/setup";
    }
  } else if (profile?.role === "admin") {
    redirectUrl.pathname = "/admin";
  } else {
    redirectUrl.pathname = "/";
  }

  return NextResponse.redirect(redirectUrl);
}
