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
      <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
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

      reject(new Error(`Upload failed with status ${xhr.status}.`));
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload."));
    };

    xhr.onabort = () => {
      reject(new Error("Upload was cancelled."));
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
      setError("Stem Pack must be a ZIP or RAR file.");

      event.target.value = "";

      return;
    }

    const maxStemSize = 1024 * 1024 * 1024;

    if (file.size > maxStemSize) {
      setError("Stem Pack must be 1GB or smaller.");

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

      setError("Failed to process the cover image. Please try another image.");
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

  function toggleTaxonomyValue(field: TaxonomyField, value: string, max: number) {
    setForm((previous) => {
      const current = previous[field] as string[];
      if (current.includes(value)) {
        return { ...previous, [field]: current.filter((item) => item !== value) } as UploadFormState;
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
      setError("Each tag must be between 2 and 40 characters.");
      return;
    }
    if (form.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      setError("That tag has already been added.");
      return;
    }
    if (form.tags.length >= 3) {
      setError("Choose no more than 3 tags.");
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
      setError("Audio and cover are required.");
      return;
    }

    setError(null);
    setSuccess(false);
    setIsLoading(true);
    setUploadProgress(0);
    setStatusMessage("Preparing upload...");

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
        throw new Error("User not authenticated.");
      }

      // --------------------------------------------------
      // 2. Get presigned URLs
      // --------------------------------------------------

      setStatusMessage("Preparing secure upload...");

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
        throw new Error(presignData?.error || "Failed to prepare R2 upload.");
      }

      currentUploadId = presignData.uploadId;

      setUploadId(currentUploadId);

      // --------------------------------------------------
      // 3. Upload audio
      // --------------------------------------------------

      setStatusMessage("Uploading audio...");

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
        setStatusMessage("Uploading Stem Pack...");

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

      setStatusMessage("Creating beat...");

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
        throw new Error(finalizeData?.error || "Failed to finalize beat.");
      }

      // --------------------------------------------------
      // 6. Success
      // --------------------------------------------------

      setSuccess(true);

      setStatusMessage("Beat uploaded successfully.");

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
          : "Something went wrong during upload.",
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
          Beat uploaded successfully.
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
                className="h-full rounded-full bg-violet-600 transition-all"
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
        className="mx-auto flex max-w-2xl flex-col gap-4 p-6"
      >
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Beat metadata</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Classify your beat</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Use consistent labels so artists can discover your beat through genre, mood, sound, and tags.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-zinc-200 sm:col-span-2">
            Title <span className="text-xs font-normal text-zinc-500">Required · max 150 characters</span>
            <input
              required
              disabled={isLoading}
              maxLength={150}
              value={form.title}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              placeholder="e.g. Coffe Player"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-600"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            BPM <span className="text-xs font-normal text-zinc-500">50–250 · whole number</span>
            <input
              required
              disabled={isLoading}
              type="number"
              min={50}
              max={250}
              step={1}
              value={form.bpm}
              onChange={(event) => setForm((previous) => ({ ...previous, bpm: event.target.value }))}
              placeholder="140"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-600"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            Key <span className="text-xs font-normal text-zinc-500">Required</span>
            <Select
              ariaLabel="Key"
              disabled={isLoading}
              value={form.key}
              onChange={(value) => setForm((previous) => ({ ...previous, key: value }))}
              options={musicalKey.map((item) => ({ value: item, label: item }))}
              buttonClassName="rounded-lg border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 hover:border-zinc-600"
            />
              {/*{musicalKey.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>*/}
          </label>

          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            Genre <span className="text-xs font-normal text-zinc-500">Required · choose one</span>
            <Select
              ariaLabel="Genre"
              disabled={isLoading}
              value={form.genre}
              placeholder="Select a genre"
              onChange={(value) => setForm((previous) => ({ ...previous, genre: value, subgenre: "" }))}
              options={GENRES.map((item) => ({ value: item, label: item }))}
              buttonClassName="rounded-lg border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 hover:border-zinc-600"
            />
              {/*<option value="">Select a genre</option>
              {GENRES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>*/}
          </label>

          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            Subgenre <span className="text-xs font-normal text-zinc-500">Optional · depends on genre</span>
            <Select
              ariaLabel="Subgenre"
              disabled={!form.genre || isLoading}
              value={form.subgenre}
              onChange={(value) => setForm((previous) => ({ ...previous, subgenre: value }))}
              options={[
                { value: "", label: "No subgenre selected" },
                ...(form.genre ? GENRE_TAXONOMY[form.genre as keyof typeof GENRE_TAXONOMY] : []).map((item) => ({
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
          <h2 className="text-base font-semibold text-zinc-100">Sound & context</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">These are optional. Pick only values that genuinely describe the beat.</p>
        </div>

        <TaxonomyPicker
          label="Mood"
          description="Emotion or feeling · choose up to 5"
          options={MOODS}
          selected={form.moods}
          max={5}
          disabled={isLoading}
          onToggle={(value) => toggleTaxonomyValue("moods", value, 5)}
        />
        <TaxonomyPicker
          label="Atmosphere"
          description="The texture or space of the production · choose up to 4"
          options={ATMOSPHERES}
          selected={form.atmosphere}
          max={4}
          disabled={isLoading}
          onToggle={(value) => toggleTaxonomyValue("atmosphere", value, 4)}
        />
        <TaxonomyPicker
          label="Instruments & sounds"
          description="Select sounds that are clearly present · choose up to 8"
          options={INSTRUMENTS}
          selected={form.instruments}
          max={8}
          disabled={isLoading}
          onToggle={(value) => toggleTaxonomyValue("instruments", value, 8)}
        />
        <TaxonomyPicker
          label="Scenes / use cases"
          description="When or where the beat fits · choose up to 3"
          options={SCENES}
          selected={form.scenes}
          max={3}
          disabled={isLoading}
          onToggle={(value) => toggleTaxonomyValue("scenes", value, 3)}
        />

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-zinc-100">Tags</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Up to 3 search phrases, such as an artist influence, production style, or intended use.</p>
            </div>
            <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-1 text-xs tabular-nums text-zinc-400">{form.tags.length}/3</span>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={tagDraft}
              maxLength={40}
              disabled={isLoading || form.tags.length >= 3}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="e.g. underground, dark synths"
              aria-label="Add a search tag"
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-600 disabled:opacity-40"
            />
            <button
              type="button"
              onClick={addTag}
              disabled={isLoading || form.tags.length >= 3 || !tagDraft.trim()}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add tag
            </button>
          </div>
          {form.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setForm((previous) => ({ ...previous, tags: previous.tags.filter((item) => item !== tag) }))}
                  aria-label={`Remove tag ${tag}`}
                  className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-40"
                >
                  {tag} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-zinc-600">Press Enter or comma to add a tag. Duplicate tags are not allowed.</p>
        </section>

        <div className="my-1 border-t border-zinc-800" />
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Files</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">Upload the master audio and square cover. A Stem Pack is optional.</p>
        </div>

        <label className="text-zinc-100">Audio File</label>

        <input
          ref={audioInputRef}
          type="file"
          disabled={isLoading}
          accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac"
          onChange={handleAudioFileSelect}
          className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400"
        />

        <label className="text-zinc-100">Cover File</label>

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
          Stem Pack
          <span className="ml-2 text-xs text-zinc-500">
            Optional — ZIP / RAR
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
            <p className="text-sm text-zinc-200">{form.stemFile.name}</p>

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
              Remove Stem Pack
            </button>
          </div>
        )}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-zinc-100">
                AI Beat Analysis
              </p>
        
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Let Epsilone analyze the audio. Your manual selections will be kept and combined with AI findings.
              </p>
            </div>
        
            <button
              type="button"
              role="switch"
              aria-checked={aiAnalysisEnabled}
              onClick={() =>
                setAiAnalysisEnabled((previous) => !previous)
              }
              disabled={isLoading}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                aiAnalysisEnabled
                  ? "bg-violet-600"
                  : "bg-zinc-700"
              } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  aiAnalysisEnabled
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        
          <p className="mt-3 text-xs text-zinc-600">
            {aiAnalysisEnabled
              ? "AI analysis is enabled. Epsilone adds audio-based findings without discarding your selected taxonomy."
              : "AI analysis is disabled. Your selected genre, mood, sound, scene, and tag metadata will still be saved."}
          </p>
        </div>
        {coverPreviewUrl && (
          <img
            src={coverPreviewUrl}
            alt="Cover preview"
            className="h-32 w-32 rounded-lg object-cover"
          />
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Uploading..." : "Upload"}
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
            onChange={(event) => setZoom(Number(event.target.value))}
            className="mt-4 w-64"
          />

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleCancelCrop}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-zinc-300"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmCrop}
              className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
            >
              Confirm Crop
            </button>
          </div>
        </div>
      )}
    </>
  );
}
