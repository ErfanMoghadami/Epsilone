/** Marketplace discount helpers. Prices are rounded to currency cents. */
export function normalizeDiscountPercent(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 90) return 0;
  return parsed;
}

export function applyDiscount(price: number | string | null | undefined, percent: unknown): number {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) return 0;

  const discountPercent = normalizeDiscountPercent(percent);
  const discounted = numericPrice * (1 - discountPercent / 100);
  return Math.round((discounted + Number.EPSILON) * 100) / 100;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
