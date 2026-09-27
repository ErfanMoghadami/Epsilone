"use client";
import { createClient } from "@/lib/supabase/client";
import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import {
  initialState,
  validate,
  UploadFormState,
  musicalKey,
} from "@/lib/uploadConfig";
import { getCroppedImg } from "@/lib/cropImage";

export default function Page() {
  const [form, setForm] = useState<UploadFormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const onCropComplete = useCallback((_: unknown, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function handleCoverFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawImageSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropModal(true);
  }

  async function handleConfirmCrop() {
    if (!rawImageSrc || !croppedAreaPixels) return;
    const croppedFile = await getCroppedImg(
      rawImageSrc,
      croppedAreaPixels,
      "cover.jpg",
    );

    setForm((prev) => ({ ...prev, coverFile: croppedFile }));
    setCoverPreviewUrl(URL.createObjectURL(croppedFile));

    URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
    setShowCropModal(false);
  }

  function handleCancelCrop() {
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
    setShowCropModal(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const errorMessage = validate(form);

    if (errorMessage !== null) {
      setError(errorMessage);
      return;
    }

    const supabase = createClient();

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // ------------------------------------------------------
      // 1. Check authentication
      // ------------------------------------------------------

      const { data, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.user) {
        throw new Error("User not authenticated");
      }

      const userId = data.user.id;

      const audioFile = form.audioFile!;

      const coverFile = form.coverFile!;

      // ------------------------------------------------------
      // 2. Ask server for R2 presigned URLs
      // ------------------------------------------------------

      const presignResponse = await fetch("/api/r2/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioFileName: audioFile.name,

          audioContentType: audioFile.type,

          coverContentType: coverFile.type || "image/jpeg",
        }),
      });

      const presignData = await presignResponse.json();

      if (!presignResponse.ok || !presignData.success) {
        throw new Error(presignData?.error || "Failed to prepare R2 upload.");
      }

      // ------------------------------------------------------
      // 3. Upload master audio directly to R2
      // ------------------------------------------------------

      const audioUploadResponse = await fetch(presignData.audio.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": audioFile.type,
        },
        body: audioFile,
      });

      if (!audioUploadResponse.ok) {
        throw new Error(`Audio upload failed: ${audioUploadResponse.status}`);
      }

      // ------------------------------------------------------
      // 4. Upload cover directly to R2
      // ------------------------------------------------------

      const coverUploadResponse = await fetch(presignData.cover.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": coverFile.type || "image/jpeg",
        },
        body: coverFile,
      });

      if (!coverUploadResponse.ok) {
        throw new Error(`Cover upload failed: ${coverUploadResponse.status}`);
      }

      // ------------------------------------------------------
      // 5. Create Beat database record
      // ------------------------------------------------------

      const { data: beat, error: insertError } = await supabase
        .from("beats")
        .insert({
          title: form.title.trim(),

          bpm: Number(form.bpm),

          key: form.key,

          genre: form.genre,

          audio_url: null,

          cover_url: null,

          audio_key: presignData.audio.key,

          cover_key: presignData.cover.key,

          producer_id: userId,

          analysis_status: "pending",
        })
        .select("id")
        .single();

      if (insertError || !beat) {
        throw new Error(
          insertError?.message || "Failed to create beat record.",
        );
      }

      // ------------------------------------------------------
      // 6. Success
      // ------------------------------------------------------

      console.log("Beat uploaded to R2:", {
        beatId: beat.id,
        audioKey: presignData.audio.key,
        coverKey: presignData.cover.key,
      });

      setSuccess(true);

      setForm(initialState);

      setCoverPreviewUrl(null);
    } catch (error) {
      console.error("Beat upload error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong during upload.",
      );
    } finally {
      setIsLoading(false);
    }
  }
  // return (
  //   <>
  //     {error && (
  //       <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
  //         {error}
  //       </p>
  //     )}
  //     {success && (
  //       <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
  //         Success!
  //       </p>
  //     )}

  //     <form
  //       onSubmit={handleSubmit}
  //       className="mx-auto flex max-w-md flex-col gap-4 p-6"
  //     >
  //       <input
  //         value={form.title}
  //         onChange={(e) => setForm({ ...form, title: e.target.value })}
  //         className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2.5 text-stone-100"
  //       />
  //       <input
  //         type="number"
  //         value={form.bpm}
  //         onChange={(e) => setForm({ ...form, bpm: e.target.value })}
  //         className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2.5 text-stone-100"
  //       />
  //       <select
  //         value={form.key}
  //         onChange={(e) => setForm({ ...form, key: e.target.value })}
  //       >
  //         {musicalKey.map((k) => (
  //           <option key={k} value={k}>
  //             {k}
  //           </option>
  //         ))}
  //       </select>
  //       <input
  //         value={form.genre}
  //         onChange={(e) => setForm({ ...form, genre: e.target.value })}
  //         className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2.5 text-stone-100"
  //       />
  //       <input
  //         type="file"
  //         accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac"
  //         onChange={(e) =>
  //           setForm({ ...form, audioFile: e.target.files?.[0] ?? null })
  //         }
  //         className="rounded-lg border border-dashed border-stone-700 bg-stone-900 px-4 py-2.5 text-sm text-stone-400"
  //       />

  //       <label htmlFor="coverFile" className="text-sm text-stone-400">
  //         Cover (crops to 1:1)
  //         <input
  //           type="file"
  //           id="coverFile"
  //           accept="image/jpeg,image/png"
  //           onChange={handleCoverFileSelect}
  //           className="mt-1 block rounded-lg border border-dashed border-stone-700 bg-stone-900 px-4 py-2.5 text-sm text-stone-400"
  //         />
  //       </label>

  //       {coverPreviewUrl && (
  //         <img
  //           src={coverPreviewUrl}
  //           alt="Cover preview"
  //           className="h-32 w-32 rounded-lg object-cover"
  //         />
  //       )}

  //       <button
  //         type="submit"
  //         disabled={isLoading}
  //         className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 font-medium text-stone-950 hover:bg-amber-400 disabled:opacity-50"
  //       >
  //         {isLoading ? "uploading..." : "Upload"}
  //       </button>
  //     </form>

  //     {showCropModal && rawImageSrc && (
  //       <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
  //         <div className="relative h-80 w-80 max-w-full">
  //           <Cropper
  //             image={rawImageSrc}
  //             crop={crop}
  //             zoom={zoom}
  //             aspect={1}
  //             onCropChange={setCrop}
  //             onZoomChange={setZoom}
  //             onCropComplete={onCropComplete}
  //           />
  //         </div>

  //         <input
  //           type="range"
  //           min={1}
  //           max={3}
  //           step={0.1}
  //           value={zoom}
  //           onChange={(e) => setZoom(Number(e.target.value))}
  //           className="mt-4 w-64"
  //         />

  //         <div className="mt-4 flex gap-3">
  //           <button
  //             type="button"
  //             onClick={handleCancelCrop}
  //             className="rounded-lg border border-stone-600 px-4 py-2 text-stone-300"
  //           >
  //             Cancel
  //           </button>
  //           <button
  //             type="button"
  //             onClick={handleConfirmCrop}
  //             className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-stone-950 hover:bg-amber-400"
  //           >
  //             Confirm Crop
  //           </button>
  //         </div>
  //       </div>
  //     )}
  //   </>
  // );
  // }//

  return (
    <>
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          Success!
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-md flex-col gap-4 p-6"
      >
        <label className="text-zinc-100">Title </label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100"
        />

        <label className="text-zinc-100">BPM</label>
        <input
          type="number"
          value={form.bpm}
          onChange={(e) => setForm({ ...form, bpm: e.target.value })}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100"
        />

        <label className="text-zinc-100">Key</label>
        <select
          value={form.key}
          onChange={(e) => setForm({ ...form, key: e.target.value })}
        >
          {musicalKey.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <label className="text-zinc-100">Genre</label>
        <input
          value={form.genre}
          onChange={(e) => setForm({ ...form, genre: e.target.value })}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100"
        />

        <label className="text-zinc-100">Audio File</label>
        <input
          type="file"
          accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac"
          onChange={(e) =>
            setForm({ ...form, audioFile: e.target.files?.[0] ?? null })
          }
          className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400"
        />

        <label className="text-zinc-100">Cover File</label>
        <input
          type="file"
          id="coverFile"
          accept="image/jpeg,image/png"
          onChange={handleCoverFileSelect}
          className="mt-1 block rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400"
        />

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
          className="mt-2 rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {isLoading ? "uploading..." : "Upload"}
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
            onChange={(e) => setZoom(Number(e.target.value))}
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
              className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white"
            >
              Confirm Crop
            </button>
          </div>
        </div>
      )}
    </>
  );
}
