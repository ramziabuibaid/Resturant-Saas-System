import type { CSSProperties } from "react";
import { MapPinIcon, PhoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeSocialUrlForHref } from "@/lib/social-url";
import {
  FacebookBrandIcon,
  InstagramBrandIcon,
  TikTokBrandIcon,
} from "@/components/social-brand-icons";

export type MenuPublicFooterProps = {
  restaurantName: string;
  footerNote: string | null;
  publicAddress: string | null;
  /** رابط Google Maps — الضغط على نص العنوان يفتح الخريطة */
  publicMapsUrl?: string | null;
  publicPhone1: string | null;
  publicPhone2: string | null;
  publicPhone3: string | null;
  socialFacebookUrl?: string | null;
  socialInstagramUrl?: string | null;
  socialTiktokUrl?: string | null;
  /** استخدم متغيرات التصميم كما في المنيو */
  variant?: "menu" | "track";
};

function normalizePhones(
  a: string | null,
  b: string | null,
  c: string | null
): string[] {
  return [a, b, c]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
}

function telHref(raw: string): string {
  const t = raw.trim();
  if (!t) return "#";
  const cleaned = t.replace(/[\s\u200e\u200f-]/g, "");
  return `tel:${cleaned}`;
}

/**
 * فوتر موحّد للمنيو العام وصفحة تتبع الطلب — عنوان، هواتف، ملاحظة، حقوق، رابط المنصة.
 */
export function MenuPublicFooter({
  restaurantName,
  footerNote,
  publicAddress,
  publicMapsUrl = null,
  publicPhone1,
  publicPhone2,
  publicPhone3,
  socialFacebookUrl = null,
  socialInstagramUrl = null,
  socialTiktokUrl = null,
  variant = "menu",
}: MenuPublicFooterProps) {
  const phones = normalizePhones(publicPhone1, publicPhone2, publicPhone3);
  const mapsHref = normalizeSocialUrlForHref(publicMapsUrl);
  const hasContactBlock = Boolean(
    (publicAddress && publicAddress.trim()) || phones.length || mapsHref
  );
  const fbHref = normalizeSocialUrlForHref(socialFacebookUrl);
  const igHref = normalizeSocialUrlForHref(socialInstagramUrl);
  const ttHref = normalizeSocialUrlForHref(socialTiktokUrl);
  const hasSocialIcons = Boolean(fbHref || igHref || ttHref);
  const year = new Date().getFullYear();

  const shell =
    variant === "menu"
      ? {
          footerClass: "border-t p-6 sm:p-8",
          footerStyle: {
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
          } as CSSProperties,
          muted: "text-[var(--text-muted)]",
          heading: "text-[var(--text-primary)]",
          sub: "text-[var(--text-secondary)]",
          link: "text-[var(--brand)]",
          borderSubtle: "border-[var(--border)]",
        }
      : {
          footerClass:
            "border-t border-stone-200/90 bg-white/80 p-6 backdrop-blur-sm dark:border-white/10 dark:bg-stone-950/50 sm:p-8",
          footerStyle: undefined as CSSProperties | undefined,
          muted: "text-stone-500 dark:text-stone-400",
          heading: "text-stone-900 dark:text-stone-50",
          sub: "text-stone-600 dark:text-stone-400",
          link: "text-amber-700 dark:text-amber-400",
          borderSubtle: "border-stone-200/90 dark:border-stone-800",
        };

  return (
    <footer className={shell.footerClass} style={shell.footerStyle}>
      <div className="mx-auto max-w-5xl">
        <div
          className={cn(
            "grid gap-8 sm:gap-10",
            hasContactBlock || footerNote?.trim() || hasSocialIcons
              ? "md:grid-cols-2 lg:grid-cols-3"
              : "lg:grid-cols-1"
          )}
        >
          <div className="min-w-0">
            <h3
              className={cn(
                "text-sm font-semibold uppercase tracking-[0.12em]",
                shell.heading
              )}
            >
              {restaurantName}
            </h3>
            {footerNote?.trim() ? (
              <p
                className={cn("mt-3 max-w-md text-sm leading-relaxed", shell.sub)}
              >
                {footerNote.trim()}
              </p>
            ) : null}
            {hasSocialIcons ? (
              <div
                className={cn(
                  "mt-4 flex flex-wrap items-center gap-3",
                  shell.sub
                )}
              >
                {fbHref ? (
                  <a
                    href={fbHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "rounded-lg p-1.5 transition-opacity hover:opacity-80",
                      shell.sub
                    )}
                    aria-label="فيسبوك"
                  >
                    <FacebookBrandIcon />
                  </a>
                ) : null}
                {igHref ? (
                  <a
                    href={igHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "rounded-lg p-1.5 transition-opacity hover:opacity-80",
                      shell.sub
                    )}
                    aria-label="إنستغرام"
                  >
                    <InstagramBrandIcon />
                  </a>
                ) : null}
                {ttHref ? (
                  <a
                    href={ttHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "rounded-lg p-1.5 transition-opacity hover:opacity-80",
                      shell.sub
                    )}
                    aria-label="تيك توك"
                  >
                    <TikTokBrandIcon />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          {publicAddress?.trim() || mapsHref ? (
            <div className="min-w-0">
              <h4
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold",
                  shell.heading
                )}
              >
                <MapPinIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                العنوان
              </h4>
              {publicAddress?.trim() ? (
                mapsHref ? (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-2 block text-sm leading-relaxed whitespace-pre-wrap transition-opacity hover:opacity-90",
                      shell.sub,
                      shell.link,
                      "underline-offset-4 hover:underline"
                    )}
                    dir="auto"
                  >
                    {publicAddress.trim()}
                  </a>
                ) : (
                  <p
                    className={cn(
                      "mt-2 text-sm leading-relaxed whitespace-pre-wrap",
                      shell.sub
                    )}
                    dir="auto"
                  >
                    {publicAddress.trim()}
                  </p>
                )
              ) : mapsHref ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-2 inline-flex text-sm font-medium transition-opacity hover:opacity-90",
                    shell.link,
                    "underline-offset-4 hover:underline"
                  )}
                >
                  عرض الموقع على الخريطة
                </a>
              ) : null}
            </div>
          ) : null}

          {phones.length > 0 ? (
            <div className="min-w-0">
              <h4
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold",
                  shell.heading
                )}
              >
                <PhoneIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                اتصل بنا
              </h4>
              <ul className="mt-2 space-y-2">
                {phones.map((p, i) => (
                  <li key={`${p}-${i}`}>
                    <a
                      href={telHref(p)}
                      className={cn(
                        "inline-flex text-sm font-medium underline-offset-4 transition-opacity hover:underline hover:opacity-90",
                        shell.sub
                      )}
                      dir="ltr"
                    >
                      {p}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-8 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between",
            shell.borderSubtle
          )}
        >
          <p className={cn("text-[13px]", shell.muted)}>
            © {year} {restaurantName} — جميع الحقوق محفوظة
          </p>
          <a
            href="https://resturant.app"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-[13px] font-semibold transition-opacity hover:opacity-90",
              shell.link
            )}
          >
            <span className={cn("font-normal", shell.muted)}>مدعوم بـ </span>
            <strong>منيو</strong>
          </a>
        </div>
      </div>
    </footer>
  );
}
