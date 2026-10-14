export type LicenseType = "Basic" | "Premium" | "Exclusive";

export const MAX_TERMS = 12;
export const MAX_TERM_LENGTH = 120;

// Defaults: used only when the producer hasn't written their own terms.
export const LICENSE_TERMS: Record<
  LicenseType,
  { tagline: string; terms: string[] }
> = {
  Basic: {
    tagline: "لایسنس استاندارد و غیرانحصاری برای استفاده از بیت.",
    terms: [
      "تا ۵۰٬۰۰۰ استریم",
      "۱ موزیک ویدیو",
      "اجراهای زنده‌ی غیرانتفاعی",
      "غیرانحصاری؛ بیت می‌تواند همچنان به دیگران لایسنس داده شود.",
    ],
  },

  Premium: {
    tagline: "لایسنس تجاری غیرانحصاری با امکانات گسترده‌تر.",
    terms: [
      "تا ۵۰۰٬۰۰۰ استریم",
      "تا ۳ موزیک ویدیو",
      "اجراهای زنده‌ی درآمدزا",
      "غیرانحصاری؛ بیت می‌تواند همچنان به دیگران لایسنس داده شود.",
    ],
  },

  Exclusive: {
    tagline:
      "لایسنس انحصاری استفاده؛ به‌معنای انتقال خودکار مالکیت کپی‌رایت نیست.",
    terms: [
      "استریم نامحدود طبق شرایط این لایسنس",
      "موزیک ویدیوی نامحدود طبق شرایط این لایسنس",
      "استفاده‌ی تجاری و رادیویی طبق شرایط این لایسنس",
      "مجوز انحصاری؛ مالکیت کپی‌رایت فقط با توافق کتبی جداگانه منتقل می‌شود.",
      "لایسنس‌های معتبری که پیش از فروش انحصاری صادر شده‌اند، تابع شرایط خود باقی می‌مانند.",
    ],
  },
};

export function getLicenseTerms(type: string) {
  return LICENSE_TERMS[type as LicenseType] ?? {
    tagline: "",
    terms: [],
  };
}

// Removes empty lines and truncates long ones.
export function cleanTerms(
  terms: string[] | null | undefined,
): string[] {
  return (terms ?? [])
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, MAX_TERMS)
    .map((term) => term.slice(0, MAX_TERM_LENGTH));
}

// Falls back to defaults if the producer wrote nothing.
export function resolveTerms(
  type: string,
  terms?: string[] | null,
): string[] {
  const clean = cleanTerms(terms);

  return clean.length > 0
    ? clean
    : getLicenseTerms(type).terms;
}