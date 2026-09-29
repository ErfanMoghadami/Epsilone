"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type License = {
  id: string;
  license_type: string;
  price: number;
  currency: string;
  includes_stems: boolean;
};

type AddToCartButtonProps = {
  beatId: string;
  title: string;
};

type CartItem = {
  beatId: string;
  title: string;
  licenseId: string;
  licenseType: string;
  price: number;
  currency: string;
  includesStems: boolean;
};

const CART_KEY = "epsilone-cart";

export default function AddToCartButton({
  beatId,
  title,
}: AddToCartButtonProps) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [selectedLicense, setSelectedLicense] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [showCartPrompt, setShowCartPrompt] = useState(false);
  const [alreadyInCart, setAlreadyInCart] = useState(false);
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

        if (data.licenses?.length > 0) {
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
  }, [beatId]);

  function addToCart() {
    const license = licenses.find((item) => item.id === selectedLicense);

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

    const alreadyExists = existingCart.some(
      (item) => item.beatId === beatId && item.licenseId === license.id,
    );

    if (alreadyExists) {
      setAdded(true);
      setAlreadyInCart(true);
      setShowCartPrompt(true);
      return;
    }

    const cartItem: CartItem = {
      beatId,
      title,
      licenseId: license.id,
      licenseType: license.license_type,
      price: license.price,
      currency: license.currency,
      includesStems: license.includes_stems,
    };

    localStorage.setItem(CART_KEY, JSON.stringify([...existingCart, cartItem]));

    setAdded(true);
    setAlreadyInCart(false);
    setShowCartPrompt(true);

    window.dispatchEvent(new Event("cart-updated"));
  }

  if (loading) {
    return (
      <div className="mt-3 text-sm text-zinc-500">Loading licenses...</div>
    );
  }

  if (error) {
    return <div className="mt-3 text-sm text-red-400">{error}</div>;
  }

  if (licenses.length === 0) {
    return (
      <div className="mt-3 text-sm text-zinc-500">No licenses available.</div>
    );
  }

  const selectedLicenseData = licenses.find(
    (license) => license.id === selectedLicense,
  );

  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <select
          value={selectedLicense}
          onChange={(e) => {
            setSelectedLicense(e.target.value);
            setAdded(false);
            setShowCartPrompt(false);
          }}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          {licenses.map((license) => (
            <option key={license.id} value={license.id}>
              {license.license_type} — ${license.price}{" "}
              {license.includes_stems ? "— Stems included" : "— Beat only"}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={addToCart}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
        >
          {added ? "Added ✓" : "Add to Cart"}
        </button>
      </div>

      {showCartPrompt && selectedLicenseData && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Cart confirmation"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
                ✓
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-semibold">
                  {alreadyInCart
                    ? "Already in your cart"
                    : "Beat added to your cart"}
                </h2>

                <p className="mt-1 text-sm text-zinc-400">{title}</p>

                <div className="mt-2 space-y-1 text-xs text-zinc-500">
                  <p>
                    {selectedLicenseData.license_type} · $
                    {Number(selectedLicenseData.price).toFixed(2)}
                  </p>

                  <p>
                    {selectedLicenseData.includes_stems
                      ? "✓ Stems included"
                      : "Beat only · No stems"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                href="/cart"
                onClick={() => setShowCartPrompt(false)}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                View Cart
              </Link>

              <button
                type="button"
                onClick={() => setShowCartPrompt(false)}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:border-zinc-700 hover:bg-zinc-800"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
