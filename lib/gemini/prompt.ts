import {
  MOODS,
  ATMOSPHERES,
  SCENES,
  INSTRUMENTS,
  GENRES,
  SUBGENRES,
  GENRE_TAXONOMY,
} from "@/lib/taxonomy";

export const analysisText = `
Listen to this beat and analyze its mood, atmosphere, energy, scenes, instrumentation,
vocal characteristics, genre, subgenre, semantic tags, description, and confidence.

GENRE TAXONOMY RULES:
- ai_genres must use only these top-level genres: ${GENRES.join(", ")}.
- ai_subgenres must use only the listed subgenres and must belong to one of the selected ai_genres.
- The canonical genre-to-subgenre mapping is: ${Object.entries(GENRE_TAXONOMY)
    .map(([genre, subgenres]) => `${genre} → ${subgenres.join(", ")}`)
    .join("; ")}.
- Do not return a subgenre as a top-level genre. For example, Trap belongs under Hip Hop.
- If the audio does not support a confident classification, return an empty array rather than guessing.
`;

const enumArray = (values: readonly string[]) => ({
  type: "array",
  items: { type: "string", enum: [...values] },
});

const stringArray = {
  type: "array",
  items: { type: "string" },
};

export const analysisResponseSchema = {
  type: "object",
  properties: {
    moods: enumArray(MOODS),
    atmosphere: enumArray(ATMOSPHERES),
    energy: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    scenes: enumArray(SCENES),
    instruments: enumArray(INSTRUMENTS),

    // Vocal descriptors and semantic search tags remain free-form.
    vocals: stringArray,
    ai_genres: enumArray(GENRES),
    ai_subgenres: enumArray(SUBGENRES),

    semantic_tags: stringArray,
    description: { type: "string" },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
  },
  required: [
    "moods",
    "atmosphere",
    "energy",
    "scenes",
    "instruments",
    "vocals",
    "ai_genres",
    "ai_subgenres",
    "semantic_tags",
    "description",
    "confidence",
  ],
};
