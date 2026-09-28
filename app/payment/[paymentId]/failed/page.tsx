import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-white">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
        <h1 className="text-3xl font-bold">
          Payment Failed
        </h1>

        <p className="mt-3 text-zinc-500">
          Your payment could not be completed.
        </p>

        <Link
          href="/cart"
          className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
        >
          Return to Cart
        </Link>
      </div>
    </main>
  );
}