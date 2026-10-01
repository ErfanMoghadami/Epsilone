"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_SIZE = 10 * 1024 * 1024; // 10 MB before cropping
const AVATAR_SIZE = 512;

export default function AvatarUploader({
  initialAvatarUrl,
}: {
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);

  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function closeCropper() {
    if (rawSrc) URL.revokeObjectURL(rawSrc);
    setRawSrc(null);
    setCroppedArea(null);
  }

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // reset so selecting the same file again still triggers onChange
    event.target.value = "";

    if (!file) return;

    setError("");
    setMessage("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are supported.");
      return;
    }

    if (file.size > MAX_RAW_SIZE) {
      setError("Image must be 10MB or smaller.");
      return;
    }

    if (rawSrc) URL.revokeObjectURL(rawSrc);

    setRawSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
  }

  async function handleConfirm() {
    if (!rawSrc || !croppedArea) return;

    setUploading(true);
    setError("");
    setMessage("");

    try {
      // 1. Crop + downscale to 512x512 JPEG
      const file = await getCroppedImg(
        rawSrc,
        croppedArea,
        "avatar.jpg",
        AVATAR_SIZE,
      );

      // 2. Get presigned URL
      const presignRes = await fetch("/api/r2/avatar/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });

      const presign = await presignRes.json();

      if (!presignRes.ok || !presign.success) {
        throw new Error(presign?.error || "Failed to prepare upload.");
      }

      // 3. Upload directly to R2
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": presign.contentType },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status}).`);
      }

      // 4. Save in DB
      const finalizeRes = await fetch("/api/r2/avatar/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: presign.key }),
      });

      const finalize = await finalizeRes.json();

      if (!finalizeRes.ok || !finalize.success) {
        throw new Error(finalize?.error || "Failed to save profile photo.");
      }

      setAvatarUrl(finalize.avatarUrl);
      setMessage("Profile photo updated.");
      closeCropper();
      router.refresh();
    } catch (err) {
      console.error("Avatar upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-medium">Profile photo</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Shown on your public producer page and next to your beats.
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Profile photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
              No photo
            </div>
          )}
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {avatarUrl ? "Change photo" : "Upload photo"}
          </button>

          <p className="mt-2 text-xs text-zinc-500">
            JPEG, PNG or WebP · up to 10MB
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {rawSrc && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
          <div className="relative h-80 w-80 max-w-full">
            <Cropper
              image={rawSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setCroppedArea(areaPixels)}
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
              onClick={closeCropper}
              disabled={uploading}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-zinc-300 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={uploading || !croppedArea}
              className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
