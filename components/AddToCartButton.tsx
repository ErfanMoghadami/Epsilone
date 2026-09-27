"use client";

import { useEffect, useState } from "react";

type License = {
  id: string;
  license_type: string;
  price: number;
  currency: string;
};

type AddToCartButtonProps = {
  beatId: string;
  title: string;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLicenses() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/licenses/${beatId}`);

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
          error instanceof Error
            ? error.message
            : "Failed to load licenses.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadLicenses();
  }, [beatId]);

  function addToCart() {
    const license = licenses.find(
      (item) => item.id === selectedLicense,
    );

    if (!license) {
      return;
    }

    const existingCart = JSON.parse(
      localStorage.getItem(CART_KEY) ?? "[]",
    );

    const alreadyExists = existingCart.some(
      (item: {
        beatId: string;
        licenseId: string;
      }) =>
        item.beatId === beatId &&
        item.licenseId === license.id,
    );

    if (alreadyExists) {
      setAdded(true);
      return;
    }

    const cartItem = {
      beatId,
      title,
      licenseId: license.id,
      licenseType: license.license_type,
      price: license.price,
      currency: license.currency,
    };

    localStorage.setItem(
      CART_KEY,
      JSON.stringify([...existingCart, cartItem]),
    );

    setAdded(true);

    window.dispatchEvent(new Event("cart-updated"));
  }

  if (loading) {
    return (
      <div className="mt-3 text-sm text-zinc-500">
        Loading licenses...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (licenses.length === 0) {
    return (
      <div className="mt-3 text-sm text-zinc-500">
        No licenses available.
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <select
        value={selectedLicense}
        onChange={(e) => {
          setSelectedLicense(e.target.value);
          setAdded(false);
        }}
        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      >
        {licenses.map((license) => (
          <option key={license.id} value={license.id}>
            {license.license_type} — ${license.price}
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
  );
}