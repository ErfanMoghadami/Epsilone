export interface UploadFormState {
  title: string;
  bpm: string;
  key: string;
  genre: string;
  audioFile: File | null;
  coverFile: File | null;
  stemFile: File | null;
}

export const initialState: UploadFormState = {
  title: "",
  bpm: "",
  key: "C Major",
  genre: "",
  audioFile: null,
  coverFile: null,
  stemFile: null,
};

const allowedTypes: string[] = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/mp3",
];

const allowedImageTypes: string[] = [
  "image/jpeg",
  "image/png",
];

const maxFileSize = 100;
const maxFileSizeInBytes =
  maxFileSize * 1024 * 1024;

const maxImageSize = 10;
const maxImageSizeInBytes =
  maxImageSize * 1024 * 1024;

const notes = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const musicalKey = notes.flatMap(
  (note) => [
    `${note} Major`,
    `${note} Minor`,
  ],
);

export function validate(
  form: UploadFormState,
): string | null {
  // Title
  if (form.title.trim() === "") {
    return "Title is required";
  }

  if (form.title.trim().length > 150) {
    return "Title must be 150 characters or less";
  }

  // BPM
  if (form.bpm.trim() === "") {
    return "BPM is required";
  }

  const bpm = Number(form.bpm);

  if (!Number.isInteger(bpm)) {
    return "BPM must be a whole number";
  }

  if (
    bpm < 50 ||
    bpm > 250
  ) {
    return "BPM must be between 50 and 250.";
  }

  // Key
  if (form.key.trim() === "") {
    return "Key is required";
  }

  if (!musicalKey.includes(form.key)) {
    return "Invalid musical key";
  }

  // Genre
  if (form.genre.trim() === "") {
    return "Genre is required";
  }

  if (form.genre.trim().length > 80) {
    return "Genre must be 80 characters or less";
  }

  // Audio
  if (form.audioFile === null) {
    return "Audio file is required";
  }

  if (!allowedTypes.includes(form.audioFile.type)) {
    return "Invalid audio file type. Only MP3, WAV, and FLAC are supported";
  }

  if (form.audioFile.size <= 0) {
    return "Audio file is empty";
  }

  if (
    form.audioFile.size >
    maxFileSizeInBytes
  ) {
    return "Audio file must be 100MB or smaller";
  }

  // Cover
  if (form.coverFile === null) {
    return "Cover file is required";
  }

  if (
    !allowedImageTypes.includes(
      form.coverFile.type,
    )
  ) {
    return "Invalid cover file type. Only JPEG and PNG are supported";
  }

  if (form.coverFile.size <= 0) {
    return "Cover file is empty";
  }

  if (
    form.coverFile.size >
    maxImageSizeInBytes
  ) {
    return "Cover file must be 10MB or smaller";
  }

  // Stem Pack
  // Optional.
  if (form.stemFile) {
    const stemExtension =
      form.stemFile.name
        .slice(
          form.stemFile.name.lastIndexOf("."),
        )
        .toLowerCase();

    if (
      stemExtension !== ".zip" &&
      stemExtension !== ".rar"
    ) {
      return "Stem Pack must be a ZIP or RAR file";
    }

    if (form.stemFile.size <= 0) {
      return "Stem Pack is empty";
    }

    const maxStemSize =
      1024 * 1024 * 1024;

    if (
      form.stemFile.size >
      maxStemSize
    ) {
      return "Stem Pack must be 1GB or smaller";
    }
  }

  return null;
}