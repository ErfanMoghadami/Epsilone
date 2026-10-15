"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { createClient } from "@/lib/supabase/client";
import {
  initialState,
  validate,
  type UploadFormState,
  musicalKey,
} from "@/lib/uploadConfig";
import {
  ATMOSPHERES,
  GENRE_TAXONOMY,
  GENRES,
  INSTRUMENTS,
  MOODS,
  SCENES,
} from "@/lib/taxonomy";
import { getCroppedImg } from "@/lib/cropImage";
import Select from "@/components/ui/Select";
type TaxonomyField = "moods" | "atmosphere" | "instruments" | "scenes";

type TaxonomyPickerProps = {
  label: string;
  description: string;
  options: readonly string[];
  selected: readonly string[];
  max: number;
  disabled?: boolean;
  onToggle: (value: string) => void;
};

function TaxonomyPicker({
  label,
  description,
  options,
  selected,
  max,
  disabled = false,
  onToggle,
}: TaxonomyPickerProps) {
  const full = selected.length >= max;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-1 text-xs tabular-nums text-zinc-400">
          {selected.length}/{max}
        </span>
      </div>
      <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pe-1">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              disabled={disabled || (!active && full)}
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={`rounded-full border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-35 ${
                active
                  ? "border-violet-500/70 bg-violet-500/15 text-violet-200"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function getAudioContentType(file: File): string {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  switch (extension) {
    case ".mp3":
      return "audio/mpeg";

    case ".wav":
      return file.type || "audio/wav";

    case ".flac":
      return file.type || "audio/flac";

    default:
      return file.type;
  }
}

function getStemContentType(file: File): string {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  switch (extension) {
    case ".zip":
      return "application/zip";

    case ".rar":
      return "application/vnd.rar";

    default:
      return file.type;
  }
}

function uploadWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (value: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", url);

    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const progress = Math.round((event.loaded / event.total) * 100);

      onProgress(progress);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      reject(new Error(`آپلود با خطا مواجه شد (کد ${xhr.status}).`));
    };

    xhr.onerror = () => {
      reject(new Error("خطای شبکه در حین آپلود."));
    };

    xhr.onabort = () => {
      reject(new Error("آپلود لغو شد."));
    };

    xhr.send(file);
  });
}

export default function Page() {
  const [form, setForm] = useState<UploadFormState>({
    ...initialState,
  });

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);

  const [statusMessage, setStatusMessage] = useState("");

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const [showCropModal, setShowCropModal] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });

  const [zoom, setZoom] = useState(1);

  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [uploadId, setUploadId] = useState<string | null>(null);

  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true);
  const [tagDraft, setTagDraft] = useState("");
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const stemInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (rawImageSrc) {
        URL.revokeObjectURL(rawImageSrc);
      }

      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [rawImageSrc, coverPreviewUrl]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function handleAudioFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setForm((previous) => ({
      ...previous,
      audioFile: file,
    }));

    setError(null);
    setSuccess(false);
  }

  function handleStemFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setForm((previous) => ({
        ...previous,
        stemFile: null,
      }));

      return;
    }

    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (extension !== ".zip" && extension !== ".rar") {
      setError("پک استمز باید فایل ZIP یا RAR باشه.");

      event.target.value = "";

      return;
    }

    const maxStemSize = 1024 * 1024 * 1024;

    if (file.size > maxStemSize) {
      setError("حجم پک استمز نباید بیشتر از 1GB باشه.");

      event.target.value = "";

      return;
    }

    setForm((previous) => ({
      ...previous,
      stemFile: file,
    }));

    setError(null);
    setSuccess(false);
  }

  function handleCoverFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (rawImageSrc) {
      URL.revokeObjectURL(rawImageSrc);
    }

    setRawImageSrc(URL.createObjectURL(file));

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setShowCropModal(true);
    setError(null);
  }

  async function handleConfirmCrop() {
    if (!rawImageSrc || !croppedAreaPixels) {
      return;
    }

    try {
      setError(null);

      const croppedFile = await getCroppedImg(
        rawImageSrc,
        croppedAreaPixels,
        "cover.jpg",
      );

      const previewUrl = URL.createObjectURL(croppedFile);

      setCoverPreviewUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }

        return previewUrl;
      });

      setForm((previous) => ({
        ...previous,
        coverFile: croppedFile,
      }));

      URL.revokeObjectURL(rawImageSrc);

      setRawImageSrc(null);
      setShowCropModal(false);
    } catch (cropError) {
      console.error("Cover crop error:", cropError);

      setError("پردازش کاور ممکن نشد. لطفاً یک تصویر دیگه امتحان کن.");
    }
  }

  function handleCancelCrop() {
    if (rawImageSrc) {
      URL.revokeObjectURL(rawImageSrc);
    }

    setRawImageSrc(null);
    setCroppedAreaPixels(null);
    setShowCropModal(false);
  }

  async function cleanupUpload(currentUploadId: string) {
    try {
      await fetch("/api/r2/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadId: currentUploadId,
        }),
        keepalive: true,
      });
    } catch (cleanupError) {
      console.error("R2 cleanup request failed:", cleanupError);
    }
  }

  function toggleTaxonomyValue(
    field: TaxonomyField,
    value: string,
    max: number,
  ) {
    setForm((previous) => {
      const current = previous[field] as string[];
      if (current.includes(value)) {
        return {
          ...previous,
          [field]: current.filter((item) => item !== value),
        } as UploadFormState;
      }
      if (current.length >= max) return previous;
      return { ...previous, [field]: [...current, value] } as UploadFormState;
    });
    setError(null);
  }

  function addTag() {
    const tag = tagDraft.trim().replace(/^#/, "").replace(/\s+/g, " ");
    if (!tag) return;
    if (tag.length < 2 || tag.length > 40) {
      setError("هر تگ باید بین 2 تا 40 کاراکتر باشه.");
      return;
    }
    if (form.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      setError("این تگ قبلاً اضافه شده.");
      return;
    }
    if (form.tags.length >= 3) {
      setError("حداکثر 3 تگ می‌تونی انتخاب کنی.");
      return;
    }
    setForm((previous) => ({ ...previous, tags: [...previous.tags, tag] }));
    setTagDraft("");
    setError(null);
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const validationError = validate(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    const audioFile = form.audioFile;
    const coverFile = form.coverFile;
    const stemFile = form.stemFile;

    if (!audioFile || !coverFile) {
      setError("فایل مستر و کاور الزامی هستن.");
      return;
    }

    setError(null);
    setSuccess(false);
    setIsLoading(true);
    setUploadProgress(0);
    setStatusMessage("در حال آماده‌سازی آپلود...");

    let currentUploadId: string | null = null;

    try {
      const supabase = createClient();

      // --------------------------------------------------
      // 1. Authenticate
      // --------------------------------------------------

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("وارد حساب کاربری نشدی.");
      }

      // --------------------------------------------------
      // 2. Get presigned URLs
      // --------------------------------------------------

      setStatusMessage("در حال آماده‌سازی آپلود امن...");

      const audioContentType = getAudioContentType(audioFile);

      const presignResponse = await fetch("/api/r2/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioFileName: audioFile.name,
          audioContentType,
          audioSize: audioFile.size,

          coverContentType: "image/jpeg",
          coverSize: coverFile.size,

          stemFileName: stemFile?.name ?? null,
          stemContentType: stemFile ? getStemContentType(stemFile) : null,
          stemSize: stemFile?.size ?? null,
        }),
      });

      const presignData = await presignResponse.json();

      if (!presignResponse.ok || !presignData.success) {
        throw new Error(presignData?.error || "آماده‌سازی آپلود ممکن نشد.");
      }

      currentUploadId = presignData.uploadId;

      setUploadId(currentUploadId);

      // --------------------------------------------------
      // 3. Upload audio
      // --------------------------------------------------

      setStatusMessage("در حال آپلود فایل مستر...");

      await uploadWithProgress(
        presignData.audio.uploadUrl,
        audioFile,
        presignData.audio.contentType,
        setUploadProgress,
      );

      // --------------------------------------------------
      // 4. Upload cover
      // --------------------------------------------------

      await uploadWithProgress(
        presignData.cover.uploadUrl,
        coverFile,
        "image/jpeg",
        () => {},
      );

      // --------------------------------------------------
      // Upload Stem Pack (optional)
      // --------------------------------------------------

      if (stemFile && presignData.stem) {
        setStatusMessage("در حال آپلود پک استمز...");

        await uploadWithProgress(
          presignData.stem.uploadUrl,
          stemFile,
          presignData.stem.contentType,
          setUploadProgress,
        );
      }

      setUploadProgress(100);

      // --------------------------------------------------
      // 5. Finalize server-side
      // --------------------------------------------------

      setStatusMessage("در حال ساخت بیت...");

      const finalizeResponse = await fetch("/api/r2/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadId: currentUploadId,

          title: form.title.trim(),

          bpm: Number(form.bpm),

          key: form.key,

          genre: form.genre,
          subgenre: form.subgenre,
          moods: form.moods,
          atmosphere: form.atmosphere,
          instruments: form.instruments,
          scenes: form.scenes,
          tags: form.tags,

          audioKey: presignData.audio.key,

          coverKey: presignData.cover.key,

          stemsKey: presignData.stem?.key ?? null,

          aiAnalysisEnabled,
        }),
      });

      const finalizeData = await finalizeResponse.json();

      if (!finalizeResponse.ok || !finalizeData.success) {
        throw new Error(finalizeData?.error || "نهایی‌کردن بیت ممکن نشد.");
      }

      // --------------------------------------------------
      // 6. Success
      // --------------------------------------------------

      setSuccess(true);

      setStatusMessage("بیت با موفقیت آپلود شد.");

      setForm({
        ...initialState,
      });
      setAiAnalysisEnabled(true);
      setTagDraft("");
      setUploadId(null);

      setUploadProgress(100);

      if (audioInputRef.current) {
        audioInputRef.current.value = "";
      }

      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }

      if (stemInputRef.current) {
        stemInputRef.current.value = "";
      }
      setCoverPreviewUrl((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }

        return null;
      });
    } catch (uploadError) {
      console.error("Beat upload error:", uploadError);

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "در حین آپلود مشکلی پیش اومد.",
      );

      setStatusMessage("");

      if (currentUploadId) {
        await cleanupUpload(currentUploadId);
      }

      setUploadId(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {success && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          بیت با موفقیت آپلود شد.
        </p>
      )}

      {statusMessage && (
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-zinc-300">{statusMessage}</span>

            {isLoading && (
              <span className="text-xs text-zinc-500">{uploadProgress}%</span>
            )}
          </div>

          {isLoading && (
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-2xl flex-col gap-4 p-0 sm:p-6"
      >
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            اطلاعات بیت
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            بیتت رو دسته‌بندی کن
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            از برچسب‌های یکدست استفاده کن تا هنرمندها بتونن بیتت رو از طریق
            ژانر، حال‌وهوا، صدا و تگ‌ها پیدا کنن.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-zinc-200 sm:col-span-2">
            عنوان{" "}
            <span className="text-xs font-normal text-zinc-500">
              الزامی · حداکثر 150 کاراکتر
            </span>
            <input
              required
              disabled={isLoading}
              maxLength={150}
              dir="auto"
              value={form.title}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              placeholder="مثلاً Coffe Player"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-600"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            BPM{" "}
            <span className="text-xs font-normal text-zinc-500">
              50 تا 250 · عدد صحیح
            </span>
            <input
              required
              disabled={isLoading}
              type="number"
              dir="ltr"
              min={50}
              max={250}
              step={1}
              value={form.bpm}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  bpm: event.target.value,
                }))
              }
              placeholder="140"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-600"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            گام{" "}
            <span className="text-xs font-normal text-zinc-500">الزامی</span>
            <Select
              ariaLabel="گام"
              disabled={isLoading}
              value={form.key}
              onChange={(value) =>
                setForm((previous) => ({ ...previous, key: value }))
              }
              options={musicalKey.map((item) => ({ value: item, label: item }))}
              buttonClassName="rounded-lg border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 hover:border-zinc-600"
            />
            {/*{musicalKey.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>*/}
          </label>

          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            ژانر{" "}
            <span className="text-xs font-normal text-zinc-500">
              الزامی · یکی رو انتخاب کن
            </span>
            <Select
              ariaLabel="ژانر"
              disabled={isLoading}
              value={form.genre}
              placeholder="یک ژانر انتخاب کن"
              onChange={(value) =>
                setForm((previous) => ({
                  ...previous,
                  genre: value,
                  subgenre: "",
                }))
              }
              options={GENRES.map((item) => ({ value: item, label: item }))}
              buttonClassName="rounded-lg border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 hover:border-zinc-600"
            />
            {/*<option value="">Select a genre</option>
              {GENRES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>*/}
          </label>

          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            زیرژانر{" "}
            <span className="text-xs font-normal text-zinc-500">
              اختیاری · بسته به ژانر
            </span>
            <Select
              ariaLabel="زیرژانر"
              disabled={!form.genre || isLoading}
              value={form.subgenre}
              onChange={(value) =>
                setForm((previous) => ({ ...previous, subgenre: value }))
              }
              options={[
                { value: "", label: "بدون زیرژانر" },
                ...(form.genre
                  ? GENRE_TAXONOMY[form.genre as keyof typeof GENRE_TAXONOMY]
                  : []
                ).map((item) => ({
                  value: item,
                  label: item,
                })),
              ]}
              buttonClassName="rounded-lg border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 hover:border-zinc-600"
            />
            {/*<option value="">No subgenre selected</option>
              {(form.genre ? GENRE_TAXONOMY[form.genre as keyof typeof GENRE_TAXONOMY] : []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>*/}
          </label>
        </div>

        <div className="my-1 border-t border-zinc-800" />
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            صدا و فضا
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            این بخش اختیاریه. فقط مواردی رو انتخاب کن که واقعاً به بیتت
            می‌خوره.
          </p>
        </div>

        <TaxonomyPicker
          label="حال‌وهوا"
          description="احساس یا حس‌وحال بیت · حداکثر 5 مورد"
          options={MOODS}
          selected={form.moods}
          max={5}
          disabled={isLoading}
          onToggle={(value) => toggleTaxonomyValue("moods", value, 5)}
        />
        <TaxonomyPicker
          label="فضا"
          description="بافت یا فضای ساخت بیت · حداکثر 4 مورد"
          options={ATMOSPHERES}
          selected={form.atmosphere}
          max={4}
          disabled={isLoading}
          onToggle={(value) => toggleTaxonomyValue("atmosphere", value, 4)}
        />
        <TaxonomyPicker
          label="سازها و صداها"
          description="صداهایی که به‌وضوح تو بیت هستن · حداکثر 8 مورد"
          options={INSTRUMENTS}
          selected={form.instruments}
          max={8}
          disabled={isLoading}
          onToggle={(value) => toggleTaxonomyValue("instruments", value, 8)}
        />
        <TaxonomyPicker
          label="موقعیت‌ها / کاربردها"
          description="بیت به چه موقع یا کجا می‌خوره · حداکثر 3 مورد"
          options={SCENES}
          selected={form.scenes}
          max={3}
          disabled={isLoading}
          onToggle={(value) => toggleTaxonomyValue("scenes", value, 3)}
        />

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-zinc-100">تگ‌ها</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                حداکثر 3 عبارت جستجو، مثل هنرمند الهام‌بخش، سبک ساخت یا
                کاربرد بیت.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-1 text-xs tabular-nums text-zinc-400">
              {form.tags.length}/3
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={tagDraft}
              maxLength={40}
              disabled={isLoading || form.tags.length >= 3}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={handleTagKeyDown}
              dir="auto"
              placeholder="مثلاً underground, dark synths"
              aria-label="افزودن تگ جستجو"
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-600 disabled:opacity-40"
            />
            <button
              type="button"
              onClick={addTag}
              disabled={isLoading || form.tags.length >= 3 || !tagDraft.trim()}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              افزودن تگ
            </button>
          </div>
          {form.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      tags: previous.tags.filter((item) => item !== tag),
                    }))
                  }
                  aria-label={`حذف تگ ${tag}`}
                  className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-40"
                >
                  {tag} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-zinc-600">
            برای افزودن تگ، Enter یا کاما بزن. تگ تکراری مجاز نیست.
          </p>
        </section>

        <div className="my-1 border-t border-zinc-800" />
        <div>
          <h2 className="text-base font-semibold text-zinc-100">فایل‌ها</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            فایل مستر و کاور مربعی رو آپلود کن. پک استمز اختیاریه.
          </p>
        </div>

        <label className="text-zinc-100">فایل مستر</label>

        <input
          ref={audioInputRef}
          type="file"
          disabled={isLoading}
          accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac"
          onChange={handleAudioFileSelect}
          className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400"
        />

        <label className="text-zinc-100">فایل کاور</label>

        <input
          ref={coverInputRef}
          type="file"
          disabled={isLoading}
          id="coverFile"
          accept="image/jpeg,image/png"
          onChange={handleCoverFileSelect}
          className="mt-1 block rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400"
        />
        <label className="text-zinc-100">
          پک استمز
          <span className="ms-2 text-xs text-zinc-500">
            اختیاری — ZIP / RAR
          </span>
        </label>

        <input
          ref={stemInputRef}
          type="file"
          disabled={isLoading}
          accept=".zip,.rar,application/zip,application/vnd.rar,application/x-rar-compressed"
          onChange={handleStemFileSelect}
          className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400"
        />

        {form.stemFile && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
            <p dir="auto" className="text-sm text-zinc-200">{form.stemFile.name}</p>

            <p className="mt-1 text-xs text-zinc-500">
              {(form.stemFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setForm((previous) => ({
                  ...previous,
                  stemFile: null,
                }));

                if (stemInputRef.current) {
                  stemInputRef.current.value = "";
                }
              }}
              className="mt-2 text-xs text-zinc-600 transition hover:text-red-400"
            >
              حذف پک استمز
            </button>
          </div>
        )}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-zinc-100">تحلیل هوشمند بیت</p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                بذار Epsilone صدا رو تحلیل کنه. انتخاب‌های دستی خودت حفظ می‌شن
                و با نتایج هوش مصنوعی ترکیب می‌شن.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={aiAnalysisEnabled}
              aria-label="تحلیل هوشمند بیت"
              onClick={() => setAiAnalysisEnabled((previous) => !previous)}
              disabled={isLoading}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                aiAnalysisEnabled ? "bg-amber-500" : "bg-zinc-700"
              } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  aiAnalysisEnabled ? "start-6" : "start-1"
                }`}
              />
            </button>
          </div>

          <p className="mt-3 text-xs text-zinc-600">
            {aiAnalysisEnabled
              ? "تحلیل هوشمند فعاله. Epsilone نتایج حاصل از تحلیل صدا رو بدون حذف انتخاب‌های خودت اضافه می‌کنه."
              : "تحلیل هوشمند غیرفعاله. ژانر، حال‌وهوا، صدا، موقعیت و تگ‌هایی که انتخاب کردی همچنان ذخیره می‌شن."}
          </p>
        </div>
        {coverPreviewUrl && (
          <img
            src={coverPreviewUrl}
            alt="پیش‌نمایش کاور"
            className="h-32 w-32 rounded-lg object-cover"
          />
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 font-medium text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "در حال آپلود..." : "آپلود"}
        </button>
      </form>

      {showCropModal && rawImageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
          <div className="relative h-80 w-80 max-w-full">
            <Cropper
              image={rawImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            aria-label="بزرگ‌نمایی"
            onChange={(event) => setZoom(Number(event.target.value))}
            className="mt-4 w-full max-w-64"
          />

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleCancelCrop}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-zinc-300"
            >
              انصراف
            </button>

            <button
              type="button"
              onClick={handleConfirmCrop}
              className="rounded-lg bg-amber-400 px-4 py-2 font-medium text-white hover:bg-amber-400"
            >
              تأیید برش
            </button>
          </div>
        </div>
      )}
    </>
  );
}
