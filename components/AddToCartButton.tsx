"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { resolveTerms, getLicenseTerms } from "@/lib/licenses";
import { formatPriceAmount, formatToman } from "@/lib/format-price";
import Select from "@/components/ui/Select";

type License = {
  id: string;
  license_type: string;
  price: number;
  original_price: number;
  discounted_price: number;
  discount_percent: number;
  currency: string;
  includes_stems: boolean;
  terms: string[] | null;
};

type AddToCartButtonProps = {
  beatId: string;
  title: string;
  variant?: "default" | "compact";
};

type CartItem = {
  beatId: string;
  title: string;
  licenseId: string;
  licenseType: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  currency: string;
  includesStems: boolean;
};

const CART_KEY = "epsilone-cart";

const SOLD_LABEL = "فروخته شد";
const UNAVAILABLE_LABEL = "در دسترس نیست";

function discountLabel(percent: number) {
  return `${percent}٪ تخفیف`;
}

export default function AddToCartButton({
  beatId,
  title,
  variant = "default",
}: AddToCartButtonProps) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [selectedLicense, setSelectedLicense] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [showCartPrompt, setShowCartPrompt] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [alreadyInCart, setAlreadyInCart] = useState(false);
  const [exclusiveSold, setExclusiveSold] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLicenses() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/licenses/${beatId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load licenses.");
        }

        const data = await response.json();

        setLicenses(data.licenses ?? []);
        setExclusiveSold(Boolean(data.exclusiveSold));

        // حالت compact عمداً لایسنس پیش‌فرض ندارد؛ کاربر باید خودش انتخاب کند.
        if (variant !== "compact" && data.licenses?.length > 0) {
          setSelectedLicense(data.licenses[0].id);
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load licenses.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadLicenses();
  }, [beatId, variant]);

  // بستن پنجره‌ی انتخاب لایسنس با Escape
  useEffect(() => {
    if (!showPicker) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowPicker(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPicker]);

  function addToCart(licenseId: string) {
    const license = licenses.find((item) => item.id === licenseId);

    if (!license) {
      return;
    }

    let existingCart: CartItem[] = [];

    try {
      const storedCart = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");

      if (Array.isArray(storedCart)) {
        existingCart = storedCart;
      }
    } catch {
      existingCart = [];
    }

    const cartItem: CartItem = {
      beatId,
      title,
      licenseId: license.id,
      licenseType: license.license_type,
      price: Number(license.discounted_price),
      originalPrice: Number(license.original_price ?? license.price),
      discountPercent: Number(license.discount_percent ?? 0),
      currency: license.currency,
      includesStems: license.includes_stems,
    };

    const alreadyExists = existingCart.some(
      (item) => item.beatId === beatId && item.licenseId === license.id,
    );

    if (alreadyExists) {
      const refreshedCart = existingCart.map((item) =>
        item.beatId === beatId && item.licenseId === license.id
          ? cartItem
          : item,
      );
      localStorage.setItem(CART_KEY, JSON.stringify(refreshedCart));
      window.dispatchEvent(new Event("cart-updated"));
      setAdded(true);
      setAlreadyInCart(true);
      setShowCartPrompt(true);
      return;
    }

    localStorage.setItem(CART_KEY, JSON.stringify([...existingCart, cartItem]));

    setAdded(true);
    setAlreadyInCart(false);
    setShowCartPrompt(true);

    window.dispatchEvent(new Event("cart-updated"));
  }

  function openPicker() {
    setSelectedLicense("");
    setAdded(false);
    setShowPicker(true);
  }

  function confirmPicker() {
    if (!selectedLicense) return;
    setShowPicker(false);
    addToCart(selectedLicense);
  }

  // ───────── حالت compact ─────────
  if (variant === "compact") {
    if (loading) {
      return (
        <div className="h-9 w-full min-w-24 animate-pulse rounded-full bg-white/10" />
      );
    }

    if (exclusiveSold || error || licenses.length === 0) {
      return (
        <button
          type="button"
          disabled
          className="flex h-9 cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-bold text-zinc-500"
        >
          {exclusiveSold ? SOLD_LABEL : UNAVAILABLE_LABEL}
        </button>
      );
    }
  }

  // ───────── حالت default ─────────
  if (variant !== "compact") {
    if (loading) {
      return (
        <div className="mt-3 text-sm text-zinc-500">
          در حال بارگذاری لایسنس‌ها…
        </div>
      );
    }

    if (exclusiveSold) {
      return (
        <button
          type="button"
          disabled
          className="mt-3 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-500"
        >
          {SOLD_LABEL}
        </button>
      );
    }

    if (error) {
      return <div className="mt-3 text-sm text-red-400">{error}</div>;
    }

    if (licenses.length === 0) {
      return (
        <div className="mt-3 text-sm text-zinc-500">لایسنسی موجود نیست.</div>
      );
    }
  }

  const selectedLicenseData = licenses.find(
    (license) => license.id === selectedLicense,
  );

  const pickerModal =
    showPicker &&
    createPortal(
      <div
        className="glass-modal-backdrop fixed inset-0 z-[60] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0"
        role="dialog"
        aria-modal="true"
        aria-label="انتخاب لایسنس"
        dir="rtl"
        onClick={() => setShowPicker(false)}
      >
        <div
          className="glass-modal w-full max-w-md rounded-2xl p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-white">انتخاب لایسنس</h2>
          <p className="mt-1 truncate text-sm text-zinc-400">{title}</p>

          <div className="mt-4 space-y-2">
            {licenses.map((license) => {
              const active = license.id === selectedLicense;
              const hasDiscount = Number(license.discount_percent) > 0;

              return (
                <button
                  key={license.id}
                  type="button"
                  onClick={() => setSelectedLicense(license.id)}
                  aria-pressed={active}
                  className={`w-full rounded-xl border p-3 text-right transition ${
                    active
                      ? "border-brand bg-brand/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold text-white"
                        dir="ltr"
                      >
                        {license.license_type}
                      </span>
                      {license.includes_stems && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">
                          شامل استمز
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2" dir="ltr">
                      {hasDiscount && (
                        <span className="text-xs text-zinc-500 line-through">
                          {formatPriceAmount(license.price)}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-white">
                        {formatPriceAmount(license.discounted_price)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="text-xs text-zinc-500">
                      {getLicenseTerms(license.license_type).tagline}
                    </p>
                    {hasDiscount && (
                      <span className="shrink-0 rounded-full bg-orange-300/15 px-2 py-0.5 text-[10px] font-bold text-orange-200">
                        {discountLabel(Number(license.discount_percent))}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={confirmPicker}
              disabled={!selectedLicense}
              className="glass-btn flex-1 rounded-xl px-4 py-3 text-sm font-bold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            >
              افزودن به سبد خرید
            </button>

            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  const cartPromptModal =
    showCartPrompt &&
    selectedLicenseData &&
    createPortal(
      <div
        className="glass-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center px-6 "
        role="dialog"
        aria-modal="true"
        aria-label="تأیید افزودن به سبد خرید"
        dir="rtl"
      >
        <div className="glass-modal w-full max-w-md rounded-2xl p-6  ">
          <div className="flex items-start gap-3">
            <div className="glass-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-ink">
              ✓
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold">
                {alreadyInCart
                  ? "قبلاً در سبد خرید بود"
                  : "بیت به سبد خرید اضافه شد"}
              </h2>

              <p className="mt-1 text-sm text-zinc-400">{title}</p>

              <div className="mt-2 space-y-1 text-xs text-zinc-500">
                <p>
                  <span dir="ltr">{selectedLicenseData.license_type}</span> ·{" "}
                  {selectedLicenseData.discount_percent > 0 && (
                    <span className="ml-1 text-zinc-500 line-through">
                      {formatPriceAmount(selectedLicenseData.price)}
                    </span>
                  )}
                  <span className="font-semibold text-white">
                    {formatPriceAmount(selectedLicenseData.discounted_price)}
                  </span>
                  {selectedLicenseData.discount_percent > 0 && (
                    <span className="mr-2 font-semibold text-orange-300">
                      {discountLabel(selectedLicenseData.discount_percent)}
                    </span>
                  )}
                </p>

                <p>
                  {getLicenseTerms(selectedLicenseData.license_type).tagline}
                  {selectedLicenseData.includes_stems ? " · شامل استمز" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="/cart"
              onClick={() => setShowCartPrompt(false)}
              className="glass-btn flex-1 rounded-xl px-4 py-3 text-center text-sm font-bold text-ink transition hover:brightness-110"
            >
              مشاهده سبد خرید
            </Link>

            <button
              type="button"
              onClick={() => setShowCartPrompt(false)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              ادامه خرید
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {variant === "compact" ? (
        <button
          type="button"
          onClick={openPicker}
          className="glass-btn flex h-9 items-center gap-2 rounded-full px-4 text-xs font-bold text-ink transition hover:brightness-110"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          {added ? "اضافه شد" : "خرید"}
        </button>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3">
            <Select
              className="min-w-0 flex-1"
              buttonClassName="rounded-xl border-white/15 bg-white/[0.04] px-3 py-3 text-white hover:border-white/30"
              ariaLabel="انتخاب لایسنس"
              value={selectedLicense}
              onChange={(next) => {
                setSelectedLicense(next);
                setAdded(false);
                setShowCartPrompt(false);
              }}
              options={licenses.map((license) => ({
                value: license.id,
                label: `${license.license_type} — ${formatPriceAmount(
                  license.discounted_price,
                )}${license.includes_stems ? " + استمز" : ""}`,
              }))}
            />

            {selectedLicenseData && (
              <div className="shrink-0 text-left">
                <p className="text-sm font-bold text-white">
                  {formatToman(selectedLicenseData.discounted_price)} تومان
                </p>
                {selectedLicenseData.discount_percent > 0 && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    <span className="line-through">
                      {formatToman(selectedLicenseData.price)}
                    </span>
                    <span className="mr-1.5 font-semibold text-orange-300">
                      {discountLabel(selectedLicenseData.discount_percent)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => addToCart(selectedLicense)}
            disabled={!selectedLicense}
            className="glass-btn mt-4 flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-bold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {added ? "اضافه شد ✓" : "خرید"}
          </button>

          {selectedLicenseData && (
            <ul className="mt-4 space-y-1 text-xs text-zinc-500">
              {resolveTerms(
                selectedLicenseData.license_type,
                selectedLicenseData.terms,
              ).map((term) => (
                <li key={term}>✓ {term}</li>
              ))}
              {selectedLicenseData.includes_stems && (
                <li>✓ پک استمز هم شامل می‌شود</li>
              )}
            </ul>
          )}
        </>
      )}

      {pickerModal}
      {cartPromptModal}
    </>
  );
}