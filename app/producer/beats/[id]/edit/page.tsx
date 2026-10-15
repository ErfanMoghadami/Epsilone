"use client";

import React, {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { musicalKey } from "@/lib/uploadConfig";
import Select from "@/components/ui/Select";

const supabase = createClient();

type Beat = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;

  audio_key: string | null;
  cover_key: string | null;

  stems_key: string | null;
  stems_file_name: string | null;
  stems_content_type: string | null;
  stems_file_size: number | null;

  analysis_status: string | null;
  analysis_error: string | null;
  analyzed_at: string | null;
};

type FileType = "audio" | "cover";

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const beatId = params.id;

  const audioInputRef =
    useRef<HTMLInputElement>(null);

  const coverInputRef =
    useRef<HTMLInputElement>(null);

  const [beat, setBeat] =
    useState<Beat | null>(null);

  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("C Major");
  const [genre, setGenre] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [fileBusy, setFileBusy] =
    useState<FileType | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [fileError, setFileError] =
    useState<string | null>(null);

  const [fileSuccess, setFileSuccess] =
    useState<string | null>(null);

  // --------------------------------------------------------
  // Load beat
  // --------------------------------------------------------

  useEffect(() => {
    async function loadBeat() {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/producer/login");
        return;
      }

      const {
        data,
        error: fetchError,
      } = await supabase
        .from("beats")
        .select(
          `
            id,
            title,
            bpm,
            key,
            genre,
            audio_key,
            cover_key,
            stems_key,
            stems_file_name,
            stems_content_type,
            stems_file_size,
            analysis_status,
            analysis_error,
            analyzed_at
          `,
        )
        .eq("id", beatId)
        .eq("producer_id", user.id)
        .single();

      if (fetchError) {
        console.error(
          "Failed to load beat:",
          fetchError,
        );

        setError(
          "بیت پیدا نشد یا دسترسی به اون رو نداری.",
        );

        setIsLoading(false);
        return;
      }

      const loadedBeat =
        data as Beat;

      setBeat(loadedBeat);
      setTitle(
        loadedBeat.title ?? "",
      );
      setBpm(
        loadedBeat.bpm?.toString() ?? "",
      );
      setKey(
        loadedBeat.key ?? "C Major",
      );
      setGenre(
        loadedBeat.genre ?? "",
      );

      setIsLoading(false);
    }

    if (beatId) {
      loadBeat();
    }
  }, [beatId, router]);

  // --------------------------------------------------------
  // Save metadata
  // --------------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const parsedBpm =
      Number(bpm);

    if (!title.trim()) {
      setError(
        "عنوان الزامیه.",
      );
      return;
    }

    if (
      !Number.isInteger(parsedBpm) ||
      parsedBpm < 50 ||
      parsedBpm > 250
    ) {
      setError(
        "BPM باید بین 50 تا 250 باشه.",
      );
      return;
    }

    if (!key) {
      setError(
        "انتخاب گام الزامیه.",
      );
      return;
    }

    setIsSaving(true);

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError || !user) {
      setError(
        "باید وارد حسابت بشی.",
      );
      setIsSaving(false);
      return;
    }

    const {
      data: updatedBeat,
      error: updateError,
    } =
      await supabase
        .from("beats")
        .update({
          title:
            title.trim(),
          bpm: parsedBpm,
          key,
          genre:
            genre.trim() || null,
        })
        .eq("id", beatId)
        .eq("producer_id", user.id)
        .select(
          `
            id,
            title,
            bpm,
            key,
            genre,
            audio_key,
            cover_key,
            stems_key,
            stems_file_name,
            stems_content_type,
            stems_file_size,
            analysis_status,
            analysis_error,
            analyzed_at
          `,
        )
        .single();

    if (updateError) {
      console.error(
        "Failed to update beat:",
        updateError,
      );

      setError(
        updateError.message,
      );

      setIsSaving(false);
      return;
    }

    setBeat(
      updatedBeat as Beat,
    );

    setSuccess(
      "اطلاعات بیت با موفقیت به‌روزرسانی شد.",
    );

    setIsSaving(false);
    router.refresh();
  }

  // --------------------------------------------------------
  // Replace file
  // --------------------------------------------------------

  async function replaceFile(
    fileType: FileType,
    file: File,
  ) {
    setFileError(null);
    setFileSuccess(null);

    // ------------------------------------------------------
    // Client validation
    // ------------------------------------------------------

    if (fileType === "audio") {
      const extension =
        file.name
          .slice(
            file.name.lastIndexOf("."),
          )
          .toLowerCase();

      const allowed = [
        ".mp3",
        ".wav",
        ".flac",
      ];

      if (!allowed.includes(extension)) {
        setFileError(
          "فقط فایل‌های MP3، WAV و FLAC پشتیبانی می‌شن.",
        );
        return;
      }

      if (
        file.size <= 0 ||
        file.size > 100 * 1024 * 1024
      ) {
        setFileError(
          "حجم فایل صوتی باید بین 1 بایت تا 100 MB باشه.",
        );
        return;
      }
    }

    if (fileType === "cover") {
      const extension =
        file.name
          .slice(
            file.name.lastIndexOf("."),
          )
          .toLowerCase();

      const allowed = [
        ".jpg",
        ".jpeg",
        ".png",
      ];

      if (!allowed.includes(extension)) {
        setFileError(
          "فقط کاورهای JPG، JPEG و PNG پشتیبانی می‌شن.",
        );
        return;
      }

      if (
        file.size <= 0 ||
        file.size > 10 * 1024 * 1024
      ) {
        setFileError(
          "حجم فایل کاور باید بین 1 بایت تا 10 MB باشه.",
        );
        return;
      }
    }

    setFileBusy(fileType);

    try {
      // ----------------------------------------------------
      // Presign
      // ----------------------------------------------------

      const presignResponse =
        await fetch(
          "/api/r2/edit/presign",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              beatId,
              fileType,
              fileName:
                file.name,
              contentType:
                file.type,
              fileSize:
                file.size,
            }),
          },
        );

      const presignData =
        await presignResponse.json();

      if (
        !presignResponse.ok ||
        !presignData.success
      ) {
        throw new Error(
          presignData.error ||
            "آماده‌سازی آپلود فایل ممکن نشد.",
        );
      }

      // ----------------------------------------------------
      // Upload directly to R2
      // ----------------------------------------------------

      const uploadResponse =
        await fetch(
          presignData.uploadUrl,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                presignData.contentType,
            },
            body: file,
          },
        );

      if (!uploadResponse.ok) {
        throw new Error(
          "آپلود فایل در R2 ممکن نشد.",
        );
      }

      // ----------------------------------------------------
      // Finalize
      // ----------------------------------------------------

      const finalizeResponse =
        await fetch(
          "/api/r2/edit/finalize",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              beatId,
              uploadId:
                presignData.uploadId,
              fileType,
              key:
                presignData.key,
            }),
          },
        );

      const finalizeData =
        await finalizeResponse.json();

      if (
        !finalizeResponse.ok ||
        !finalizeData.success
      ) {
        throw new Error(
          finalizeData.error ||
            "نهایی کردن جایگزینی فایل ممکن نشد.",
        );
      }

      setBeat(
        finalizeData.beat as Beat,
      );

      setFileSuccess(
        fileType === "audio"
          ? "فایل مستر با موفقیت جایگزین شد."
          : "کاور با موفقیت جایگزین شد.",
      );

      if (fileType === "audio") {
        setSuccess(
          "فایل مستر جایگزین شد. تحلیل بیت ریست شده و باید دوباره انجام بشه.",
        );

        if (audioInputRef.current) {
          audioInputRef.current.value =
            "";
        }
      } else {
        if (coverInputRef.current) {
          coverInputRef.current.value =
            "";
        }
      }
    } catch (error) {
      console.error(
        "File replacement error:",
        error,
      );

      setFileError(
        error instanceof Error
          ? error.message
          : "موقع جایگزینی فایل مشکلی پیش اومد.",
      );
    } finally {
      setFileBusy(null);
    }
  }

  // --------------------------------------------------------
  // File selected
  // --------------------------------------------------------

  async function handleFileChange(
    fileType: FileType,
    file: File | undefined,
  ) {
    if (!file) {
      return;
    }

    await replaceFile(
      fileType,
      file,
    );
  }

  // --------------------------------------------------------
  // Loading
  // --------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-0 text-white sm:p-4 md:p-8">
        <p className="text-sm text-zinc-400">
          در حال بارگذاری بیت...
        </p>
      </div>
    );
  }

  // --------------------------------------------------------
  // Not found
  // --------------------------------------------------------

  if (!beat) {
    return (
      <div className="min-h-screen bg-black p-0 text-white sm:p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/producer/beats"
            className="mb-6 inline-block text-sm text-zinc-400 transition hover:text-white"
          >
            → بازگشت به بیت‌های من
          </Link>

          <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error ??
              "بیت پیدا نشد."}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------

  return (
    <div className="min-h-screen bg-black p-0 text-white sm:p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/producer/beats"
          className="mb-6 inline-block text-sm text-zinc-400 transition hover:text-white"
        >
          → بازگشت به بیت‌های من
        </Link>

        <div className="mb-8">
          <p className="text-sm text-zinc-500">
            پنل آهنگساز
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            ویرایش بیت
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            اطلاعات بیتت رو ویرایش کن و فایل‌هاش رو مدیریت کن.
          </p>
        </div>

        {/* ------------------------------------------------ */}
        {/* Beat information */}
        {/* ------------------------------------------------ */}

        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6"
        >
          <div>
            <h2 className="text-lg font-semibold">
              اطلاعات بیت
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              اطلاعات پایه‌ی بیتت رو ویرایش کن.
            </p>
          </div>

          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              عنوان
            </label>

            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              placeholder="عنوان بیت"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
            />
          </div>

          <div>
            <label
              htmlFor="bpm"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              BPM
            </label>

            <input
              id="bpm"
              type="number"
              min={50}
              max={250}
              step={1}
              value={bpm}
              onChange={(event) =>
                setBpm(
                  event.target.value,
                )
              }
              dir="ltr"
              placeholder="140"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
            />
          </div>

          <div>
            <label
              htmlFor="key"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              گام
            </label>

            <Select
              id="key"
              value={key}
              onChange={setKey}
              options={musicalKey.map((item) => ({ value: item, label: item }))}
              buttonClassName="rounded-lg border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 hover:border-zinc-600"
            />
              {/*{musicalKey.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}*/}
           
          </div>

          <div>
            <label
              htmlFor="genre"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              ژانر
            </label>

            <input
              id="genre"
              type="text"
              value={genre}
              onChange={(event) =>
                setGenre(
                  event.target.value,
                )
              }
              placeholder="تراپ"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/producer/beats"
              className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              انصراف
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "در حال ذخیره..."
                : "ذخیره تغییرات"}
            </button>
          </div>
        </form>

        {/* ------------------------------------------------ */}
        {/* Master */}
        {/* ------------------------------------------------ */}

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              فایل مستر
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              فایل مستر رو جایگزین کن. با جایگزینی مستر،
              تحلیل هوش مصنوعی و پیش‌نمایش ریست می‌شن.
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              فایل فعلی
            </p>

            <p className="mt-1 break-all text-sm text-zinc-300">
              {beat.audio_key
                ? beat.audio_key
                    .split("/")
                    .pop()
                : "فایل مستری در R2 پیدا نشد"}
            </p>
          </div>

          <input
            ref={audioInputRef}
            type="file"
            accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/x-wav,audio/flac"
            onChange={(event) =>
              handleFileChange(
                "audio",
                event.target
                  .files?.[0],
              )
            }
            disabled={
              fileBusy !== null
            }
            className="block w-full text-sm text-zinc-400 file:me-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-zinc-200"
          />

          {fileBusy ===
            "audio" && (
            <p className="mt-3 text-sm text-zinc-500">
              در حال آپلود مستر...
            </p>
          )}
        </section>

        {/* ------------------------------------------------ */}
        {/* Cover */}
        {/* ------------------------------------------------ */}

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              کاور
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              تصویر کاور این بیت رو جایگزین کن.
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              فایل فعلی
            </p>

            <p className="mt-1 break-all text-sm text-zinc-300">
              {beat.cover_key
                ? beat.cover_key
                    .split("/")
                    .pop()
                : "فایل کاوری در R2 پیدا نشد"}
            </p>
          </div>

          <input
            ref={coverInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(event) =>
              handleFileChange(
                "cover",
                event.target
                  .files?.[0],
              )
            }
            disabled={
              fileBusy !== null
            }
            className="block w-full text-sm text-zinc-400 file:me-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-zinc-200"
          />

          {fileBusy ===
            "cover" && (
            <p className="mt-3 text-sm text-zinc-500">
              در حال آپلود کاور...
            </p>
          )}
        </section>

        {/* ------------------------------------------------ */}
        {/* Stem / Licenses */}
        {/* ------------------------------------------------ */}

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Stem Pack و لایسنس‌ها
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Stem Pack و تنظیمات لایسنس‌هات رو از بخش
              مدیریت لایسنس‌ها مدیریت کن.
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              Stem Pack
            </p>

            {beat.stems_key ? (
              <>
                <p className="mt-1 break-all text-sm text-zinc-300">
                  {beat.stems_file_name ??
                    beat.stems_key
                      .split("/")
                      .pop()}
                </p>

                {beat.stems_file_size && (
                  <p className="mt-1 text-xs text-zinc-600">
                    {(
                      Number(
                        beat.stems_file_size,
                      ) /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">
                هنوز Stem Pack آپلود نشده.
              </p>
            )}
          </div>

          <Link
            href={`/producer/beats/${beat.id}/licenses`}
            className="inline-flex rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-900"
          >
            مدیریت Stem Pack و لایسنس‌ها ←
          </Link>
        </section>

        {/* ------------------------------------------------ */}
        {/* Analysis */}
        {/* ------------------------------------------------ */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              وضعیت تحلیل
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              وضعیت فعلی تحلیل هوش مصنوعی برای این بیت.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300">
              {beat.analysis_status ??
                "نامشخص"}
            </span>

            {beat.analysis_status ===
              "failed" &&
              beat.analysis_error && (
                <p className="text-sm text-red-400">
                  {beat.analysis_error}
                </p>
              )}
          </div>

          {beat.analysis_status ===
            "pending" && (
            <p className="mt-3 text-xs text-zinc-600">
              ورکر فایل مستر رو دوباره تحلیل می‌کنه.
            </p>
          )}
        </section>

        {fileError && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {fileError}
          </div>
        )}

        {fileSuccess && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {fileSuccess}
          </div>
        )}
      </div>
    </div>
  );
}