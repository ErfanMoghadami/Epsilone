"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CartItem = {
  beatId: string;
  title: string;
  licenseId: string;
  licenseType: string;
  price: number;
  currency: string;
  includesStems: boolean;
};

type Producer = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

type BeatMeta = {
  id: string;
  title: string | null;
  coverUrl: string | null;
  producer: Producer | null;
};

const CART_KEY = "epsilone-cart";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [beatMeta, setBeatMeta] = useState<Record<string, BeatMeta>>({});
  const [loaded, setLoaded] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // --------------------------------------------------------
  // Load cart
  // --------------------------------------------------------

  useEffect(() => {
    function loadCart() {
      try {
        const storedCart = JSON.parse(
          localStorage.getItem(CART_KEY) ?? "[]",
        );

        const cart = Array.isArray(storedCart) ? storedCart : [];

        setItems(cart);
      } catch {
        setItems([]);
      } finally {
        setLoaded(true);
      }
    }

    loadCart();

    const handleCartUpdated = () => {
      loadCart();
    };

    window.addEventListener("cart-updated", handleCartUpdated);
    window.addEventListener("storage", handleCartUpdated);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
      window.removeEventListener("storage", handleCartUpdated);
    };
  }, []);

  // --------------------------------------------------------
  // Load beat metadata
  // --------------------------------------------------------

  useEffect(() => {
    if (!loaded || items.length === 0) {
      setBeatMeta({});
      return;
    }

    async function loadBeatMeta() {
      try {
        setMetaLoading(true);

        const response = await fetch("/api/cart/beats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            beatIds: items.map((item) => item.beatId),
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Failed to load cart items.",
          );
        }

        const metaMap: Record<string, BeatMeta> = {};

        for (const beat of data.beats ?? []) {
          metaMap[beat.id] = beat;
        }

        setBeatMeta(metaMap);
      } catch (error) {
        console.error("Cart metadata error:", error);
      } finally {
        setMetaLoading(false);
      }
    }

    loadBeatMeta();
  }, [items, loaded]);

  // --------------------------------------------------------
  // Remove item
  // --------------------------------------------------------

  function removeItem(beatId: string, licenseId: string) {
    const updatedItems = items.filter(
      (item) =>
        !(
          item.beatId === beatId &&
          item.licenseId === licenseId
        ),
    );

    setItems(updatedItems);

    localStorage.setItem(
      CART_KEY,
      JSON.stringify(updatedItems),
    );

    setCheckoutError(null);

    window.dispatchEvent(new Event("cart-updated"));
  }

  // --------------------------------------------------------
  // Clear cart
  // --------------------------------------------------------

  function clearCart() {
    setItems([]);
    setBeatMeta({});
    setCheckoutError(null);

    localStorage.setItem(CART_KEY, "[]");

    window.dispatchEvent(new Event("cart-updated"));
  }

  // --------------------------------------------------------
  // Totals
  // --------------------------------------------------------

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + Number(item.price),
      0,
    );
  }, [items]);

  const total = subtotal;

  const currency =
    items.length > 0 ? items[0].currency : "USD";

  const hasMissingBeats = items.some(
    (item) => !beatMeta[item.beatId],
  );

  // --------------------------------------------------------
  // Checkout
  // --------------------------------------------------------

  async function handleCheckout() {
    setCheckoutError(null);

    if (items.length === 0) {
      return;
    }

    try {
      setCheckoutLoading(true);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            beatId: item.beatId,
            licenseId: item.licenseId,
          })),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setCheckoutError(
          "You need to log in before checkout.",
        );
        return;
      }

      if (!response.ok || !data.success) {
        setCheckoutError(
          data.error || "Failed to create order.",
        );
        return;
      }

      window.location.href = `/checkout/${data.orderId}`;
    } catch (error) {
      console.error("Checkout error:", error);

      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Something went wrong.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  // --------------------------------------------------------
  // Loading
  // --------------------------------------------------------

  if (!loaded) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-12 text-white sm:px-6">
        <p className="text-zinc-500">Loading cart...</p>
      </main>
    );
  }

  // --------------------------------------------------------
  // Empty cart
  // --------------------------------------------------------

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-12 text-white sm:px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Your Cart
          </h1>

          <p className="mt-2 text-zinc-500">
            Your selected beats will appear here.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-xl">
            🛒
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            Your cart is empty
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Add a beat to your cart to continue.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Find a Beat
          </Link>
        </div>
      </main>
    );
  }

  // --------------------------------------------------------
  // Cart
  // --------------------------------------------------------

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 text-white sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Your Cart
          </h1>

          <p className="mt-2 text-zinc-500">
            {items.length}{" "}
            {items.length === 1 ? "item" : "items"}
          </p>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="self-start text-sm text-zinc-500 transition hover:text-white sm:self-auto"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Items */}
        <section className="space-y-4">
          {metaLoading && (
            <div className="text-sm text-zinc-600">
              Updating beat information...
            </div>
          )}

          {items.map((item) => {
            const meta = beatMeta[item.beatId];

            const beatTitle =
              meta?.title?.trim() || item.title;

            const producerName =
              meta?.producer?.displayName?.trim() ||
              meta?.producer?.username?.trim() ||
              "Producer";

            return (
              <article
                key={`${item.beatId}-${item.licenseId}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5"
              >
                <div className="flex gap-4">
                  {/* Cover */}
                  <Link
                    href={`/beat/${item.beatId}`}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-900 sm:h-28 sm:w-28"
                  >
                    {meta?.coverUrl ? (
                      <img
                        src={meta.coverUrl}
                        alt={`${beatTitle} cover`}
                        className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                        No cover
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/beat/${item.beatId}`}
                          className="block truncate font-semibold transition hover:text-zinc-300"
                        >
                          {beatTitle}
                        </Link>

                        {meta?.producer?.username ? (
                          <Link
                            href={`/producers/${meta.producer.username}`}
                            className="mt-1 block truncate text-sm text-zinc-500 transition hover:text-white"
                          >
                            {producerName}
                          </Link>
                        ) : (
                          <p className="mt-1 truncate text-sm text-zinc-500">
                            {producerName}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            item.beatId,
                            item.licenseId,
                          )
                        }
                        aria-label={`Remove ${beatTitle} from cart`}
                        className="shrink-0 text-sm text-zinc-600 transition hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-600">
                          License
                        </p>

                        <p className="mt-1 text-sm text-zinc-300">
                          {item.licenseType}
                        </p>

                        <p
                          className={`mt-2 text-xs ${
                            item.includesStems
                              ? "text-zinc-300"
                              : "text-zinc-600"
                          }`}
                        >
                          {item.includesStems
                            ? "✓ Stems included"
                            : "Beat only · No stems"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-zinc-600">
                          Price
                        </p>

                        <p className="mt-1 font-semibold">
                          {item.currency === "USD"
                            ? "$"
                            : item.currency}{" "}
                          {Number(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-zinc-800 bg-zinc-950 p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">
            Order Summary
          </h2>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">
                Subtotal
              </span>

              <span className="font-medium">
                {currency === "USD"
                  ? "$"
                  : currency}{" "}
                {subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">
                Additional fees
              </span>

              <span className="text-zinc-400">
                $0.00
              </span>
            </div>
          </div>

          <div className="my-6 border-t border-zinc-800" />

          <div className="flex items-center justify-between">
            <span className="text-zinc-400">
              Total
            </span>

            <span className="text-2xl font-bold">
              {currency === "USD"
                ? "$"
                : currency}{" "}
              {total.toFixed(2)}
            </span>
          </div>

          {checkoutError && (
            <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
              {checkoutError}

              {checkoutError.includes("log in") && (
                <Link
                  href="/login"
                  className="mt-3 inline-block font-medium text-white underline underline-offset-4"
                >
                  Go to Login
                </Link>
              )}
            </div>
          )}

          {hasMissingBeats && (
            <div className="mt-5 rounded-xl border border-yellow-900/50 bg-yellow-950/20 p-4 text-sm text-yellow-500">
              One or more beats could not be found. Remove
              the unavailable item before checkout.
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={
              checkoutLoading ||
              metaLoading ||
              hasMissingBeats
            }
            className="mt-6 w-full rounded-xl bg-white px-5 py-3.5 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutLoading
              ? "Creating Order..."
              : "Proceed to Checkout"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-zinc-600">
            Your final order is verified against the
            current license and beat data before checkout.
          </p>
        </aside>
      </div>
    </main>
  );
}