import {
  MOODS, ATMOSPHERE, SCENES, INSTRUMENTS,
  VOCAL_TYPES, GENRES, SUBGENRES,
} from "@/lib/taxonomy";

function filterByTaxonomy<T extends string>(arr: unknown, allowed: readonly T[], max: number): T[] {
  if (!Array.isArray(arr)) return [];
  const valid = arr.filter((v): v is T => allowed.includes(v as T));
  return Array.from(new Set(valid)).slice(0, max);
}

function clamp01(n: unknown): number {
  const num = typeof n === "number" ? n : 0;
  return Math.min(1, Math.max(0, num));
}

interface RawAnalysis {
  moods?: unknown;
  atmospheres?: unknown;
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
  const r = (raw ?? {}) as RawAnalysis;
  return {
    moods: filterByTaxonomy(r.moods, MOODS, 5),
    atmospheres: filterByTaxonomy(r.atmospheres, ATMOSPHERE, 4),
    energy: clamp01(r.energy),
    scenes: filterByTaxonomy(r.scenes, SCENES, 3),
    instruments: filterByTaxonomy(r.instruments, INSTRUMENTS, 8),
    vocals: filterByTaxonomy(r.vocals, VOCAL_TYPES, 2),
    ai_genres: filterByTaxonomy(r.ai_genres, GENRES, 2),
    ai_subgenres: filterByTaxonomy(r.ai_subgenres, SUBGENRES, 2),
    semantic_tags: Array.isArray(r.semantic_tags)
      ? Array.from(new Set(r.semantic_tags.filter((t): t is string => typeof t === "string"))).slice(0, 5)
      : [],
    description: typeof r.description === "string" ? r.description.slice(0, 500) : "",
    confidence: clamp01(r.confidence),
  };
}