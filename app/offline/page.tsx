import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-black">
          E
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          You&apos;re offline
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Epsilone needs an internet connection for this page. Reconnect and
          try again.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
