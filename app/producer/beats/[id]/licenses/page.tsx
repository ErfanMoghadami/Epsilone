"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LICENSE_TERMS,
  MAX_TERMS,
  MAX_TERM_LENGTH,
  cleanTerms,
  type LicenseType,
} from "@/lib/licenses";

const supabase = createClient();

type License = {
  id?: string;
  beat_id: string;
  license_type: LicenseType;
  price: number;
  currency: string;
  is_active: boolean;
  includes_stems: boolean;
  terms: string[];
};

type StemInfo = {
  key: string | null;
  fileName: string | null;
  contentType: string | null;
  size: number | null;
};

const DEFAULT_LICENSES = [
  {
    license_type: "Basic" as const,
    price: 10,
    currency: "USD",
    is_active: true,
  },
  {
    license_type: "Premium" as const,
    price: 25,
    currency: "USD",
    is_active: true,
  },
  {
    license_type: "Exclusive" as const,
    price: 50,
    currency: "USD",
    is_active: true,
  },
];

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes <= 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function LicensesPage() {
  const params = useParams();
  const router = useRouter();

  const beatId = params.id as string;

  const stemInputRef = useRef<HTMLInputElement | null>(null);

  const [beatTitle, setBeatTitle] = useState("");

  const [stem, setStem] = useState<StemInfo>({
    key: null,
    fileName: null,
    contentType: null,
    size: null,
  });

  const [licenses, setLicenses] = useState<License[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [isStemUploading, setIsStemUploading] = useState(false);

  const [isStemRemoving, setIsStemRemoving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  // --------------------------------------------------------
  // Load
  // --------------------------------------------------------

  useEffect(() => {
    async function loadPage() {
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

      // ----------------------------------------------------
      // Beat
      // ----------------------------------------------------

      const { data: beat, error: beatError } = await supabase
        .from("beats")
        .select(
          "id, title, stems_key, stems_file_name, stems_content_type, stems_file_size",
        )
        .eq("id", beatId)
        .eq("producer_id", user.id)
        .single();

      if (beatError || !beat) {
        setError("Beat not found or you do not have access to it.");

        setIsLoading(false);
        return;
      }

      setBeatTitle(beat.title ?? "Untitled Beat");

      setStem({
        key: beat.stems_key ?? null,

        fileName: beat.stems_file_name ?? null,

        contentType: beat.stems_content_type ?? null,

        size: beat.stems_file_size ? Number(beat.stems_file_size) : null,
      });

      const hasStemPack = Boolean(
        beat.stems_key && beat.stems_key.trim() !== "",
      );

      // ----------------------------------------------------
      // Licenses
      // ----------------------------------------------------

      const { data: existingLicenses, error: licenseError } = await supabase
        .from("beat_licenses")
        .select(
          "id, beat_id, license_type, price, currency, is_active, includes_stems, terms",
        )
        .eq("beat_id", beatId)
        .order("id", {
          ascending: true,
        });

      if (licenseError) {
        console.error(licenseError);

        setError(licenseError.message);

        setIsLoading(false);
        return;
      }

      const existingByType = new Map(
        (existingLicenses ?? []).map((license) => [
          license.license_type,
          license,
        ]),
      );

      const mergedLicenses = DEFAULT_LICENSES.map((defaultLicense) => {
        const existing = existingByType.get(defaultLicense.license_type);

        if (!existing) {
          return {
            beat_id: beatId,

            license_type: defaultLicense.license_type,

            price: defaultLicense.price,

            currency: defaultLicense.currency,

            is_active: defaultLicense.is_active,

            includes_stems:
              hasStemPack && defaultLicense.license_type !== "Basic",

            terms: LICENSE_TERMS[defaultLicense.license_type].terms,
          };
        }

        return {
          id: existing.id,

          beat_id: existing.beat_id,

          license_type: existing.license_type as LicenseType,

          price: Number(existing.price),

          currency: existing.currency ?? "USD",

          is_active: Boolean(existing.is_active),

          includes_stems: hasStemPack && Boolean(existing.includes_stems),

          terms:
            existing.terms && existing.terms.length > 0
              ? (existing.terms as string[])
              : LICENSE_TERMS[defaultLicense.license_type].terms,
        };
      });

      setLicenses(mergedLicenses);

      setIsLoading(false);
    }

    if (beatId) {
      loadPage();
    }
  }, [beatId, router]);

  // --------------------------------------------------------
  // Update License
  // --------------------------------------------------------

  function updateLicense(
    licenseType: LicenseType,
    field: "price" | "is_active" | "includes_stems" | "terms",
    value: number | boolean | string[],
  ) {
    setLicenses((previous) =>
      previous.map((license) =>
        license.license_type === licenseType
          ? {
              ...license,
              [field]: value,
            }
          : license,
      ),
    );

    setSuccess(null);
    setError(null);
  }

  // --------------------------------------------------------
  // Add / Replace Stem
  // --------------------------------------------------------

  async function handleStemUpload(file: File) {
    setError(null);
    setSuccess(null);
    setIsStemUploading(true);

    try {
      const extension = file.name
        .slice(file.name.lastIndexOf("."))
        .toLowerCase();

      if (extension !== ".zip" && extension !== ".rar") {
        throw new Error("Stem Pack must be a ZIP or RAR file.");
      }

      const maxSize = 1024 * 1024 * 1024;

      if (file.size > maxSize) {
        throw new Error("Stem Pack must be 1GB or smaller.");
      }

      // ----------------------------------------------------
      // Get presigned URL
      // ----------------------------------------------------

      const presignResponse = await fetch("/api/r2/stems/presign", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          beatId,

          fileName: file.name,

          fileSize: file.size,

          contentType:
            extension === ".zip" ? "application/zip" : "application/vnd.rar",
        }),
      });

      const presignData = await presignResponse.json();

      if (!presignResponse.ok || !presignData.success) {
        throw new Error(
          presignData.error ?? "Failed to prepare Stem Pack upload.",
        );
      }

      // ----------------------------------------------------
      // Upload directly to R2
      // ----------------------------------------------------

      const uploadResponse = await fetch(presignData.stem.uploadUrl, {
        method: "PUT",

        headers: {
          "Content-Type": presignData.stem.contentType,
        },

        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Stem Pack upload failed (${uploadResponse.status}).`);
      }

      // ----------------------------------------------------
      // Finalize
      // ----------------------------------------------------

      const finalizeResponse = await fetch("/api/r2/stems/finalize", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          beatId,

          stemKey: presignData.stem.key,

          fileName: file.name,
        }),
      });

      const finalizeData = await finalizeResponse.json();

      if (!finalizeResponse.ok || !finalizeData.success) {
        throw new Error(finalizeData.error ?? "Failed to save Stem Pack.");
      }

      // ----------------------------------------------------
      // Update UI
      // ----------------------------------------------------

      setStem({
        key: finalizeData.stem.key,

        fileName: finalizeData.stem.fileName,

        contentType: finalizeData.stem.contentType,

        size: finalizeData.stem.size,
      });

      // Existing license choices stay as they are.
      // Producer decides which ones include stems.
      setSuccess(
        stem.key
          ? "Stem Pack replaced successfully."
          : "Stem Pack added successfully.",
      );
    } catch (uploadError) {
      console.error(uploadError);

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload Stem Pack.",
      );
    } finally {
      setIsStemUploading(false);

      if (stemInputRef.current) {
        stemInputRef.current.value = "";
      }
    }
  }

  function handleStemInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    void handleStemUpload(file);
  }

  // --------------------------------------------------------
  // Remove Stem
  // --------------------------------------------------------

  async function handleStemRemove() {
    setError(null);
    setSuccess(null);
    setIsStemRemoving(true);

    try {
      const response = await fetch("/api/r2/stems/remove", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          beatId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to remove Stem Pack.");
      }

      setStem({
        key: null,
        fileName: null,
        contentType: null,
        size: null,
      });

      // No Stem Pack means no license
      // can include stems.
      setLicenses((previous) =>
        previous.map((license) => ({
          ...license,
          includes_stems: false,
        })),
      );

      setSuccess("Stem Pack removed successfully.");
    } catch (removeError) {
      console.error(removeError);

      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove Stem Pack.",
      );
    } finally {
      setIsStemRemoving(false);
    }
  }

  // --------------------------------------------------------
  // Save licenses
  // --------------------------------------------------------

  async function handleSave() {
    setError(null);
    setSuccess(null);

    for (const license of licenses) {
      if (!Number.isFinite(license.price) || license.price <= 0) {
        setError(`${license.license_type} price must be greater than 0.`);

        return;
      }

      if (!stem.key && license.includes_stems) {
        setError(
          "This beat does not have a Stem Pack, so no license can include stems.",
        );

        return;
      }

      if (cleanTerms(license.terms).length === 0) {
        setError(`${license.license_type} needs at least one term.`);

        return;
      }
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in.");
      }

      const { data: beat, error: beatError } = await supabase
        .from("beats")
        .select("id, stems_key")
        .eq("id", beatId)
        .eq("producer_id", user.id)
        .single();

      if (beatError || !beat) {
        throw new Error("Beat not found or you do not have access to it.");
      }

      const hasStemPack = Boolean(
        beat.stems_key && beat.stems_key.trim() !== "",
      );

      const rows = licenses.map((license) => ({
        beat_id: beatId,

        license_type: license.license_type,

        price: Number(license.price.toFixed(2)),

        currency: "USD",

        is_active: license.is_active,

        includes_stems: hasStemPack && license.includes_stems,

        terms: cleanTerms(license.terms),
      }));

      const { error: upsertError } = await supabase
        .from("beat_licenses")
        .upsert(rows, {
          onConflict: "beat_id,license_type",
        });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      setSuccess("License settings saved successfully.");
    } catch (saveError) {
      console.error(saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save license settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // --------------------------------------------------------
  // Loading
  // --------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <p className="text-zinc-400">Loading license settings...</p>
      </div>
    );
  }

  // --------------------------------------------------------
  // Error page
  // --------------------------------------------------------

  if (error && licenses.length === 0) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 text-sm text-zinc-400 transition hover:text-white"
          >
            ← Back
          </button>

          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // Page
  // --------------------------------------------------------

  const hasStemPack = Boolean(stem.key);

  return (
    <div className="min-h-screen bg-black p-5 text-white sm:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 text-sm text-zinc-400 transition hover:text-white"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold">License & Pricing</h1>

          <p className="mt-2 text-sm text-zinc-400">{beatTitle}</p>
        </div>

        {/* Stem Pack */}
        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Stem Pack</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Upload the stems that buyers receive with licenses that include
                stems.
              </p>
            </div>

            {hasStemPack && (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
                Available
              </span>
            )}
          </div>

          {hasStemPack ? (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-200">
                    {stem.fileName ?? "Stem Pack"}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    {formatFileSize(stem.size)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    onClick={() => stemInputRef.current?.click()}
                    disabled={isStemUploading || isStemRemoving}
                    className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isStemUploading ? "Replacing..." : "Replace"}
                  </button>

                  <button
                    type="button"
                    onClick={handleStemRemove}
                    disabled={isStemUploading || isStemRemoving}
                    className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-500 transition hover:border-red-900 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isStemRemoving ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-700 bg-black p-5">
              <p className="text-sm text-zinc-400">No Stem Pack uploaded.</p>

              <p className="mt-1 text-xs text-zinc-600">
                ZIP or RAR, up to 1 GB.
              </p>

              <button
                type="button"
                onClick={() => stemInputRef.current?.click()}
                disabled={isStemUploading}
                className="mt-4 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStemUploading ? "Uploading..." : "Add Stem Pack"}
              </button>
            </div>
          )}

          <input
            ref={stemInputRef}
            type="file"
            accept=".zip,.rar,application/zip,application/vnd.rar,application/x-rar-compressed"
            onChange={handleStemInputChange}
            className="hidden"
          />

          {!hasStemPack && (
            <p className="mt-4 text-xs text-zinc-600">
              Until you upload a Stem Pack, all "Includes Stems" options remain
              disabled.
            </p>
          )}
        </section>

        {/* Licenses */}
        <div className="space-y-4">
          {licenses.map((license) => (
            <div
              key={license.license_type}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    {license.license_type}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {LICENSE_TERMS[license.license_type].tagline}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateLicense(
                      license.license_type,
                      "is_active",
                      !license.is_active,
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    license.is_active
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {license.is_active ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Price */}
              <div className="mt-6">
                <label
                  htmlFor={`price-${license.license_type}`}
                  className="mb-2 block text-sm text-zinc-400"
                >
                  Price
                </label>

                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    $
                  </span>

                  <input
                    id={`price-${license.license_type}`}
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={license.price}
                    onChange={(event) =>
                      updateLicense(
                        license.license_type,
                        "price",
                        Number(event.target.value),
                      )
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 pl-8 text-white outline-none transition focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="mt-6">
                <label
                  htmlFor={`terms-${license.license_type}`}
                  className="mb-2 block text-sm text-zinc-400"
                >
                  License terms (one per line)
                </label>

                <textarea
                  id={`terms-${license.license_type}`}
                  value={license.terms.join("\n")}
                  onChange={(event) =>
                    updateLicense(
                      license.license_type,
                      "terms",
                      event.target.value.split("\n"),
                    )
                  }
                  rows={5}
                  placeholder={"Up to 100,000 streams\n1 music video"}
                  className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-600"
                />

                <p className="mt-1 text-xs text-zinc-600">
                  Max {MAX_TERMS} lines, {MAX_TERM_LENGTH} characters each.
                </p>
              </div>

              {/* Includes Stems */}
              <div className="mt-6 border-t border-zinc-800 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Includes Stems
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Buyers with this license can download your Stem Pack.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!hasStemPack}
                    onClick={() =>
                      updateLicense(
                        license.license_type,
                        "includes_stems",
                        !license.includes_stems,
                      )
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      !hasStemPack
                        ? "cursor-not-allowed bg-zinc-800 opacity-40"
                        : license.includes_stems
                          ? "bg-white"
                          : "bg-zinc-800"
                    }`}
                    aria-label={`Toggle stems for ${license.license_type}`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full transition ${
                        license.includes_stems
                          ? "left-6 bg-black"
                          : "left-1 bg-zinc-500"
                      }`}
                    />
                  </button>
                </div>

                {!hasStemPack && (
                  <p className="mt-3 text-xs text-zinc-700">
                    Upload a Stem Pack above to enable this option.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Save */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isStemUploading || isStemRemoving}
            className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save License Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}