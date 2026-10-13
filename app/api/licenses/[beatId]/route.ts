
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    beatId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { beatId } = await context.params;
    const supabase = await createClient();

    const {
      data: available,
      error: availabilityError,
    } = await supabase.rpc("is_exclusive_beat_available", {
      p_beat_id: beatId,
    });

    if (availabilityError) {
      console.error(
        "Beat availability check failed:",
        availabilityError.message,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Could not verify beat availability.",
        },
        { status: 500 },
      );
    }

    // Fail closed if the beat is sold or reserved.
    if (available !== true) {
      return NextResponse.json({
        success: true,
        available: false,
        licenses: [],
      });
    }

    const { data, error } = await supabase
      .from("beat_licenses")
      .select(
        "id, license_type, price, currency, includes_stems, terms",
      )
      .eq("beat_id", beatId)
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error("License query failed:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to load licenses.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      available: true,
      licenses: data ?? [],
    });
  } catch (error) {
    console.error("License API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load licenses.",
      },
      { status: 500 },
    );
  }
}
