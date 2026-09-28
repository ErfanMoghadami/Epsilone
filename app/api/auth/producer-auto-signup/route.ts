import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase admin environment variables are missing.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body?.password === "string" ? body.password : "";

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required.",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters.",
        },
        { status: 400 },
      );
    }

    // Create the auth user.
    // This route is specifically for the "login -> signup if needed" flow.
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          success: false,
          error: userError?.message || "Could not create producer account.",
        },
        { status: 400 },
      );
    }

    const userId = userData.user.id;

    const displayName = email.split("@")[0] || "Producer";

    // Create producer profile with NO username.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        role: "producer",
        display_name: displayName,
        username: null,
        bio: "",
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("Auto producer profile creation error:", profileError);

      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          success: false,
          error: "Could not create producer profile.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      userId,
    });
  } catch (error) {
    console.error("Producer auto-signup error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Something went wrong.",
      },
      { status: 500 },
    );
  }
}
