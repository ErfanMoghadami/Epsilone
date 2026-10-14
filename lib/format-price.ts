/**
 * Formats price amounts for display across Epsilone.
 * It intentionally omits currency symbols/codes and drops insignificant
 * trailing decimal zeros while retaining meaningful fractional amounts.
 * It does not change the stored price or the currency used for payments.
 */
export function formatPriceAmount(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Persian-digit toman amount, e.g. ۳,۲۰۰ (no unit). */
export function formatToman(
  value: number | string | null | undefined,
): string {
  const amount = Number(value);
  if (value === null || value === undefined || !Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 })
    .format(amount)
    .replace(/٬/g, ",");
}