export interface UploadFormState {
  title: string;
  bpm: string;
  key: string;
  genre: string;
  audioFile: File | null;
  coverFile: File | null;
}
export const initialState: UploadFormState = {
  title: "",
  bpm: "",
  key: "",
  genre: "",
  audioFile: null,
  coverFile: null,
};

const allowedTypes: string[] = ["audio/mpeg", "audio/wav", "audio/flac", "audio/mp3"];


const allowedImageTypes: string[] = ["image/jpeg", "image/png",];

const maxFileSize = 50;
const maxFileSizeInBytes = maxFileSize * 1024 * 1024;
const maxImageSize = 10;
const maxImageSizeInBytes = maxImageSize * 1024 * 1024;


const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// const modes = ["Major", "Minor"];

export const musicalKey = notes.flatMap(note => [`${note} Major`, `${note} Minor`]);

export function validate(form: UploadFormState): string | null {
  if (form.title.trim() === "") return "Title is required";
  if (form.bpm.trim() === "") return "BPM is required";
  if (isNaN(Number(form.bpm)) || Number(form.bpm) <= 0)
    return "BPM must be a number";
  if (form.key.trim() === "") return "Key is required";
  if (form.genre.trim() === "") return "Genre is required";
  if (form.audioFile === null) return "Audio file is required";
  if (!allowedTypes.includes(form.audioFile.type))
    return "Invalid audio file type";
  if (form.audioFile.size > maxFileSizeInBytes)
    return "Audio file must be less than 50MB";
  if (form.coverFile === null) return "Cover file is required";
  if (form.coverFile.size > maxImageSizeInBytes)
    return "Cover file must be less than 10MB";
  if(!allowedImageTypes.includes(form.coverFile.type))
    return "Invalid cover file type";
  return null;
}
