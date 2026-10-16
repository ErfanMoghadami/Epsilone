import Link from "next/link";
import StatusScreen, {
  statusPrimaryClass,
  statusSecondaryClass,
} from "@/components/StatusScreen";

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="این صفحه پیدا نشد"
      description="آدرسی که دنبالش بودی وجود نداره یا جابه‌جا شده. از صفحه‌ی اصلی دوباره دنبال بیتت بگرد."
    >
      <Link href="/" className={statusPrimaryClass}>
        بازگشت به خانه
      </Link>
      <Link href="/discover" className={statusSecondaryClass}>
        دیدن بیت‌ها
      </Link>
    </StatusScreen>
  );
}
