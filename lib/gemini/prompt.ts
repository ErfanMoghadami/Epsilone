import {
  MOODS, ATMOSPHERE, SCENES, INSTRUMENTS,
  VOCAL_TYPES, GENRES, SUBGENRES,
} from "@/lib/taxonomy";

export const analysisText = "Listen to this beat and analyze its mood, atmosphere, energy, and instrumentation.";

const enumArray = (values: readonly string[]) => ({
  type: "array",
  items: { type: "string", enum: [...values] },
});

export const analysisResponseSchema = {
  type: "object",
  properties: {
    moods: enumArray(MOODS),
    atmospheres: enumArray(ATMOSPHERE),
    energy: { type: "number" },
    scenes: enumArray(SCENES),
    instruments: enumArray(INSTRUMENTS),
    vocals: enumArray(VOCAL_TYPES),
    ai_genres: enumArray(GENRES),
    ai_subgenres: enumArray(SUBGENRES),
    semantic_tags: { type: "array", items: { type: "string" } },
    description: { type: "string" },
    confidence: { type: "number" },
  },
  required: [
    "moods", "atmospheres", "energy", "scenes", "instruments",
    "vocals", "ai_genres", "ai_subgenres", "semantic_tags",
    "description", "confidence",
  ],
};