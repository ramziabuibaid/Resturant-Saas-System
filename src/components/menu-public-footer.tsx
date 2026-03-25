import type { CSSProperties } from "react";
import { MapPinIcon, PhoneIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MenuPublicFooterProps = {
  restaurantName: string;
  footerNote: string | null;
  publicAddress: string | null;
  publicPhone1: string | null;
  publicPhone2: string | null;
  publicPhone3: string | null;
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
  publicPhone1,
  publicPhone2,
  publicPhone3,
  variant = "menu",
}: MenuPublicFooterProps) {
  const phones = normalizePhones(publicPhone1, publicPhone2, publicPhone3);
  const hasContactBlock = Boolean(
    (publicAddress && publicAddress.trim()) || phones.length
  );
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
            hasContactBlock || footerNote ? "md:grid-cols-2 lg:grid-cols-3" : "lg:grid-cols-1"
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
          </div>

          {publicAddress?.trim() ? (
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
              <p
                className={cn("mt-2 text-sm leading-relaxed whitespace-pre-wrap", shell.sub)}
                dir="auto"
              >
                {publicAddress.trim()}
              </p>
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
