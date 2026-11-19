
"use client";

export default function PrintLicenseButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 print:hidden"
    >
      چاپ / ذخیره قرارداد به صورت PDF
    </button>
  );
}
