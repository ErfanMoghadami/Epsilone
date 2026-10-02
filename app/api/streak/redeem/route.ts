import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ERRORS: Record<string, string> = {
  REWARD_NOT_AVAILABLE: "This reward is no longer available.",
  NO_BEAT_AVAILABLE:
    "No free beat is available right now. Your reward stays valid, try again later.",
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 },
      );
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { success: false, error: "Please verify your email first." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const rewardId = typeof body?.rewardId === "string" ? body.rewardId : "";

    if (!UUID.test(rewardId)) {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data, error } = await admin.rpc("streak_redeem", {
      p_user_id: user.id,
      p_reward_id: rewardId,
    });

    if (error) {
      const code = Object.keys(ERRORS).find((c) => error.message.includes(c));

      if (code) {
        return NextResponse.json(
          { success: false, error: ERRORS[code] },
          { status: 400 },
        );
      }

      console.error("Streak redeem error:", error);

      return NextResponse.json(
        { success: false, error: "Failed to redeem reward." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      orderId: data?.orderId,
      beat: { id: data?.beatId, title: data?.title },
    });
  } catch (error) {
    console.error("Streak redeem error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to redeem reward." },
      { status: 500 },
    );
  }
}
