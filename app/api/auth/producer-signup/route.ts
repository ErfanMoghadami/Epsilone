import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not configured.",
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not configured.",
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const displayName = body?.displayName;
    const username = body?.username;
    const bio = body?.bio;
    const email = body?.email;
    const password = body?.password;

    if (
      typeof displayName !== "string" ||
      !displayName.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Display name is required.",
        },
        { status: 400 },
      );
    }

    if (displayName.trim().length > 50) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Display name must be 50 characters or less.",
        },
        { status: 400 },
      );
    }

    if (
      typeof username !== "string" ||
      !username.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required.",
        },
        { status: 400 },
      );
    }

    const cleanUsername =
      username.trim().toLowerCase();

    if (
      cleanUsername.length < 3 ||
      cleanUsername.length > 30
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username must be between 3 and 30 characters.",
        },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username can only contain letters, numbers, and underscores.",
        },
        { status: 400 },
      );
    }

    if (
      typeof bio !== "string" ||
      !bio.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Bio is required.",
        },
        { status: 400 },
      );
    }

    if (bio.trim().length > 300) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bio must be 300 characters or less.",
        },
        { status: 400 },
      );
    }

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required.",
        },
        { status: 400 },
      );
    }

    if (
      typeof password !== "string" ||
      password.length < 6
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be at least 6 characters.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------------
    // Check username
    // --------------------------------------------------------

    const { data: existingUsername } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();

    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This username is already taken.",
        },
        { status: 409 },
      );
    }

    // --------------------------------------------------------
    // Create Auth user
    // --------------------------------------------------------

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: false,
      });

    if (userError || !userData.user) {
      return NextResponse.json(
        {
          success: false,
          error:
            userError?.message ||
            "Could not create user.",
        },
        { status: 400 },
      );
    }

    const userId = userData.user.id;

    // --------------------------------------------------------
    // Create Producer profile
    // --------------------------------------------------------

    const { error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            role: "producer",
            display_name: displayName.trim(),
            username: cleanUsername,
            bio: bio.trim(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          },
        );

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Could not create producer profile.",
        },
        { status: 500 },
      );
    }

    // Send the signup confirmation email. The Supabase email template must
    // use {{ .Token }} for a six-digit code (rather than only a confirmation URL).
    const { error: emailError } = await supabaseAdmin.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
    });

    if (emailError) {
      console.error("Producer confirmation email error:", emailError);
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          success: false,
          error: "Could not send the verification code. Please try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Producer account created. Check your email for the verification code.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Producer signup error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      { status: 500 },
    );
  }
}