"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteFromR2 } from "@/lib/r2";
import { revalidatePath } from "next/cache";

type DeleteBeatResult =
  | {
      success: true;
      storageCleanupFailed: boolean;
      message?: string;
    }
  | {
      success: false;
      error: string;
    };

export async function deleteBeat(beatId: string): Promise<DeleteBeatResult> {
  if (!beatId || typeof beatId !== "string") {
    return {
      success: false,
      error: "شناسهٔ بیت نامعتبر است.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "برای این کار باید با حساب آهنگساز وارد شده باشی.",
    };
  }

  const { data: beat, error: beatError } = await supabase
    .from("beats")
    .select(
      "id, producer_id, analysis_status, audio_key, preview_key, cover_key",
    )
    .eq("id", beatId)
    .eq("producer_id", user.id)
    .single();

  if (beatError || !beat) {
    console.error("Failed to find beat for deletion:", beatError);

    return {
      success: false,
      error: "بیت پیدا نشد یا به آن دسترسی نداری.",
    };
  }

  if (beat.analysis_status === "processing") {
    return {
      success: false,
      error:
        "این بیت در حال تحلیل است. لطفاً تا پایان تحلیل صبر کن و بعد حذفش کن.",
    };
  }

  // Request the deleted row back. Supabase can return no error when RLS
  // prevents a DELETE from affecting any rows, so checking only deleteError
  // could otherwise remove the R2 files while the database row remains.
  const { data: deletedBeat, error: deleteError } = await supabase
    .from("beats")
    .delete()
    .eq("id", beat.id)
    .eq("producer_id", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    console.error("Failed to delete beat:", deleteError);

    return {
      success: false,
      error:
        "حذف بیت انجام نشد. ممکن است به اطلاعات فروشگاه، مثل یک سفارش، وابسته باشد.",
    };
  }

  if (!deletedBeat) {
    console.error("Beat DELETE affected zero rows. Check the beats DELETE RLS policy.", {
      beatId: beat.id,
      producerId: user.id,
    });

    return {
      success: false,
      error:
        "بیت از پایگاه داده حذف نشد و فایل‌های رسانه‌اش دست‌نخورده ماندند. سیاست DELETE در Supabase را بررسی کن.",
    };
  }

  const storageKeys = [
    beat.audio_key,
    beat.preview_key,
    beat.cover_key,
  ].filter((key): key is string => Boolean(key));

  const cleanupResults = await Promise.allSettled(
    storageKeys.map((key) => deleteFromR2(key)),
  );

  const storageCleanupFailed = cleanupResults.some(
    (result) => result.status === "rejected",
  );

  if (storageCleanupFailed) {
    console.error("Some R2 objects could not be deleted:", {
      beatId: beat.id,
      storageKeys,
      cleanupResults,
    });
  }

  // Invalidate affected pages so listings do not keep stale beat data.
  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/trending");
  revalidatePath("/producers");
  revalidatePath("/producer/beats");
  revalidatePath("/producers/[username]", "page");
  revalidatePath("/producer/[username]", "page");
  revalidatePath("/beat/[id]", "page");

  return {
    success: true,
    storageCleanupFailed,
    message: storageCleanupFailed
      ? "بیت حذف شد، اما پاک‌سازی خودکار بعضی از فایل‌های ذخیره‌سازی انجام نشد."
      : "بیت با موفقیت حذف شد.",
  };
}

type RetryAnalysisResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

export async function retryAnalysis(
  beatId: string,
): Promise<RetryAnalysisResult> {
  if (!beatId || typeof beatId !== "string") {
    return {
      success: false,
      error: "شناسهٔ بیت نامعتبر است.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "برای این کار باید با حساب آهنگساز وارد شده باشی.",
    };
  }

  const { data: beat, error: beatError } = await supabase
    .from("beats")
    .select("id, producer_id, analysis_status")
    .eq("id", beatId)
    .eq("producer_id", user.id)
    .single();

  if (beatError || !beat) {
    console.error("Failed to find beat for analysis retry:", beatError);

    return {
      success: false,
      error: "بیت پیدا نشد یا به آن دسترسی نداری.",
    };
  }

  if (beat.analysis_status !== "failed") {
    return {
      success: false,
      error: "فقط بیت‌های ناموفق را می‌شود دستی دوباره تحلیل کرد.",
    };
  }

  const { error: resetError } = await supabase
    .from("beats")
    .update({
      analysis_status: "pending",
      analysis_error: null,
      analysis_attempts: 0,
      next_analysis_at: null,
      analysis_started_at: null,
      last_analysis_attempt_at: null,
    })
    .eq("id", beat.id)
    .eq("producer_id", user.id);

  if (resetError) {
    console.error("Failed to reset beat analysis:", resetError);

    return {
      success: false,
      error: "آماده‌سازی بیت برای تحلیل دوباره انجام نشد.",
    };
  }

  const workerUrl = process.env.VPS_WORKER_URL;
  const workerSecret = process.env.VPS_WORKER_SECRET;

  if (!workerUrl || !workerSecret) {
    const configurationError = "VPS worker is not configured.";

    await supabase
      .from("beats")
      .update({
        analysis_status: "failed",
        analysis_error: configurationError,
      })
      .eq("id", beat.id)
      .eq("producer_id", user.id);

    return {
      success: false,
      error: "سرور تحلیل پیکربندی نشده است.",
    };
  }

  try {
    const response = await fetch(
      `${workerUrl}/analyze/${beat.id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${workerSecret}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    let workerData: { error?: string; message?: string } = {};

    try {
      workerData = await response.json();
    } catch {
      // The worker response body is optional for a successful trigger.
    }

    if (!response.ok) {
      const workerError =
        workerData.error ||
        workerData.message ||
        `Worker returned status ${response.status}.`;

      await supabase
        .from("beats")
        .update({
          analysis_status: "failed",
          analysis_error: workerError,
        })
        .eq("id", beat.id)
        .eq("producer_id", user.id);

      return {
        success: false,
        error: workerError,
      };
    }

    return {
      success: true,
      message: "تحلیل دوباره شروع شد.",
    };
  } catch (error) {
    console.error("Failed to contact analysis worker:", error);

    const message =
      error instanceof Error
        ? error.message
        : "ارتباط با سرور تحلیل برقرار نشد.";

    await supabase
      .from("beats")
      .update({
        analysis_status: "failed",
        analysis_error: message,
      })
      .eq("id", beat.id)
      .eq("producer_id", user.id);

    return {
      success: false,
      error: message,
    };
  }
}

export type ToggleBeatPublishingResult =
  | { success: true; isPublished: boolean; message: string }
  | { success: false; error: string };

/** Toggle marketplace visibility without deleting the beat or its media. */
export async function toggleBeatPublishing(
  beatId: string,
  isPublished: boolean,
): Promise<ToggleBeatPublishingResult> {
  if (!beatId || typeof beatId !== "string" || typeof isPublished !== "boolean") {
    return { success: false, error: "درخواست انتشار نامعتبر است." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "برای این کار باید با حساب آهنگساز وارد شده باشی." };
  }

  const { data: beat, error: beatError } = await supabase
    .from("beats")
    .select("id, producer_id, analysis_status, is_published")
    .eq("id", beatId)
    .eq("producer_id", user.id)
    .maybeSingle();

  if (beatError || !beat) {
    console.error("Failed to load beat for publishing toggle:", beatError);
    return { success: false, error: "بیت پیدا نشد یا به آن دسترسی نداری." };
  }

  if (!["completed", "skipped"].includes(beat.analysis_status ?? "")) {
    return {
      success: false,
      error: "بیت فقط بعد از تکمیل یا رد شدن تحلیل قابل انتشار است.",
    };
  }

  if (Boolean(beat.is_published) === isPublished) {
    return {
      success: true,
      isPublished,
      message: isPublished ? "بیت از قبل روشن (منتشرشده) است." : "بیت از قبل خاموش (پنهان) است.",
    };
  }

  const { data: updatedBeat, error: updateError } = await supabase
    .from("beats")
    .update({ is_published: isPublished })
    .eq("id", beat.id)
    .eq("producer_id", user.id)
    .select("id, is_published")
    .maybeSingle();

  if (updateError || !updatedBeat) {
    console.error("Failed to change beat publishing status:", updateError);
    return {
      success: false,
      error: "تغییر وضعیت انتشار انجام نشد. سیاست UPDATE جدول beats را بررسی کن.",
    };
  }

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/trending");
  revalidatePath("/producers");
  revalidatePath("/producer/beats");
  revalidatePath("/api/discover");
  revalidatePath("/api/trending");
  revalidatePath("/api/recommend");
  revalidatePath("/beat/[id]", "page");
  revalidatePath("/producers/[username]", "page");

  return {
    success: true,
    isPublished,
    message: isPublished
      ? "بیت روشن شد و در فروشگاه نمایش داده می‌شود."
      : "بیت خاموش شد و از فروشگاه پنهان است. سفارش‌های قبلی تغییری نمی‌کنند.",
  };
}
