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
          "Beat not found or you do not have access to it.",
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
        "Title is required.",
      );
      return;
    }

    if (
      !Number.isInteger(parsedBpm) ||
      parsedBpm < 50 ||
      parsedBpm > 250
    ) {
      setError(
        "BPM must be between 50 and 250.",
      );
      return;
    }

    if (!key) {
      setError(
        "Key is required.",
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
        "You must be logged in.",
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
      "Beat information updated successfully.",
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
          "Only MP3, WAV, and FLAC files are supported.",
        );
        return;
      }

      if (
        file.size <= 0 ||
        file.size > 100 * 1024 * 1024
      ) {
        setFileError(
          "Audio file must be between 1 byte and 100 MB.",
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
          "Only JPG, JPEG, and PNG cover files are supported.",
        );
        return;
      }

      if (
        file.size <= 0 ||
        file.size > 10 * 1024 * 1024
      ) {
        setFileError(
          "Cover file must be between 1 byte and 10 MB.",
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
            "Failed to prepare file upload.",
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
          "Failed to upload file to R2.",
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
            "Failed to finalize file replacement.",
        );
      }

      setBeat(
        finalizeData.beat as Beat,
      );

      setFileSuccess(
        fileType === "audio"
          ? "Master audio replaced successfully."
          : "Cover replaced successfully.",
      );

      if (fileType === "audio") {
        setSuccess(
          "Master replaced. Beat analysis has been reset and will need to run again.",
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
          : "Something went wrong while replacing the file.",
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
      <div className="min-h-screen bg-black p-8 text-white">
        <p className="text-sm text-zinc-400">
          Loading beat...
        </p>
      </div>
    );
  }

  // --------------------------------------------------------
  // Not found
  // --------------------------------------------------------

  if (!beat) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/producer/beats"
            className="mb-6 inline-block text-sm text-zinc-400 transition hover:text-white"
          >
            ← Back to My Beats
          </Link>

          <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error ??
              "Beat not found."}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/producer/beats"
          className="mb-6 inline-block text-sm text-zinc-400 transition hover:text-white"
        >
          ← Back to My Beats
        </Link>

        <div className="mb-8">
          <p className="text-sm text-zinc-500">
            Producer Panel
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Edit Beat
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Update information and manage your beat files.
          </p>
        </div>

        {/* ------------------------------------------------ */}
        {/* Beat information */}
        {/* ------------------------------------------------ */}

        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <div>
            <h2 className="text-lg font-semibold">
              Beat Information
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Update the basic information of your beat.
            </p>
          </div>

          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Title
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
              placeholder="Beat title"
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
              placeholder="140"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
            />
          </div>

          <div>
            <label
              htmlFor="key"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Key
            </label>

            <select
              id="key"
              value={key}
              onChange={(event) =>
                setKey(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 outline-none focus:border-violet-600"
            >
              {musicalKey.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="genre"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Genre
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
              placeholder="Trap"
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
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>

        {/* ------------------------------------------------ */}
        {/* Master */}
        {/* ------------------------------------------------ */}

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Master Audio
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Replace the master audio file. Replacing the
              master resets AI analysis and preview.
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              Current file
            </p>

            <p className="mt-1 break-all text-sm text-zinc-300">
              {beat.audio_key
                ? beat.audio_key
                    .split("/")
                    .pop()
                : "No R2 master file found"}
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
            className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-zinc-200"
          />

          {fileBusy ===
            "audio" && (
            <p className="mt-3 text-sm text-zinc-500">
              Uploading master...
            </p>
          )}
        </section>

        {/* ------------------------------------------------ */}
        {/* Cover */}
        {/* ------------------------------------------------ */}

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Cover
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Replace the cover image for this beat.
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              Current file
            </p>

            <p className="mt-1 break-all text-sm text-zinc-300">
              {beat.cover_key
                ? beat.cover_key
                    .split("/")
                    .pop()
                : "No R2 cover file found"}
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
            className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-zinc-200"
          />

          {fileBusy ===
            "cover" && (
            <p className="mt-3 text-sm text-zinc-500">
              Uploading cover...
            </p>
          )}
        </section>

        {/* ------------------------------------------------ */}
        {/* Stem / Licenses */}
        {/* ------------------------------------------------ */}

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Stem Pack & Licenses
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Manage your Stem Pack and license settings from
              the existing license manager.
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
                No Stem Pack uploaded.
              </p>
            )}
          </div>

          <Link
            href={`/producer/beats/${beat.id}/licenses`}
            className="inline-flex rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-900"
          >
            Manage Stem Pack & Licenses →
          </Link>
        </section>

        {/* ------------------------------------------------ */}
        {/* Analysis */}
        {/* ------------------------------------------------ */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Analysis Status
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Current AI analysis state for this beat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300">
              {beat.analysis_status ??
                "Unknown"}
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
              The Worker will analyze the master audio again.
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