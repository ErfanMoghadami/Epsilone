import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/currency";

import PrintLicenseButton from "./PrintLicenseButton";

type PageProps = {
  params: Promise<{
    orderItemId: string;
  }>;
};

type LegalSection = {
  heading: string;
  body: string;
};

type LicenseSheetItem = {
  beatId: string;
  beatTitle: string;
  producerId: string;
  producerName: string;
  producerUsername: string | null;
  licenseType: string;
  exclusivity: "exclusive" | "non-exclusive";
  price: number;
  currency: string;
  masterFileFormat: string;
  includesStems: boolean;
  terms: string[];
  usesCustomProducerTerms?: boolean;
};

type FrozenLicenseSheet = {
  version: string;
  documentType: string;
  generatedAt: string;
  copy: {
    fa: {
      title: string;
      intro: string;
      sections: LegalSection[];
    };
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
  items: LicenseSheetItem[];
};

type AcceptanceSnapshot = {
  version?: string;
  orderId?: string;
  buyerId?: string;
  acceptedAt?: string;
  document?: unknown;
};

type LicenseTermsSnapshot = {
  version?: string;
  licenseType?: string;
  exclusivity?: string;
  terms?: string[];
  includesStems?: boolean;
  masterFileFormat?: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  beat_id: string;
  producer_id: string;
  title_snapshot: string;
  producer_name_snapshot: string;
  unit_price: number | string;
  license_type: string;
  includes_stems: boolean;
  file_format_snapshot: string | null;
  license_terms_snapshot: LicenseTermsSnapshot | null;
};

type PaymentRecord = {
  id: string;
  gateway: string;
  transaction_id: string | null;
  amount: number | string;
  currency: string;
  paid_at: string | null;
};

type OrderRecord = {
  id: string;
  buyer_id: string;
  status: string;
  currency: string;
  total: number | string;
  created_at: string;
  paid_at: string | null;
  license_document_version: string | null;
  license_document_snapshot: unknown;
  license_accepted_at: string | null;
  license_accepted_by: string | null;
  license_acceptance_user_agent: string | null;
  license_acceptance_snapshot: unknown;
};

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;

    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, sortJson(object[key])]),
    );
  }

  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value)) ?? "";
}

function formatFaDate(value: string | null | undefined) {
  if (!value) return "ثبت نشده";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "ثبت نشده";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(date);
}

function licenseLabel(value: string) {
  switch (value) {
    case "Basic":
      return "پایه (Basic)";

    case "Premium":
      return "پیشرفته (Premium)";

    case "Exclusive":
      return "انحصاری (Exclusive)";

    default:
      return value;
  }
}

function gatewayLabel(value: string) {
  switch (value) {
    case "zarinpal":
      return "زرین‌پال";

    case "test":
      return "درگاه آزمایشی";

    default:
      return value;
  }
}

function Detail({
  label,
  value,
  direction,
}: {
  label: string;
  value: string;
  direction?: "ltr" | "rtl";
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-zinc-500 print:text-zinc-700">{label}</dt>

      <dd
        dir={direction}
        className="break-all text-sm font-medium text-zinc-200 print:text-black"
      >
        {value || "ثبت نشده"}
      </dd>
    </div>
  );
}

export default async function IndividualBeatLicensePage({ params }: PageProps) {
  const { orderItemId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Load the purchased item.
  const { data: rawItem, error: itemError } = await supabase
    .from("order_items")
    .select(
      `
      id,
      order_id,
      beat_id,
      producer_id,
      title_snapshot,
      producer_name_snapshot,
      unit_price,
      license_type,
      includes_stems,
      file_format_snapshot,
      license_terms_snapshot
    `,
    )
    .eq("id", orderItemId)
    .maybeSingle();

  if (itemError || !rawItem) {
    notFound();
  }

  const item = rawItem as OrderItem;

  // Verify that the order belongs to the authenticated Buyer.
  const { data: rawOrder, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      id,
      buyer_id,
      status,
      currency,
      total,
      created_at,
      paid_at,
      license_document_version,
      license_document_snapshot,
      license_accepted_at,
      license_accepted_by,
      license_acceptance_user_agent,
      license_acceptance_snapshot
    `,
    )
    .eq("id", item.order_id)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (orderError || !rawOrder || rawOrder.status !== "paid") {
    notFound();
  }

  const order = rawOrder as OrderRecord;

  // Only use the frozen document accepted for this exact order.
  const sheet = order.license_document_snapshot as FrozenLicenseSheet | null;

  if (
    !sheet ||
    sheet.documentType !== "beat-license" ||
    !sheet.version ||
    sheet.version !== order.license_document_version ||
    sheet.buyer?.id !== user.id ||
    !sheet.copy?.fa?.sections ||
    !Array.isArray(sheet.items)
  ) {
    notFound();
  }

  // One license per Beat is allowed in each order.
  const matchingItems = sheet.items.filter(
    (entry) =>
      entry.beatId === item.beat_id && entry.licenseType === item.license_type,
  );

  if (matchingItems.length !== 1) {
    notFound();
  }

  const license = matchingItems[0];

  // Verify that the displayed data is the same data stored
  // in the accepted order snapshot.
  const itemTerms = item.license_terms_snapshot;
  const termsMatch =
    Array.isArray(itemTerms?.terms) &&
    stableJson(itemTerms.terms) === stableJson(license.terms);

  const itemMatchesSnapshot =
    license.beatTitle === item.title_snapshot &&
    license.producerId === item.producer_id &&
    license.producerName === item.producer_name_snapshot &&
    Number(license.price) === Number(item.unit_price) &&
    license.currency === order.currency &&
    license.includesStems === item.includes_stems &&
    license.masterFileFormat ===
      (item.file_format_snapshot || "Not recorded") &&
    termsMatch &&
    itemTerms?.version === sheet.version;

  if (!itemMatchesSnapshot) {
    console.error("Purchased license snapshot mismatch:", {
      orderId: order.id,
      orderItemId: item.id,
    });

    notFound();
  }

  // Verify the exact electronic acceptance record.
  const acceptance =
    order.license_acceptance_snapshot as AcceptanceSnapshot | null;

  const acceptanceIsValid = Boolean(
    order.license_accepted_at &&
    order.license_accepted_by === user.id &&
    acceptance?.version === sheet.version &&
    acceptance?.orderId === order.id &&
    acceptance?.buyerId === user.id &&
    sameInstant(acceptance?.acceptedAt, order.license_accepted_at) &&
    stableJson(acceptance.document) === stableJson(sheet),
  );

  function sameInstant(
    a: string | null | undefined,
    b: string | null | undefined,
  ): boolean {
    if (!a || !b) return false;

    const timeA = Date.parse(a);
    const timeB = Date.parse(b);

    return Number.isFinite(timeA) && Number.isFinite(timeB) && timeA === timeB;
  }
  // Read the successful payment record after verifying Buyer ownership.
  const admin = createAdminClient();

  const { data: payments, error: paymentError } = await admin
    .from("payments")
    .select(
      `
      id,
      gateway,
      transaction_id,
      amount,
      currency,
      paid_at
    `,
    )
    .eq("order_id", order.id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1);

  if (paymentError) {
    console.error("Could not load license payment evidence:", paymentError);
  }

  const payment = (payments ?? [])[0] as PaymentRecord | undefined;

  const licenseType = licenseLabel(license.licenseType);

  const exclusivity =
    license.exclusivity === "exclusive" ? "انحصاری" : "غیرانحصاری";

  const documentReference = `EPS-${order.id}-${item.id}`;

  return (
    <main
      lang="fa"
      dir="rtl"
      className="mx-auto max-w-4xl px-5 py-8 text-white sm:px-8 sm:py-12 print:max-w-none print:bg-white print:p-0 print:text-black"
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard/purchases"
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          ← بازگشت به خریدها
        </Link>

        <PrintLicenseButton />
      </div>

      <header className="border-b border-zinc-800 pb-8 print:border-zinc-300">
        <p className="text-xs font-semibold tracking-widest text-zinc-500 print:text-zinc-700">
          EPSILONE · PURCHASE LICENSE DOCUMENT
        </p>

        <h1 className="mt-4 text-2xl font-bold leading-relaxed sm:text-3xl">
          سند اختصاصی مجوز استفاده از بیت
        </h1>

        <p className="mt-3 leading-8 text-zinc-400 print:text-black">
          این سند، مشخصات و شرایط مجوز استفاده از بیت خریداری‌شده را بر اساس
          قرارداد نسخه‌دار و اطلاعات ثابت‌شده در زمان ثبت سفارش نشان می‌دهد.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4 print:border-zinc-300 print:bg-white">
          <Detail
            label="شناسه اختصاصی سند"
            value={documentReference}
            direction="ltr"
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="شماره سفارش" value={order.id} direction="ltr" />

            <Detail label="شناسه قلم خرید" value={item.id} direction="ltr" />

            <Detail
              label="نسخه قرارداد"
              value={sheet.version}
              direction="ltr"
            />

            <Detail
              label="زمان ایجاد سند سفارش"
              value={formatFaDate(sheet.generatedAt)}
            />
          </div>
        </div>
      </header>

      <section className="mt-8 space-y-5">
        <h2 className="text-xl font-bold">۱. مشخصات طرفین</h2>

        <div className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:grid-cols-2 print:border-zinc-300 print:bg-white">
          <Detail
            label="خریدار"
            value={sheet.buyer.email || sheet.buyer.id}
            direction="ltr"
          />

          <Detail
            label="شناسه حساب خریدار"
            value={sheet.buyer.id}
            direction="ltr"
          />

          <Detail
            label="تولیدکننده / دارنده مجوز"
            value={license.producerName}
          />

          <Detail
            label="نام کاربری تولیدکننده"
            value={license.producerUsername || "ثبت نشده"}
            direction="ltr"
          />

          <Detail
            label="شناسه حساب تولیدکننده"
            value={license.producerId}
            direction="ltr"
          />
        </div>
      </section>

      <section className="mt-8 space-y-5">
        <h2 className="text-xl font-bold">۲. موضوع و مشخصات بیت</h2>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 print:border-zinc-300 print:bg-white">
          <h3 className="text-xl font-bold">{license.beatTitle}</h3>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Detail label="شناسه بیت" value={license.beatId} direction="ltr" />

            <Detail label="نوع لایسنس" value={licenseType} />

            <Detail label="ماهیت مجوز" value={exclusivity} />

            <Detail
              label="قیمت ثبت‌شده"
              value={formatMoney(license.price, license.currency)}
            />

            <Detail
              label="فرمت فایل مستر"
              value={license.masterFileFormat}
              direction="ltr"
            />

            <Detail
              label="وضعیت Stem Pack"
              value={license.includesStems ? "شامل Stems" : "بدون Stems"}
            />
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-5">
        <h2 className="text-xl font-bold">۳. حقوق و شرایط اختصاصی این بیت</h2>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 print:border-zinc-300 print:bg-white">
          <p className="mb-4 text-sm leading-7 text-zinc-400 print:text-black">
            حقوق خریدار صرفاً در محدوده لایسنس «{licenseType}» و شرایط زیر اعطا
            می‌شود. موارد زیر از نسخه ثابت‌شده در سفارش استخراج شده‌اند.
          </p>

          <ul className="list-inside list-disc space-y-3">
            {license.terms.map((term, index) => (
              <li
                key={`${item.id}-term-${index}`}
                className="text-sm leading-8 text-zinc-300 print:text-black"
              >
                {term}
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-zinc-800 pt-4 print:border-zinc-300">
            <p className="text-sm leading-8 text-zinc-400 print:text-black">
              این مجوز{" "}
              {license.exclusivity === "exclusive" ? "انحصاری" : "غیرانحصاری"}{" "}
              است. خرید لایسنس به‌تنهایی به معنای انتقال مالکیت کپی‌رایت بیت
              نیست؛ مگر آنکه توافق کتبی جداگانه‌ای برای انتقال مالکیت وجود داشته
              باشد.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-5">
        <h2 className="text-xl font-bold">۴. سوابق پرداخت</h2>

        <div className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:grid-cols-2 print:border-zinc-300 print:bg-white">
          <Detail label="وضعیت سفارش" value="پرداخت‌شده" />

          <Detail label="ارز سفارش" value={order.currency} />

          <Detail
            label="مبلغ کل سفارش"
            value={formatMoney(order.total, order.currency)}
          />

          <Detail
            label="درگاه پرداخت"
            value={payment ? gatewayLabel(payment.gateway) : "ثبت نشده"}
          />

          {payment && (
            <>
              <Detail label="شناسه پرداخت" value={payment.id} direction="ltr" />

              <Detail
                label="شناسه تراکنش / Ref ID"
                value={payment.transaction_id || "ثبت نشده"}
                direction="ltr"
              />

              <Detail
                label="مبلغ پرداخت"
                value={formatMoney(payment.amount, payment.currency)}
              />

              <Detail
                label="زمان تأیید پرداخت"
                value={formatFaDate(payment.paid_at)}
              />
            </>
          )}
        </div>
      </section>

      <section className="mt-8 space-y-5">
        <h2 className="text-xl font-bold">۵. سوابق پذیرش الکترونیکی</h2>

        <div
          className={`rounded-2xl border p-5 ${
            acceptanceIsValid
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          } print:border-zinc-300 print:bg-white`}
        >
          <p className="font-semibold">
            {acceptanceIsValid
              ? "پذیرش نسخه دقیق این قرارداد ثبت شده است."
              : "تطبیق کامل سوابق پذیرش این نسخه تأیید نشد."}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail
              label="زمان پذیرش"
              value={formatFaDate(order.license_accepted_at)}
            />

            <Detail
              label="شناسه حساب پذیرنده"
              value={order.license_accepted_by || "ثبت نشده"}
              direction="ltr"
            />

            <Detail
              label="نسخه پذیرفته‌شده"
              value={acceptance?.version || "ثبت نشده"}
              direction="ltr"
            />

            <Detail
              label="User-Agent ثبت‌شده"
              value={order.license_acceptance_user_agent || "ثبت نشده"}
              direction="ltr"
            />
          </div>
        </div>
      </section>

      <section className="mt-12 space-y-8">
        <h2 className="border-b border-zinc-800 pb-4 text-2xl font-bold print:border-zinc-300">
          ۶. متن قرارداد اصلی لایسنس بیت
        </h2>

        <p className="leading-8 text-zinc-400 print:text-black">
          {sheet.copy.fa.intro}
        </p>

        {sheet.copy.fa.sections.map((section, index) => (
          <article key={`${sheet.version}-${index}`} className="space-y-3">
            <h3 className="text-lg font-bold">{section.heading}</h3>

            <p className="text-justify leading-9 text-zinc-400 print:text-black">
              {section.body}
            </p>
          </article>
        ))}
      </section>

      <footer className="mt-12 space-y-4 border-t border-zinc-800 pt-6 print:border-zinc-300">
        <p className="text-sm leading-8 text-zinc-400 print:text-black">
          این سند از نسخه ثابت قرارداد و اطلاعات ذخیره‌شده در سفارش شماره{" "}
          <span dir="ltr" className="font-mono">
            {order.id}
          </span>{" "}
          تهیه شده است. تغییرات بعدی قیمت یا شرایط لایسنس تولیدکننده، نباید
          محتوای این سند خرید را تغییر دهد.
        </p>

        <p className="text-xs leading-7 text-zinc-600 print:text-zinc-700">
          Epsilone · Version {sheet.version}
        </p>

        <div className="print:hidden">
          <Link
            href="/dashboard/purchases"
            className="text-sm text-zinc-400 hover:text-white"
          >
            بازگشت به فهرست خریدها
          </Link>
        </div>
      </footer>
    </main>
  );
}
