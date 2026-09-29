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
import { getCroppedImg } from "@/lib/cropImage";

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

          audioKey: presignData.audio.key,

          coverKey: presignData.cover.key,

          stemsKey: presignData.stem?.key ?? null,
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
        className="mx-auto flex max-w-md flex-col gap-4 p-6"
      >
        <label className="text-zinc-100">Title</label>

        <input
          value={form.title}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              title: event.target.value,
            }))
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
        />

        <label className="text-zinc-100">BPM</label>

        <input
          type="number"
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
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
        />

        <label className="text-zinc-100">Key</label>

        <select
          value={form.key}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              key: event.target.value,
            }))
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
        >
          {musicalKey.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className="text-zinc-100">Genre</label>

        <input
          value={form.genre}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              genre: event.target.value,
            }))
          }
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
        />

        <label className="text-zinc-100">Audio File</label>

        <input
          ref={audioInputRef}
          type="file"
          accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac"
          onChange={handleAudioFileSelect}
          className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400"
        />

        <label className="text-zinc-100">Cover File</label>

        <input
          ref={coverInputRef}
          type="file"
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
