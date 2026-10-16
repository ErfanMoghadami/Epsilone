"use client";

import Link from "next/link";
import { useEffect } from "react";
import StatusScreen, {
  statusPrimaryClass,
  statusSecondaryClass,
} from "@/components/StatusScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="ERROR"
      title="یه چیزی اشتباه پیش رفت"
      description="مشکلی پیش اومد و این صفحه بارگذاری نشد. یه بار دیگه امتحان کن؛ اگه درست نشد، به صفحه‌ی اصلی برگرد."
      detail={
        process.env.NODE_ENV === "development"
          ? `${error.message}${error.digest ? `\n(digest: ${error.digest})` : ""}`
          : undefined
      }
    >
      <button type="button" onClick={() => reset()} className={statusPrimaryClass}>
        تلاش دوباره
      </button>
      <Link href="/" className={statusSecondaryClass}>
        بازگشت به خانه
      </Link>
    </StatusScreen>
  );
}
