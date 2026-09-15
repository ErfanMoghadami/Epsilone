// ============================================================
// Epsilone Music Tagging System
// ============================================================

// ============================================================
// MOODS
// Overall emotional character of the beat
// ============================================================

export const MOODS = [
  "happy",
  "joyful",
  "uplifting",
  "hopeful",
  "peaceful",
  "calm",
  "playful",

  "confident",
  "romantic",
  "passionate",
  "sensual",

  "sad",
  "melancholic",
  "lonely",
  "heartbroken",
  "angry",
  "aggressive",
  "anxious",
  "tense",

  "dark",
  "haunting",
  "dreamy",
  "nostalgic",
  "emotional",
  "intimate",
  "mysterious",
  "hypnotic",
  "ethereal",

  "chill",
  "moody",
  "reflective",
  "serious",
  "rebellious",
  "euphoric",
  "powerful",
] as const;

// ============================================================
// ATMOSPHERES
// Sonic, spatial, and environmental qualities of the beat
// ============================================================

export const ATMOSPHERE = [
  "dark",
  "bright",
  "cinematic",
  "dreamy",
  "ethereal",
  "cold",
  "warm",

  "spacious",
  "minimal",
  "dense",
  "intimate",

  "mysterious",
  "eerie",
  "haunting",
  "surreal",
  "hypnotic",

  "peaceful",
  "chaotic",
  "melancholic",
  "nostalgic",

  "gritty",
  "raw",
  "urban",
  "luxurious",

  "underground",
  "industrial",
  "organic",
  "airy",
  "dark_ambient",
  "atmospheric",
] as const;

// ============================================================
// SCENES
// Situations, places, memories, or visual moments evoked
// by the music
// ============================================================

export const SCENES = [
  // Night
  "late_night_driving",
  "empty_city",
  "rainy_night",
  "alone_at_night",
  "neon_city",
  "city_at_midnight",
  "night_walk",

  // Day
  "sunrise",
  "sunset",
  "summer_day",
  "morning",
  "golden_hour",

  // Nature
  "ocean",
  "beach",
  "forest",
  "mountains",
  "rain",
  "storm",
  "desert",

  // Transportation
  "car_ride",
  "road_trip",
  "highway",
  "train_ride",
  "night_drive",

  // Social
  "party",
  "club",
  "concert",
  "hanging_out",
  "celebration",

  // Romance
  "falling_in_love",
  "date",
  "intimate_moment",
  "missing_someone",
  "breakup",

  // Isolation
  "being_alone",
  "late_night_thoughts",
  "empty_room",
  "walking_alone",
  "lost_in_thought",

  // Memory
  "childhood_memory",
  "old_memories",
  "flashback",
  "reminiscence",

  // Cinematic
  "crime_scene",
  "chase",
  "victory",
  "loss",
  "dream_sequence",
  "introspection",
  "final_scene",
  "opening_scene",
] as const;

// ============================================================
// INSTRUMENTS
// Instruments and important sonic elements present in the beat
// ============================================================

export const INSTRUMENTS = [
  // Keys
  "piano",
  "electric_piano",
  "organ",
  "synth",
  "keys",

  // Guitar
  "guitar",
  "acoustic_guitar",
  "electric_guitar",

  // Bass
  "bass",
  "sub_bass",
  "808",
  "synth_bass",

  // Synth
  "lead_synth",
  "pad",
  "pluck",
  "arp",

  // Strings
  "strings",
  "violin",
  "cello",

  // Melodic
  "bells",
  "mallet",
  "flute",
  "brass",

  // Drums
  "drums",
  "percussion",
  "kick",
  "snare",
  "claps",
  "hi_hats",
  "open_hats",
  "cymbals",

  // Vocal
  "vocal",
  "vocal_chops",
  "choir",
] as const;

// ============================================================
// VOCAL TYPES
// Type or treatment of vocals present in the beat
// ============================================================

export const VOCAL_TYPES = [
  "none",
  "male",
  "female",
  "choir",
  "vocal_chops",
  "vocal_sample",
  "spoken",
  "whispered",
  "processed",
] as const;

// ============================================================
// GENRES
// AI-generated primary genre classification
// ============================================================

export const GENRES = [
  "hip_hop",
  "trap",
  "melodic_trap",
  "ambient_trap",
  "rnb",
  "alternative_rnb",
  "lofi",
  "drill",
  "boom_bap",
  "pop",
  "electronic",
  "ambient",
  "cinematic",
  "experimental",
] as const;

// ============================================================
// SUBGENRES
// AI-generated more specific genre classification
// ============================================================

export const SUBGENRES = [
  "dark_trap",
  "rage",
  "pluggnb",
  "cloud_rap",
  "trap_soul",
  "melodic_rap",
  "emo_rap",
  "west_coast",
  "underground",
] as const;

// ============================================================
// TYPES
// ============================================================

export type Mood = (typeof MOODS)[number];
export type Atmosphere = (typeof ATMOSPHERE)[number];
export type Scene = (typeof SCENES)[number];
export type Instrument = (typeof INSTRUMENTS)[number];
export type VocalType = (typeof VOCAL_TYPES)[number];
export type Genre = (typeof GENRES)[number];
export type Subgenre = (typeof SUBGENRES)[number];

// ============================================================
// COMPLETE AI BEAT TAG STRUCTURE
// ============================================================

export interface BeatTags {
  moods: Mood[];
  atmospheres: Atmosphere[];

  // Numeric value between 0 and 1
  // 0 = very low energy, 1 = very high energy
  energy: number;

  scenes: Scene[];
  instruments: Instrument[];
  vocals: VocalType[];

  // AI-generated genre classification
  ai_genres: Genre[];
  ai_subgenres: Subgenre[];

  // Free-form tags outside the fixed taxonomy
  semantic_tags: string[];

  // Short text summary of the beat's vibe
  description: string;

  // AI's confidence in this analysis, 0 to 1
  confidence: number;
}