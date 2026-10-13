export const APP_CURRENCY = "TOMAN" as const;

const tomanFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  if (currency === APP_CURRENCY) {
    return `${tomanFormatter.format(Math.round(amount))} تومان`;
  }

  // Preserve historical USD orders accurately.
  if (currency === "USD") {
    return `$${decimalFormatter.format(amount)}`;
  }

  return `${currency ? `${currency} ` : ""}${decimalFormatter.format(amount)}`;
}