import {
  MOODS,
  ATMOSPHERES,
  SCENES,
  INSTRUMENTS,
} from "@/lib/taxonomy";

export const analysisText =
  "Listen to this beat and analyze its mood, atmosphere, energy, scenes, instrumentation, vocal characteristics, genre, subgenre, semantic tags, description, and confidence.";

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

    // The current canonical taxonomy does not define fixed vocabularies
    // for these fields, so they remain free-form string arrays for now.
    vocals: stringArray,
    ai_genres: stringArray,
    ai_subgenres: stringArray,

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
