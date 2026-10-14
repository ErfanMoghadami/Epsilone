import {
  BEAT_LICENSE_COPY,
  BEAT_LICENSE_VERSION,
} from "@/lib/legal/beat-license";

export default function BeatLicensePage() {
  const fa = BEAT_LICENSE_COPY.fa;
  const en = BEAT_LICENSE_COPY.en;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 text-white">
      <header className="mb-12 border-b border-white/10 pb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
          EPSILONE · LEGAL
        </p>

        <h1
          lang="fa"
          dir="rtl"
          className="text-right text-3xl font-bold sm:text-4xl"
        >
          {fa.title}
        </h1>

        <p
          lang="fa"
          dir="rtl"
          className="mt-4 text-right leading-8 text-zinc-400"
        >
          {fa.intro}
        </p>

        <p className="mt-6 text-xs text-zinc-600">
          Agreement version: {BEAT_LICENSE_VERSION}
        </p>
      </header>

      <article lang="fa" dir="rtl" className="space-y-8">
        <h2 className="text-xl font-semibold">
          نسخه فارسی
        </h2>

        {fa.sections.map((section) => (
          <section
            key={section.heading}
            className="space-y-3"
          >
            <h3 className="text-lg font-semibold text-zinc-200">
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
        <h2 className="text-xl font-semibold">
          English Version
        </h2>

        <p className="leading-8 text-zinc-400">
          {en.intro}
        </p>

        {en.sections.map((section) => (
          <section
            key={section.heading}
            className="space-y-3"
          >
            <h3 className="text-lg font-semibold text-zinc-200">
              {section.heading}
            </h3>

            <p className="leading-8 text-zinc-400">
              {section.body}
            </p>
          </section>
        ))}
      </article>

      <footer className="mt-12 border-t border-white/10 pt-6">
        <p
          lang="fa"
          dir="rtl"
          className="text-right text-sm leading-7 text-zinc-500"
        >
          شرایط اختصاصی هر خرید در License Sheet همان سفارش
          ثبت می‌شود. این متن باید پیش از انتشار با مشخصات حقوقی
          واقعی Epsilone و قوانین لازم‌الاجرا تطبیق داده شود.
        </p>

        <p className="mt-3 text-sm leading-7 text-zinc-600">
          Order-specific rights and restrictions are recorded in
          each order's License Sheet. This document should be
          reviewed against Epsilone's actual legal details and
          applicable law before publication.
        </p>
      </footer>
    </main>
  );
}