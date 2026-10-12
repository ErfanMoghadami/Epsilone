import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STREAK_TARGET, tehranDay } from "@/lib/streak";
import { loadStreakBeatCard } from "@/lib/streak-beats";

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // بیت رایگان این هفته: برای همه (حتی مهمان) نشون داده می‌شه
    const { data: weeklyBeatId, error: weeklyError } = await admin.rpc(
      "streak_weekly_beat",
    );

    if (weeklyError) {
      console.error("streak_weekly_beat error:", weeklyError);
    }

    const weeklyBeat = await loadStreakBeatCard(
      admin,
      (weeklyBeatId as string | null) ?? null,
    );

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        target: STREAK_TARGET,
        weeklyBeat,
      });
    }

    const [{ data: streak }, { data: reward }] = await Promise.all([
      supabase
        .from("user_streaks")
        .select("current_streak, last_checkin_date")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("streak_rewards")
        .select("id, expires_at, beat_id")
        .eq("user_id", user.id)
        .eq("status", "available")
        .gt("expires_at", new Date().toISOString())
        .order("earned_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const today = tehranDay(0);
    const yesterday = tehranDay(-1);
    const last = streak?.last_checkin_date ?? null;

    const alive = last === today || last === yesterday;

    const rewardBeat = reward
      ? reward.beat_id && reward.beat_id === weeklyBeat?.id
        ? weeklyBeat
        : await loadStreakBeatCard(admin, reward.beat_id)
      : null;

    return NextResponse.json({
      authenticated: true,
      verified: Boolean(user.email_confirmed_at),
      target: STREAK_TARGET,
      currentStreak: alive ? (streak?.current_streak ?? 0) : 0,
      countedToday: last === today,
      weeklyBeat,
      reward: reward
        ? { id: reward.id, expiresAt: reward.expires_at, beat: rewardBeat }
        : null,
    });
  } catch (error) {
    console.error("Streak status error:", error);

    return NextResponse.json(
      { authenticated: false, error: "Failed to load streak." },
      { status: 500 },
    );
  }
}