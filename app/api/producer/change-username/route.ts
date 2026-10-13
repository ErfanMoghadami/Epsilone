import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON body.",
        },
        { status: 400 },
      );
    }

    const requestedUsername =
      typeof body === "object" &&
      body !== null &&
      "username" in body &&
      typeof body.username === "string"
        ? body.username
        : "";

    const username = requestedUsername
      .trim()
      .toLowerCase();

    if (!/^[a-z0-9_-]{3,20}$/.test(username)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username must be 3–20 characters and contain only letters, numbers, underscores, or hyphens.",
        },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "producer"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Producer account not found.",
        },
        { status: 403 },
      );
    }

    // The RPC atomically checks availability, preserves the
    // previous username, and updates the producer's profile.
    const { data, error } = await supabase.rpc(
      "change_producer_username",
      {
        p_new_username: username,
      },
    );

    if (error) {
      const message = error.message ?? "";

      if (message.includes("username_invalid")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Username must be 3–20 characters and contain only letters, numbers, underscores, or hyphens.",
          },
          { status: 400 },
        );
      }

      if (message.includes("username_reserved")) {
        return NextResponse.json(
          {
            success: false,
            error: "This username is reserved.",
          },
          { status: 400 },
        );
      }

      if (message.includes("username_taken")) {
        return NextResponse.json(
          {
            success: false,
            error: "This username is already taken.",
          },
          { status: 409 },
        );
      }

      if (
        message.includes("authentication_required")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "You must be logged in.",
          },
          { status: 401 },
        );
      }

      if (
        message.includes("producer_profile_not_found")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Producer account not found.",
          },
          { status: 403 },
        );
      }

      console.error("Change username RPC failed:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Could not update username.",
        },
        { status: 500 },
      );
    }

    const result = data as {
      success?: boolean;
      changed?: boolean;
      username?: string;
      previous_username?: string | null;
    } | null;

    if (
      !result?.success ||
      !result.username
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not confirm username update.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      changed: Boolean(result.changed),
      username: result.username,
      previousUsername:
        result.previous_username ?? null,
      publicProfileUrl:
        `/producers/${encodeURIComponent(result.username)}`,
    });
  } catch (error) {
    console.error("Change username error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}