
import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main
      lang="fa"
      dir="rtl"
      className="mx-auto max-w-2xl px-6 py-16 text-white"
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-3xl text-emerald-400">
          ✓
        </div>

        <h1 className="text-3xl font-bold">
          پرداخت با موفقیت انجام شد
        </h1>

        <p className="mt-4 leading-8 text-zinc-400">
          پرداخت شما با موفقیت تأیید و سفارش شما ثبت شد.
          مجوز استفاده از بیت‌های خریداری‌شده مطابق شرایط
          ثبت‌شده در قرارداد هر سفارش فعال شده است.
        </p>

        <p className="mt-3 text-sm leading-7 text-zinc-500">
          فایل‌های خریداری‌شده و اسناد اختصاصی مجوز هر بیت
          از بخش خریدهای حساب کاربری شما در دسترس هستند.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard/purchases"
            className="inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            مشاهده خریدها
          </Link>

          <Link
            href="/discover"
            className="inline-block rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-white transition hover:bg-zinc-900"
          >
            بازگشت به بیت‌ها
          </Link>
        </div>
      </div>
    </main>
  );
}
