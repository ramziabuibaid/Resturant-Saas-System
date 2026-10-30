/**
 * تحديد المطعم من اسم النطاق — مصدر واحد يستخدمه الـ middleware والصفحات و API.
 * دوال نقية بلا اعتماديات حتى تعمل في Edge runtime.
 *
 * NEXT_PUBLIC_ROOT_DOMAIN = الدومين الرئيسي للمنصة (مثل "menu.app"):
 *   menu.app / www.menu.app         → المنصة (لا مطعم)
 *   alking.menu.app                 → مطعم بنطاق فرعي "alking"
 *   alking-restaurant.com           → مطعم بدومين خاص (يُبحث عنه في custom_domain)
 *   *.vercel.app                    → معاينات Vercel = المنصة
 * محلياً: alking.localhost:3000 → "alking"
 */

export type HostTenant =
  | { kind: "platform" }
  | { kind: "subdomain"; subdomain: string }
  | { kind: "custom-domain"; domain: string };

const RESERVED_SUBDOMAINS = new Set(["www", "app", "admin", "api"]);

export function getRootDomain(): string | null {
  const raw = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase();
  return raw ? raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "").split(":")[0] : null;
}

/** يقبل "host" (مع المنفذ) أو "hostname" */
export function parseTenantHost(host: string): HostTenant {
  const hostname = host.split(":")[0].trim().toLowerCase();
  if (!hostname) return { kind: "platform" };

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    return sub && !sub.includes(".") && !RESERVED_SUBDOMAINS.has(sub)
      ? { kind: "subdomain", subdomain: sub }
      : { kind: "platform" };
  }

  if (hostname.endsWith(".vercel.app") || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return { kind: "platform" };
  }

  const root = getRootDomain();
  if (!root) {
    // بدون إعداد الدومين: أول مقطع كنطاق فرعي إن وُجد (السلوك القديم)
    const parts = hostname.split(".");
    return parts.length > 2 && !RESERVED_SUBDOMAINS.has(parts[0])
      ? { kind: "subdomain", subdomain: parts[0] }
      : { kind: "platform" };
  }

  if (hostname === root || hostname === `www.${root}`) return { kind: "platform" };
  if (hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, -(root.length + 1));
    return !sub.includes(".") && !RESERVED_SUBDOMAINS.has(sub)
      ? { kind: "subdomain", subdomain: sub }
      : { kind: "platform" };
  }
  return { kind: "custom-domain", domain: hostname.replace(/^www\./, "") };
}

/** للتوافق مع الشيفرة التي تحتاج النطاق الفرعي فقط */
export function subdomainFromHost(host: string): string | null {
  const t = parseTenantHost(host);
  return t.kind === "subdomain" ? t.subdomain : null;
}
