export type LicenseType = "Basic" | "Premium" | "Exclusive";

export const MAX_TERMS = 12;
export const MAX_TERM_LENGTH = 120;

// Defaults: used only when the producer hasn't written their own terms
export const LICENSE_TERMS: Record<
  LicenseType,
  { tagline: string; terms: string[] }
> = {
  Basic: {
    tagline: "Standard license for regular beat usage.",
    terms: [
      "Up to 50,000 streams",
      "1 music video",
      "Non-profit live performances",
      "Non-exclusive (beat stays on sale)",
    ],
  },
  Premium: {
    tagline: "Extended license for broader commercial usage.",
    terms: [
      "Up to 500,000 streams",
      "Up to 3 music videos",
      "Paid live performances",
      "Non-exclusive (beat stays on sale)",
    ],
  },
  Exclusive: {
    tagline: "Exclusive ownership-style license for the buyer.",
    terms: [
      "Unlimited streams",
      "Unlimited music videos",
      "Commercial & radio use",
      "Exclusive rights for the buyer",
    ],
  },
};

export function getLicenseTerms(type: string) {
  return LICENSE_TERMS[type as LicenseType] ?? { tagline: "", terms: [] };
}

// Removes empty lines and truncates long ones
export function cleanTerms(terms: string[] | null | undefined): string[] {
  return (terms ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TERMS)
    .map((t) => t.slice(0, MAX_TERM_LENGTH));
}

// Falls back to defaults if the producer wrote nothing
export function resolveTerms(type: string, terms?: string[] | null): string[] {
  const clean = cleanTerms(terms);
  return clean.length > 0 ? clean : getLicenseTerms(type).terms;
}