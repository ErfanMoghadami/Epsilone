import { MOODS, ATMOSPHERES, SCENES, INSTRUMENTS } from "@/lib/taxonomy";

function filterByTaxonomy<T extends string>(
  arr: unknown,
  allowed: readonly T[],
  max: number,
): T[] {
  if (!Array.isArray(arr)) return [];

  const valid = arr.filter((value): value is T => allowed.includes(value as T));

  return Array.from(new Set(valid)).slice(0, max);
}

function filterStrings(arr: unknown, max: number): string[] {
  if (!Array.isArray(arr)) return [];

  return Array.from(
    new Set(
      arr.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      ),
    ),
  )
    .map((value) => value.trim())
    .slice(0, max);
}

function clamp01(value: unknown): number {
  const numberValue =
    typeof value === "number" && Number.isFinite(value) ? value : 0;

  return Math.min(1, Math.max(0, numberValue));
}

interface RawAnalysis {
  moods?: unknown;
  atmosphere?: unknown;
  energy?: unknown;
  scenes?: unknown;
  instruments?: unknown;
  vocals?: unknown;
  ai_genres?: unknown;
  ai_subgenres?: unknown;
  semantic_tags?: unknown;
  description?: unknown;
  confidence?: unknown;
}

export function validateAnalysis(raw: unknown) {
  const result = (raw ?? {}) as RawAnalysis;

  return {
    moods: filterByTaxonomy(result.moods, MOODS, 5),
    atmosphere: filterByTaxonomy(result.atmosphere, ATMOSPHERES, 4),
    energy: clamp01(result.energy),
    scenes: filterByTaxonomy(result.scenes, SCENES, 3),
    instruments: filterByTaxonomy(result.instruments, INSTRUMENTS, 8),

    // These fields are free-form because no canonical arrays currently
    // exist for them in lib/taxonomy.ts.
    vocals: filterStrings(result.vocals, 2),
    ai_genres: filterStrings(result.ai_genres, 2),
    ai_subgenres: filterStrings(result.ai_subgenres, 2),

    semantic_tags: filterStrings(result.semantic_tags, 10),
    description:
      typeof result.description === "string"
        ? result.description.trim().slice(0, 500)
        : "",
    confidence: clamp01(result.confidence),
  };
}
