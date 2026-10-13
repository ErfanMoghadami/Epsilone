import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ beatId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { beatId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "You must be logged in as a producer." }, { status: 401 });
    }

    let body: { discountPercent?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }

    const discountPercent = Number(body.discountPercent);
    if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 90) {
      return NextResponse.json({ success: false, error: "Discount must be a whole number from 0 to 90." }, { status: 400 });
    }

    const { data: updatedBeat, error: updateError } = await supabase
      .from("beats")
      .update({ discount_percent: discountPercent })
      .eq("id", beatId)
      .eq("producer_id", user.id)
      .select("id, discount_percent")
      .maybeSingle();

    if (updateError) {
      console.error("Beat discount update failed:", updateError);
      return NextResponse.json({ success: false, error: "Could not save the discount." }, { status: 500 });
    }

    if (!updatedBeat) {
      return NextResponse.json({ success: false, error: "Beat not found or you do not have access to it." }, { status: 404 });
    }

    return NextResponse.json({ success: true, discountPercent: updatedBeat.discount_percent });
  } catch (error) {
    console.error("Producer discount route error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
