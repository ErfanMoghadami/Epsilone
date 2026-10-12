// ============================================================
// Epsilone Canonical Taxonomy
// Single source of truth for:
// - AI Beat Analysis
// - User Query Understanding
// - Search
// - Matching / Recommendation
// ============================================================

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type Mood =
  | "Calm"
  | "Chill"
  | "Relaxed"
  | "Peaceful"
  | "Dreamy"
  | "Ethereal"
  | "Nostalgic"
  | "Reflective"
  | "Melancholic"
  | "Sad"
  | "Emotional"
  | "Lonely"
  | "Romantic"
  | "Sensual"
  | "Hopeful"
  | "Warm"
  | "Happy"
  | "Joyful"
  | "Playful"
  | "Carefree"
  | "Confident"
  | "Bold"
  | "Motivational"
  | "Triumphant"
  | "Mysterious"
  | "Dark"
  | "Eerie"
  | "Tense"
  | "Aggressive"
  | "Angry"
  | "Rebellious"
  | "Cold"
  | "Serious"
  | "Focused"
  | "Hypnotic"
  | "Trippy"
  | "Futuristic"
  | "Energetic"
  | "Excited"
  | "Chaotic";

export type Atmosphere =
  | "Atmospheric"
  | "Hazy"
  | "Dreamy"
  | "Nocturnal"
  | "Urban"
  | "Gritty"
  | "Raw"
  | "Cinematic"
  | "Minimal"
  | "Spacious"
  | "Intimate"
  | "Warm"
  | "Cold"
  | "Dark"
  | "Moody"
  | "Smoky"
  | "Dusty"
  | "Vintage"
  | "Retro"
  | "Futuristic"
  | "Neon"
  | "Industrial"
  | "Organic"
  | "Lush"
  | "Airy"
  | "Ethereal"
  | "Surreal"
  | "Mystical"
  | "Glitchy"
  | "Hypnotic"
  | "Underground"
  | "Polished"
  | "Smooth"
  | "Textured"
  | "Lo-fi"
  | "Ambient"
  | "Live"
  | "Acoustic"
  | "Dense"
  | "Sparse";

export type Instrument =
  // Drums
  | "Kick"
  | "Snare"
  | "Clap"
  | "Rimshot"
  | "Hi-hat"
  | "Open Hat"
  | "Percussion"
  | "Tom"
  | "Drum Kit"
  | "Trap Drums"
  | "Live Drums"

  // Bass
  | "808 Bass"
  | "Sub Bass"
  | "Synth Bass"
  | "Electric Bass"
  | "Bass Guitar"

  // Keys / Synth
  | "Piano"
  | "Electric Piano"
  | "Rhodes"
  | "Organ"
  | "Pad"
  | "Synth"
  | "Arpeggiated Synth"
  | "Lead Synth"
  | "Pluck"
  | "Bell"

  // Strings
  | "Acoustic Guitar"
  | "Electric Guitar"
  | "Nylon Guitar"
  | "Strings"
  | "Violin"
  | "Cello"

  // Vocals
  | "Vocal Chops"
  | "Vocal Sample"
  | "Vocal Texture"
  | "Background Vocals"

  // Other
  | "FX"
  | "Texture"
  | "Field Recording"
  | "Choir"
  | "Brass"
  | "Saxophone"
  | "Flute";

export type Scene =
  | "Late Night Drive"
  | "Night Drive"
  | "Road Trip"
  | "Walking Alone"
  | "City Walk"
  | "Studying"
  | "Coding"
  | "Working"
  | "Reading"
  | "Relaxing"
  | "Sleeping"
  | "Late Night Thinking"
  | "Hanging Out"
  | "Chill Kickback"
  | "Party"
  | "Club"
  | "Pre-Game"
  | "Workout"
  | "Gaming"
  | "Streaming"
  | "Content Creation"
  | "Vlog"
  | "Travel"
  | "Beach Day"
  | "Summer Day"
  | "Rainy Day"
  | "Coffee Shop"
  | "Creative Session"
  | "Writing"
  | "Freestyle"
  | "Recording"
  | "Rap Session"
  | "Music Video"
  | "Fashion Video"
  | "Streetwear Promo"
  | "Background Music"
  | "Focus Session"
  | "Meditation";

export type EnergyLevel =
  | "Very Low"
  | "Low"
  | "Low-Medium"
  | "Medium"
  | "Medium-High"
  | "High"
  | "Very High";


// ------------------------------------------------------------
// Canonical Arrays
// ------------------------------------------------------------

export const MOODS: readonly Mood[] = [
  "Calm",
  "Chill",
  "Relaxed",
  "Peaceful",
  "Dreamy",
  "Ethereal",
  "Nostalgic",
  "Reflective",
  "Melancholic",
  "Sad",
  "Emotional",
  "Lonely",
  "Romantic",
  "Sensual",
  "Hopeful",
  "Warm",
  "Happy",
  "Joyful",
  "Playful",
  "Carefree",
  "Confident",
  "Bold",
  "Motivational",
  "Triumphant",
  "Mysterious",
  "Dark",
  "Eerie",
  "Tense",
  "Aggressive",
  "Angry",
  "Rebellious",
  "Cold",
  "Serious",
  "Focused",
  "Hypnotic",
  "Trippy",
  "Futuristic",
  "Energetic",
  "Excited",
  "Chaotic",
];

export const ATMOSPHERES: readonly Atmosphere[] = [
  "Atmospheric",
  "Hazy",
  "Dreamy",
  "Nocturnal",
  "Urban",
  "Gritty",
  "Raw",
  "Cinematic",
  "Minimal",
  "Spacious",
  "Intimate",
  "Warm",
  "Cold",
  "Dark",
  "Moody",
  "Smoky",
  "Dusty",
  "Vintage",
  "Retro",
  "Futuristic",
  "Neon",
  "Industrial",
  "Organic",
  "Lush",
  "Airy",
  "Ethereal",
  "Surreal",
  "Mystical",
  "Glitchy",
  "Hypnotic",
  "Underground",
  "Polished",
  "Smooth",
  "Textured",
  "Lo-fi",
  "Ambient",
  "Live",
  "Acoustic",
  "Dense",
  "Sparse",
];

export const INSTRUMENTS: readonly Instrument[] = [
  "Kick",
  "Snare",
  "Clap",
  "Rimshot",
  "Hi-hat",
  "Open Hat",
  "Percussion",
  "Tom",
  "Drum Kit",
  "Trap Drums",
  "Live Drums",

  "808 Bass",
  "Sub Bass",
  "Synth Bass",
  "Electric Bass",
  "Bass Guitar",

  "Piano",
  "Electric Piano",
  "Rhodes",
  "Organ",
  "Pad",
  "Synth",
  "Arpeggiated Synth",
  "Lead Synth",
  "Pluck",
  "Bell",

  "Acoustic Guitar",
  "Electric Guitar",
  "Nylon Guitar",
  "Strings",
  "Violin",
  "Cello",

  "Vocal Chops",
  "Vocal Sample",
  "Vocal Texture",
  "Background Vocals",

  "FX",
  "Texture",
  "Field Recording",
  "Choir",
  "Brass",
  "Saxophone",
  "Flute",
];

export const SCENES: readonly Scene[] = [
  "Late Night Drive",
  "Night Drive",
  "Road Trip",
  "Walking Alone",
  "City Walk",
  "Studying",
  "Coding",
  "Working",
  "Reading",
  "Relaxing",
  "Sleeping",
  "Late Night Thinking",
  "Hanging Out",
  "Chill Kickback",
  "Party",
  "Club",
  "Pre-Game",
  "Workout",
  "Gaming",
  "Streaming",
  "Content Creation",
  "Vlog",
  "Travel",
  "Beach Day",
  "Summer Day",
  "Rainy Day",
  "Coffee Shop",
  "Creative Session",
  "Writing",
  "Freestyle",
  "Recording",
  "Rap Session",
  "Music Video",
  "Fashion Video",
  "Streetwear Promo",
  "Background Music",
  "Focus Session",
  "Meditation",
];

// ------------------------------------------------------------
// Producer-facing Genre → Subgenre taxonomy
// ------------------------------------------------------------

export const GENRE_TAXONOMY = {
  "Hip Hop": [
    "Trap",
    "Melodic Trap",
    "Rage",
    "Plugg",
    "PluggnB",
    "Cloud Rap",
    "Alternative Hip Hop",
    "Underground Hip Hop",
    "Boom Bap",
    "Lo-fi Hip Hop",
    "Experimental Hip Hop",
    "West Coast Hip Hop",
  ],
  "R&B": [
    "Contemporary R&B",
    "Alternative R&B",
    "Trap Soul",
    "Neo-Soul",
    "Slow Jam",
  ],
  "Pop": ["Pop Rap", "Dark Pop", "Synth-Pop", "Indie Pop", "Dance Pop"],
  "Electronic": [
    "Ambient",
    "House",
    "Techno",
    "Synthwave",
    "Drum & Bass",
    "Experimental Electronic",
    "Downtempo",
  ],
  "Afrobeats": ["Afro-R&B", "Afro-Fusion", "Afro-Pop"],
  "Latin": ["Latin Trap", "Reggaeton", "Latin Pop"],
  "Jazz": ["Jazz Rap", "Jazz Fusion", "Lo-fi Jazz"],
  "Rock": ["Alternative Rock", "Indie Rock", "Pop Punk"],
  "Country": ["Country Pop", "Americana", "Country Rap"],
  "Folk": ["Indie Folk", "Acoustic Folk", "Folk Pop"],
  "Reggae": ["Dancehall", "Roots Reggae", "Reggae Fusion"],
  "Gospel": ["Contemporary Gospel", "Gospel R&B", "Choir Gospel"],
  "Cinematic": ["Epic Cinematic", "Ambient Cinematic", "Trailer Music"],
  "Other": [],
} as const;

export type Genre = keyof typeof GENRE_TAXONOMY;
export const GENRES = Object.keys(GENRE_TAXONOMY) as Genre[];
export const SUBGENRES = Array.from(
  new Set(Object.values(GENRE_TAXONOMY).flat()),
) as string[];

export function isValidGenre(value: string): value is Genre {
  return Object.prototype.hasOwnProperty.call(GENRE_TAXONOMY, value);
}

export function isValidSubgenre(genre: string, subgenre: string): boolean {
  if (!subgenre) return true;
  if (!isValidGenre(genre)) return false;
  return (GENRE_TAXONOMY[genre] as readonly string[]).includes(subgenre);
}

export const ENERGY_LEVELS: readonly EnergyLevel[] = [
  "Very Low",
  "Low",
  "Low-Medium",
  "Medium",
  "Medium-High",
  "High",
  "Very High",
];


// ------------------------------------------------------------
// Energy helpers
// ------------------------------------------------------------

export const ENERGY_RANGE = {
  min: 0,
  max: 1,
} as const;

export const ENERGY_BUCKETS = [
  {
    label: "Very Low",
    min: 0.0,
    max: 0.15,
  },
  {
    label: "Low",
    min: 0.16,
    max: 0.3,
  },
  {
    label: "Low-Medium",
    min: 0.31,
    max: 0.45,
  },
  {
    label: "Medium",
    min: 0.46,
    max: 0.6,
  },
  {
    label: "Medium-High",
    min: 0.61,
    max: 0.75,
  },
  {
    label: "High",
    min: 0.76,
    max: 0.9,
  },
  {
    label: "Very High",
    min: 0.91,
    max: 1.0,
  },
] as const;


// ------------------------------------------------------------
// Limits for Gemini output
// ------------------------------------------------------------

export const TAXONOMY_LIMITS = {
  moods: {
    min: 3,
    max: 6,
  },

  atmosphere: {
    min: 3,
    max: 6,
  },

  instruments: {
    min: 0,
    max: 10,
  },

  scenes: {
    min: 3,
    max: 6,
  },

  semanticTags: {
    min: 6,
    max: 10,
  },
} as const;


// ------------------------------------------------------------
// Semantic Tag Guidelines
// ------------------------------------------------------------

export const SEMANTIC_TAG_CATEGORIES = [
  "genre",
  "subgenre",
  "style",
  "vibe",
  "production",
  "use-case",
  "search-intent",
] as const;

export type SemanticTagCategory =
  (typeof SEMANTIC_TAG_CATEGORIES)[number];


// ------------------------------------------------------------
// AI Analysis Output
// ------------------------------------------------------------

export interface BeatAIAnalysis {
  moods: Mood[];
  atmosphere: Atmosphere[];
  instruments: Instrument[];
  scenes: Scene[];
  energy: number;
  semantic_tags: string[];
}


// ------------------------------------------------------------
// User Query Interpretation
// ------------------------------------------------------------

export interface EpsiloneQuery {
  moods: Mood[];
  atmosphere: Atmosphere[];
  scenes: Scene[];
  energy: number | null;
  genres: string[];
  semantic_tags: string[];
  raw_text: string;
}


// ------------------------------------------------------------
// Utility functions
// ------------------------------------------------------------

export function isValidMood(value: string): value is Mood {
  return MOODS.includes(value as Mood);
}

export function isValidAtmosphere(
  value: string,
): value is Atmosphere {
  return ATMOSPHERES.includes(value as Atmosphere);
}

export function isValidInstrument(
  value: string,
): value is Instrument {
  return INSTRUMENTS.includes(value as Instrument);
}

export function isValidScene(value: string): value is Scene {
  return SCENES.includes(value as Scene);
}

export function clampEnergy(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function getEnergyBucket(
  energy: number,
): EnergyLevel {
  const normalized = clampEnergy(energy);

  const bucket = ENERGY_BUCKETS.find(
    (item) =>
      normalized >= item.min &&
      normalized <= item.max,
  );

  return bucket?.label ?? "Medium";
}