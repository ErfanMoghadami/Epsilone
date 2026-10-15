import AuthShell from "@/components/auth/AuthShell";
import { authFieldClass, authPrimaryButtonClass, authErrorClass } from "@/components/auth/authStyles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsernameAvailabilityInput from "@/components/producer/username-availability-input";
const RESERVED_USERNAMES = new Set([
  "login",
  "signup",
  "setup",
  "forgot-password",
  "beats",
  "upload",
  "settings",
]);

export default async function ProducerSetupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/producer/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "producer") {
    redirect("/producer/login");
  }

  if (profile.username) {
    redirect(`/producer/${encodeURIComponent(profile.username)}`);
  }

  async function completeProducerSetup(formData: FormData) {
    "use server";

    const usernameValue = formData.get("username");
    const passwordValue = formData.get("password");
    const confirmPasswordValue = formData.get("confirmPassword");

    const username =
      typeof usernameValue === "string"
        ? usernameValue.trim().toLowerCase()
        : "";

    const password = typeof passwordValue === "string" ? passwordValue : "";

    const confirmPassword =
      typeof confirmPasswordValue === "string" ? confirmPasswordValue : "";

    if (!/^[a-z0-9_-]{3,20}$/.test(username)) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "نام کاربری باید ۳ تا ۲۰ کاراکتر باشه و فقط شامل حروف انگلیسی، عدد، آندرلاین یا خط تیره باشه.",
        )}`,
      );
    }

    if (RESERVED_USERNAMES.has(username)) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "این نام کاربری رزرو شده. لطفاً یکی دیگه انتخاب کن.",
        )}`,
      );
    }

    if (password.length < 8) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "رمز عبور باید حداقل ۸ کاراکتر باشه.",
        )}`,
      );
    }

    if (password !== confirmPassword) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "رمزهای عبور با هم یکی نیستن.",
        )}`,
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/producer/login");
    }

    const { data: existingUsername, error: usernameLookupError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .maybeSingle();

    if (usernameLookupError) {
      console.error("Username availability check error:", usernameLookupError);

      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "بررسی در دسترس بودن نام کاربری ممکن نشد.",
        )}`,
      );
    }

    if (existingUsername) {
      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "این نام کاربری قبلاً گرفته شده.",
        )}`,
      );
    }

    // Set password first while the authenticated Google session is active.
    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      console.error("Producer password setup error:", passwordError);

      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "تنظیم رمز عبور ممکن نشد. لطفاً دوباره تلاش کن.",
        )}`,
      );
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        username,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .eq("role", "producer");

    if (profileUpdateError) {
      console.error("Producer username setup error:", profileUpdateError);

      if (profileUpdateError.code === "23505") {
        redirect(
          `/producer/setup?error=${encodeURIComponent(
            "این نام کاربری قبلاً گرفته شده.",
          )}`,
        );
      }

      redirect(
        `/producer/setup?error=${encodeURIComponent(
          "ذخیره نام کاربری ممکن نشد.",
        )}`,
      );
    }

    redirect(`/producer/${encodeURIComponent(username)}`);
  }

  const { error } = await searchParams;

  return (
    <AuthShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ep-brand-text">آهنگساز</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">تکمیل حساب پرودیوسر</h1>
        <p className="mt-3 text-sm leading-7 text-ep-muted">نام کاربری و رمز عبورت رو تنظیم کن تا پنلت آماده بشه.</p>
      </div>

      {error && <div role="alert" className={`${authErrorClass} mb-4`}>{error}</div>}

      <form action={completeProducerSetup} className="space-y-4">
        <UsernameAvailabilityInput />

        <div>
          <label htmlFor="password" className="sr-only">رمز عبور</label>
          <input id="password" name="password" type="password" dir="ltr" autoComplete="new-password" minLength={8} required placeholder="رمز عبور (حداقل ۸ کاراکتر)" className={authFieldClass} />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="sr-only">تکرار رمز عبور</label>
          <input id="confirmPassword" name="confirmPassword" type="password" dir="ltr" autoComplete="new-password" minLength={8} required placeholder="تکرار رمز عبور" className={authFieldClass} />
        </div>

        <button type="submit" className={authPrimaryButtonClass}>
          تکمیل حساب
        </button>
      </form>
    </AuthShell>
  );
}
