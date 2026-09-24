import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // --------------------------------------------------------
    // 1. Get logged-in user
    // --------------------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------------
    // 2. Read beatId
    // --------------------------------------------------------

    const body = await request.json();
    const beatId = body?.beatId;

    if (
      typeof beatId !== "string" ||
      !beatId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "beatId is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 3. Check whether favorite already exists
    // --------------------------------------------------------

    const {
      data: existingFavorite,
      error: favoriteCheckError,
    } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("beat_id", beatId)
      .maybeSingle();

    if (favoriteCheckError) {
      return NextResponse.json(
        {
          success: false,
          error:
            favoriteCheckError.message,
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------------
    // 4. Remove favorite
    // --------------------------------------------------------

    if (existingFavorite) {
      const {
        error: deleteError,
      } = await supabase
        .from("favorites")
        .delete()
        .eq("id", existingFavorite.id);

      if (deleteError) {
        return NextResponse.json(
          {
            success: false,
            error: deleteError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        favorited: false,
      });
    }

    // --------------------------------------------------------
    // 5. Add favorite
    // --------------------------------------------------------

    const {
      error: insertError,
    } = await supabase
      .from("favorites")
      .insert({
        user_id: user.id,
        beat_id: beatId,
      });

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      favorited: true,
    });
  } catch (error) {
    console.error(
      "Favorite toggle error:",
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