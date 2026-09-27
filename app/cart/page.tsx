"use client";

import { useEffect, useState } from "react";

type CartItem = {
  beatId: string;
  title: string;
  licenseId: string;
  licenseType: string;
  price: number;
  currency: string;
};

const CART_KEY = "epsilone-cart";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedCart = JSON.parse(
        localStorage.getItem(CART_KEY) ?? "[]",
      );

      setItems(Array.isArray(storedCart) ? storedCart : []);
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  function removeItem(beatId: string, licenseId: string) {
    const updatedItems = items.filter(
      (item) =>
        !(item.beatId === beatId && item.licenseId === licenseId),
    );

    setItems(updatedItems);
    localStorage.setItem(CART_KEY, JSON.stringify(updatedItems));

    window.dispatchEvent(new Event("cart-updated"));
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.price),
    0,
  );

  if (!loaded) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-zinc-500">Loading cart...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Your Cart</h1>

        <p className="mt-2 text-zinc-500">
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
          <p className="text-zinc-500">
            Your cart is empty.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.beatId}-${item.licenseId}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div>
                  <h2 className="font-semibold">
                    {item.title}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {item.licenseType}
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <span className="font-medium">
                    ${Number(item.price).toFixed(2)}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removeItem(item.beatId, item.licenseId)
                    }
                    className="text-sm text-zinc-500 transition hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">
                Total
              </span>

              <span className="text-2xl font-bold">
                ${total.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-zinc-200"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </main>
  );
}