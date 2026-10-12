import {
  ATMOSPHERES,
  GENRE_TAXONOMY,
  INSTRUMENTS,
  MOODS,
  SCENES,
} from "@/lib/taxonomy";

export interface UploadFormState {
  title: string;
  bpm: string;
  key: string;
  genre: string;
  subgenre: string;
  moods: string[];
  atmosphere: string[];
  instruments: string[];
  scenes: string[];
  tags: string[];
  audioFile: File | null;
  coverFile: File | null;
  stemFile: File | null;
}

export const initialState: UploadFormState = {
  title: "",
  bpm: "",
  key: "C Major",
  genre: "",
  subgenre: "",
  moods: [],
  atmosphere: [],
  instruments: [],
  scenes: [],
  tags: [],
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

const allowedImageTypes: string[] = ["image/jpeg", "image/png"];
const maxFileSize = 100;
const maxFileSizeInBytes = maxFileSize * 1024 * 1024;
const maxImageSize = 10;
const maxImageSizeInBytes = maxImageSize * 1024 * 1024;

const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const musicalKey = notes.flatMap((note) => [`${note} Major`, `${note} Minor`]);

const taxonomyRules = [
  { label: "Mood", values: MOODS, selected: (form: UploadFormState) => form.moods, max: 5 },
  { label: "Atmosphere", values: ATMOSPHERES, selected: (form: UploadFormState) => form.atmosphere, max: 4 },
  { label: "Instrument", values: INSTRUMENTS, selected: (form: UploadFormState) => form.instruments, max: 8 },
  { label: "Scene", values: SCENES, selected: (form: UploadFormState) => form.scenes, max: 3 },
] as const;

export function validate(form: UploadFormState): string | null {
  if (form.title.trim() === "") return "Title is required.";
  if (form.title.trim().length > 150) return "Title must be 150 characters or less.";

  if (form.bpm.trim() === "") return "BPM is required.";
  const bpm = Number(form.bpm);
  if (!Number.isInteger(bpm) || bpm < 50 || bpm > 250) {
    return "BPM must be a whole number between 50 and 250.";
  }

  if (!musicalKey.includes(form.key)) return "Choose a valid musical key.";

  if (!Object.prototype.hasOwnProperty.call(GENRE_TAXONOMY, form.genre)) {
    return "Choose a genre from the taxonomy.";
  }

  const subgenres = GENRE_TAXONOMY[form.genre as keyof typeof GENRE_TAXONOMY] as readonly string[];
  if (form.subgenre && !subgenres.includes(form.subgenre)) {
    return "Choose a subgenre that belongs to the selected genre.";
  }

  for (const rule of taxonomyRules) {
    const selected = rule.selected(form) as readonly string[];
    if (selected.length > rule.max) {
      return `Choose no more than ${rule.max} ${rule.label.toLowerCase()}s.`;
    }
    if (selected.some((value) => !(rule.values as readonly string[]).includes(value))) {
      return `One or more selected ${rule.label.toLowerCase()} values are invalid.`;
    }
    if (new Set(selected).size !== selected.length) {
      return `Remove duplicate ${rule.label.toLowerCase()} values.`;
    }
  }

  if (form.tags.length > 3) return "Choose no more than 3 tags.";
  const normalizedTags = form.tags.map((tag) => tag.trim().replace(/^#/, "").replace(/\s+/g, " "));
  if (normalizedTags.some((tag) => tag.length < 2 || tag.length > 40)) {
    return "Each tag must be between 2 and 40 characters.";
  }
  if (normalizedTags.some((tag) => !tag)) return "Tags cannot be empty.";
  if (new Set(normalizedTags.map((tag) => tag.toLowerCase())).size !== normalizedTags.length) {
    return "Tags must be unique.";
  }

  if (!form.audioFile) return "Audio file is required.";
  if (!allowedTypes.includes(form.audioFile.type)) {
    return "Invalid audio file type. Only MP3, WAV, and FLAC are supported.";
  }
  if (form.audioFile.size <= 0) return "Audio file is empty.";
  if (form.audioFile.size > maxFileSizeInBytes) return "Audio file must be 100MB or smaller.";

  if (!form.coverFile) return "Cover file is required.";
  if (!allowedImageTypes.includes(form.coverFile.type)) {
    return "Invalid cover file type. Only JPEG and PNG are supported.";
  }
  if (form.coverFile.size <= 0) return "Cover file is empty.";
  if (form.coverFile.size > maxImageSizeInBytes) return "Cover file must be 10MB or smaller.";

  if (form.stemFile) {
    const stemExtension = form.stemFile.name.slice(form.stemFile.name.lastIndexOf(".")).toLowerCase();
    if (stemExtension !== ".zip" && stemExtension !== ".rar") {
      return "Stem Pack must be a ZIP or RAR file.";
    }
    if (form.stemFile.size <= 0) return "Stem Pack is empty.";
    if (form.stemFile.size > 1024 * 1024 * 1024) return "Stem Pack must be 1GB or smaller.";
  }

  return null;
}
