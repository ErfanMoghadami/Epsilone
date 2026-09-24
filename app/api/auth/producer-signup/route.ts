import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not configured."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not configured."
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body?.email;
    const password = body?.password;

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "email is required",
        },
        { status: 400 }
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
            "password must be at least 6 characters",
        },
        { status: 400 }
      );
    }

    // Create the Auth user.
    // Role is NOT accepted from the client.
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
            "Could not create user",
        },
        { status: 400 }
      );
    }

    const userId = userData.user.id;

    // Force this signup to producer.
    const { error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            role: "producer",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

    if (profileError) {
      // Clean up Auth user if profile creation fails.
      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Could not create producer profile",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Producer account created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Producer signup error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    );
  }
}