import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { getRestaurantBySubdomain } from "@/lib/data/restaurants";
import { getProfile } from "@/lib/auth/current-user";
import { getSessionUser } from "@/lib/auth/session";
import { SignInForm } from "./sign-in-form";
import { googleConfigured } from "@/lib/auth/google";
import { AuthShell } from "@/components/auth/auth-shell";
import { subdomainFromHost } from "@/lib/tenant-host";

export const metadata = {
  title: "تسجيل الدخول",
  description: "تسجيل الدخول إلى لوحة التحكم",
};

const ERRORS: Record<string, string> = {
  google: "تعذّر الدخول عبر Google — حاول مرة أخرى أو استخدم البريد وكلمة المرور.",
  google_off: "الدخول عبر Google غير مفعّل بعد — استخدم البريد وكلمة المرور.",
};

/** استنتاج المطعم من السيرفر (هيدرات الـ middleware أو الـ host). */
async function resolveTenant(): Promise<{ id: string; subdomain: string } | null> {
  let tenant = await getIdentifiedRestaurant();
  if (tenant) return tenant;
  const h = await headers();
  const host = h.get("x-original-host") ?? h.get("host") ?? "";
  const sub = subdomainFromHost(host);
  if (sub) tenant = await getRestaurantBySubdomain(sub);
  return tenant;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [tenant, session, sp] = await Promise.all([resolveTenant(), getSessionUser(), searchParams]);

  if (!session) {
    return (
      <AuthShell title="تسجيل الدخول" subtitle={tenant ? "لوحة تحكم المطعم" : "أهلاً بعودتك — ادخل إلى لوحة مطعمك."}>
        <SignInForm
          tenant={tenant}
          googleEnabled={googleConfigured()}
          initialError={sp.error ? (ERRORS[sp.error] ?? null) : null}
        />
      </AuthShell>
    );
  }

  const profile = await getProfile();
  // مالك النظام → /admin؛ صاحب مطعم → /admin (لوحة المطعم)؛ غير مكتمل → إعداد المطعم
  if (profile?.role === "super_admin") redirect("/admin");
  if (profile?.restaurant_id) redirect("/admin");
  redirect("/complete-profile");
}
