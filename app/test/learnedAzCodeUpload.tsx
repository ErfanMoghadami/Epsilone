"use client"; // Marks this as a Client Component so hooks (useState) and browser APIs work

import { createClient } from "@/lib/supabase/client"; // Factory that returns a Supabase browser client
import React from "react";
import { useState } from "react"; // React's state hook

import { initialState, validate, UploadFormState } from "@/lib/uploadConfig"; // Shared form type, default values, and validation logic

export default function Page() {
  // Holds all form field values (title, bpm, key, genre, audioFile)
  const [form, setForm] = useState<UploadFormState>(initialState);

  // Holds the current error message to show the user, or null if none
  const [error, setError] = useState<string | null>(null);

  // True while an upload is in progress (used to disable the button / show a loading label)
  const [isLoading, setIsLoading] = useState(false);

  // True once the upload + DB insert have both succeeded
  const [success, setSuccess] = useState(false);

  // Runs when the form is submitted
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // Stop the browser's default full-page reload on form submit

    const errorMessage = validate(form); // Run all field checks once, store the result
    if (errorMessage !== null) {
      // Validation failed — show the message and stop here, don't touch the network
      setError(errorMessage);
      return;
    }

    const supabase = createClient(); // Create a Supabase client instance for this submit
    setIsLoading(true); // From here on we're doing async work, so show the loading state

    // Ask Supabase Auth who is currently logged in
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError) {
      // A real error occurred while checking auth (e.g. network problem)
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    if (data.user === null) {
      // No error, but there's no logged-in user either
      setError("User not authenticated");
      setIsLoading(false);
      return;
    }

    const userId = data.user.id; // The logged-in producer's id — becomes producer_id later

    const randomId = crypto.randomUUID(); // Unique id so files never collide, even with the same filename

    const fileId = form.audioFile!.name; // Original filename (we know audioFile isn't null — validate() already checked)

    // Build the storage path: userId/randomId-filename — the userId "folder" keeps each producer's files separate
    const pathFile = `${userId}/${randomId}-${fileId}`;

    // Upload the actual audio file to the "beats-audio" storage bucket at that path
    const { error: uploadError } = await supabase.storage
      .from("beats-audio")
      .upload(pathFile, form.audioFile!);

    if (uploadError) {
      // Storage upload failed — stop before touching the database
      setError(uploadError.message);
      setIsLoading(false);
      return;
    }

    // Get the public URL for the file we just uploaded (this call is sync, no await needed)
    const {
      data: { publicUrl },
    } = supabase.storage.from("beats-audio").getPublicUrl(pathFile);

    // Insert a new row into the "beats" table with all the metadata
    const { error: insertError } = await supabase.from("beats").insert({
      title: form.title.trim(), // Trim stray whitespace from the title
      bpm: Number(form.bpm), // Convert the string bpm to an actual number for the DB
      key: form.key,
      genre: form.genre,
      audio_url: publicUrl, // The link to the file we just uploaded
      producer_id: userId, // Ties this beat to the logged-in producer
      analysis_status: "pending", // AI analysis hasn't run yet
    });

    if (insertError) {
      // DB insert failed after the file was already uploaded — remove the orphaned file
      // rollback: file already uploaded but DB insert failed
      await supabase.storage.from("beats-audio").remove([pathFile]);
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    // Everything succeeded
    setSuccess(true);
    setIsLoading(false);
    setForm(initialState); // Reset the form for the next upload
  }

  return (
    // Fragment: lets us return multiple sibling elements (error msg, success msg, form) without an extra wrapper div
    <>
      {/* Only renders if error is not null/empty (falsy values render nothing) */}
      {error && <p>{error}</p>}

      {/* Only renders once success is true */}
      {success && <p>Success!</p>}

      <form onSubmit={handleSubmit}>
        {/* Controlled input: value always mirrors form.title, onChange updates state via spread so other fields aren't lost */}
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        {/* type="number" is just a UX hint for the browser/keyboard — value is still kept as a string in state */}
        <input
          type="number"
          value={form.bpm}
          onChange={(e) => setForm({ ...form, bpm: e.target.value })}
        />

        <input
          value={form.key}
          onChange={(e) => setForm({ ...form, key: e.target.value })}
        />

        <input
          value={form.genre}
          onChange={(e) => setForm({ ...form, genre: e.target.value })}
        />

        {/* File inputs can't be controlled with `value`, so only onChange is set here.
            accept is a UX-only hint (bypassable) — validate() is the real enforcement. */}
        <input
          type="file"
          accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac"
          onChange={(e) =>
            // files? handles files possibly being null; ?? null falls back cleanly to match the File | null type
            setForm({ ...form, audioFile: e.target.files?.[0] ?? null })
          }
        />

        {/* Disabled while loading so the user can't double-submit; label swaps via a ternary */}
        <button type="submit" disabled={isLoading}>
          {isLoading ? "uploading..." : "Upload"}
        </button>
      </form>
    </>
  );
}