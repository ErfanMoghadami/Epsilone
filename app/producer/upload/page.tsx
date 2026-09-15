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

    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }
    if (data.user === null) {
      setError("User not authenticated");
      setIsLoading(false);
      return;
    }

    const userId = data.user.id;
    const randomId = crypto.randomUUID();
    const audioPath = `${userId}/${randomId}-${form.audioFile!.name}`;

    const { error: uploadError } = await supabase.storage
      .from("BeatAudio")
      .upload(audioPath, form.audioFile!);
    if (uploadError) {
      setError(uploadError.message);
      setIsLoading(false);
      return;
    }

    const {
      data: { publicUrl: audioPublicUrl },
    } = supabase.storage.from("BeatAudio").getPublicUrl(audioPath);

    const coverPath = `covers/${userId}/${randomId}-cover.jpg`;
    const { error: coverUploadError } = await supabase.storage
      .from("BeatAudio")
      .upload(coverPath, form.coverFile!);
    if (coverUploadError) {
      await supabase.storage.from("BeatAudio").remove([audioPath]);
      setError(coverUploadError.message);
      setIsLoading(false);
      return;
    }

    const {
      data: { publicUrl: coverPublicUrl },
    } = supabase.storage.from("BeatAudio").getPublicUrl(coverPath);

    const { data: beat, error: insertError } = await supabase
      .from("beats")
      .insert({
        title: form.title.trim(),
        bpm: Number(form.bpm),
        key: form.key,
        genre: form.genre,
        audio_url: audioPublicUrl,
        cover_url: coverPublicUrl,
        producer_id: userId,
        analysis_status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !beat) {
      await supabase.storage.from("BeatAudio").remove([audioPath, coverPath]);

      setError(insertError?.message || "Failed to create beat record");

      setIsLoading(false);
      return;
    }
    // try {
    //   const response = await fetch("/api/analyze-beat", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       beatId: beat.id,
    //     }),
    //   });

    //   const result = await response.json();

    //   if (!response.ok || !result.success) {
    //     console.error("AI analysis failed:", result);
    //   } else {
    //     console.log("AI analysis completed:", result);
    //   }
    // } catch (error) {
    //   console.error("Could not start AI analysis:", error);
    // }
    setSuccess(true);
    setIsLoading(false);
    setForm(initialState);
    setCoverPreviewUrl(null);
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
