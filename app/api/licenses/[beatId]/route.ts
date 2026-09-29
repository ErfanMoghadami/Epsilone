import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    beatId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { beatId } = await context.params;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("beat_licenses")
      .select("id, license_type, price, currency, includes_stems")
      .eq("beat_id", beatId)
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      licenses: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to load licenses.",
      },
      { status: 500 },
    );
  }
}
