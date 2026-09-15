import React from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: beats } = await supabase
    .from("beats")
    .select("id, analysis_status")
    .eq("producer_id", user!.id);

  const total = beats?.length ?? 0;

  const pending =
    beats?.filter((b) => b.analysis_status === "pending").length ?? 0;

  const completed =
    beats?.filter((b) => b.analysis_status === "completed").length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm">کل بیت‌ها</p>
          <p className="text-3xl font-bold text-white">{total}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm">در انتظار تحلیل</p>
          <p className="text-3xl font-bold text-white">{pending}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 text-sm">تحلیل‌شده</p>
          <p className="text-3xl font-bold text-white">{completed}</p>
        </div>
      </div>

      <Link
        href="/producer/upload"
        className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
      >
        آپلود بیت جدید
      </Link>
    </div>
  );
}
