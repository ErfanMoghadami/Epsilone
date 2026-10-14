import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

type LegalSection = {
  heading: string;
  body: string;
};

type LegalLanguageCopy = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

type SheetItem = {
  beatId: string;
  beatTitle: string;
  producerName: string;
  producerUsername: string | null;
  licenseType: string;
  exclusivity: "exclusive" | "non-exclusive";
  price: number;
  currency: string;
  masterFileFormat: string;
  includesStems: boolean;
  terms: string[];
};

type FrozenLicenseSheet = {
  version: string;
  documentType: string;
  generatedAt: string;
  copy: {
    fa: LegalLanguageCopy;
    en: LegalLanguageCopy;
  };
  buyer: {
    id: string;
    email: string | null;
  };
  order: {
    currency: string;
    subtotal: number;
    total: number;
  };
  items: SheetItem[];
};

export default async function OrderLicenseSheetPage({
  params,
}: PageProps) {
  const { orderId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      buyer_id,
      status,
      created_at,
      license_document_version,
      license_document_snapshot
    `)
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (error || !order) {
    notFound();
  }

  const sheet =
    order.license_document_snapshot as
      | FrozenLicenseSheet
      | null;

  if (
    !sheet ||
    sheet.documentType !== "beat-license" ||
    !sheet.version ||
    sheet.version !== order.license_document_version ||
    !sheet.copy?.fa?.sections ||
    !sheet.copy?.en?.sections ||
    !Array.isArray(sheet.items) ||
    sheet.items.length === 0
  ) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-white">
      <header className="mb-10 border-b border-white/10 pb-8">
        <Link
          href={`/checkout/${order.id}`}
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Back to Checkout
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-zinc-600">
          EPSILONE · ORDER LICENSE SHEET
        </p>

        <h1
          lang="fa"
          dir="rtl"
          className="mt-3 text-right text-3xl font-bold"
        >
          {sheet.copy.fa.title}
        </h1>

        <p className="mt-4 text-right leading-8 text-zinc-400">
          {sheet.copy.fa.intro}
        </p>

        <div className="mt-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm sm:grid-cols-2">
          <p className="break-all text-zinc-400">
            Order ID: <span className="text-white">{order.id}</span>
          </p>

          <p className="text-zinc-400">
            Version: <span className="text-white">{sheet.version}</span>
          </p>

          <p className="break-all text-zinc-400">
            Buyer: <span className="text-white">{sheet.buyer.email ?? sheet.buyer.id}</span>
          </p>

          <p className="text-zinc-400">
            Created:{" "}
            <span className="text-white">
              {new Date(sheet.generatedAt).toLocaleString()}
            </span>
          </p>
        </div>
      </header>

      <section className="mb-12 space-y-5">
        <h2 className="text-xl font-semibold">
          جزئیات لایسنس‌های این سفارش
        </h2>

        {sheet.items.map((item, index) => (
          <article
            key={`${item.beatId}-${index}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <h3 className="text-lg font-semibold">
              {item.beatTitle}
            </h3>

            <div className="mt-3 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
              <p>Producer: {item.producerName}</p>
              <p>License: {item.licenseType}</p>
              <p>
                Rights:{" "}
                {item.exclusivity === "exclusive"
                  ? "Exclusive"
                  : "Non-exclusive"}
              </p>
              <p>Master format: {item.masterFileFormat}</p>
              <p>
                Stems: {item.includesStems ? "Included" : "Not included"}
              </p>
              <p>
                Price: {item.currency}{" "}
                {Number(item.price).toFixed(2)}
              </p>
            </div>

            <div className="mt-5 border-t border-zinc-800 pt-4">
              <h4 className="mb-3 text-sm font-semibold">
                Terms for this license
              </h4>

              <ul className="space-y-2">
                {item.terms.map((term, termIndex) => (
                  <li
                    key={`${item.beatId}-term-${termIndex}`}
                    className="text-sm leading-6 text-zinc-400"
                  >
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>

      <article lang="fa" dir="rtl" className="space-y-8">
        <h2 className="text-2xl font-bold">
          متن کامل قرارداد — فارسی
        </h2>

        {sheet.copy.fa.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h3 className="text-lg font-semibold">
              {section.heading}
            </h3>

            <p className="text-right leading-8 text-zinc-400">
              {section.body}
            </p>
          </section>
        ))}
      </article>

      <div className="my-12 border-t border-white/10" />

      <article lang="en" className="space-y-8">
        <h2 className="text-2xl font-bold">
          Full Agreement — English
        </h2>

        <p className="leading-8 text-zinc-400">
          {sheet.copy.en.intro}
        </p>

        {sheet.copy.en.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h3 className="text-lg font-semibold">
              {section.heading}
            </h3>

            <p className="leading-8 text-zinc-400">
              {section.body}
            </p>
          </section>
        ))}
      </article>

      <footer className="mt-12 border-t border-white/10 pt-6">
        <p className="text-sm leading-7 text-zinc-500">
          This is the frozen License Sheet associated with the
          order shown above. Its version and terms should remain
          unchanged if the general agreement is updated later.
        </p>
      </footer>
    </main>
  );
}