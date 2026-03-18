import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { getSession, getProfile, getRestaurantBySubdomain } from "@/app/actions/auth";
import { LoginFormSwitch } from "./login-form-switch";

export const metadata = {
  title: "تسجيل الدخول",
  description: "تسجيل الدخول إلى لوحة التحكم",
};

type LoginMode = "username" | "email";

function subdomainFromHost(host: string): string | null {
  const withoutPort = host.split(":")[0].trim().toLowerCase();
  const parts = withoutPort.split(".");
  const first = parts[0];
  if (
    parts.length >= 2 &&
    first &&
    first !== "www" &&
    first !== "app" &&
    first !== "localhost"
  )
    return first;
  return null;
}

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

export default async function LoginPage({
}: {}) {
  // نُحدد loginMode بشكل آمن على السيرفر، ثم نقرأ mode من المتصفح داخل LoginFormSwitch.
  const mode: LoginMode = "email";

  const serverTenant = await resolveTenant();
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <LoginFormSwitch serverTenant={serverTenant} loginMode={mode} />
        </div>
      </div>
    );
  }

  const profile = await getProfile();
  // مالك النظام → /admin؛ صاحب مطعم → /admin (لوحة المطعم)؛ غير مكتمل → إعداد المطعم
  if (profile?.role === "super_admin") redirect("/admin");
  if (profile?.restaurant_id) redirect("/admin");
  redirect("/complete-profile");
}
