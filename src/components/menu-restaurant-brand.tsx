import Image from "next/image";
import { Aref_Ruqaa, Playfair_Display } from "next/font/google";
import { hasArabicScript } from "@/lib/detect-script";
import { cn } from "@/lib/utils";

const fontMenuRestaurantArabic = Aref_Ruqaa({
  variable: "--font-menu-restaurant-ar",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

const fontMenuRestaurantEnglish = Playfair_Display({
  variable: "--font-menu-restaurant-en",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export type MenuRestaurantBrandProps = {
  name: string;
  logoUrl?: string | null;
  /** يطابق `menu_title_animation_enabled` في المطعم */
  menuTitleAnimationEnabled?: boolean;
  /** للتوسعة في صفحات أخرى */
  className?: string;
};

/**
 * شعار المطعم + الاسم كما في ترويسة المنيو العامة (نفس الخطوط والزخرفة).
 */
export function MenuRestaurantBrand({
  name,
  logoUrl,
  menuTitleAnimationEnabled = false,
  className,
}: MenuRestaurantBrandProps) {
  const nameIsArabic = hasArabicScript(name);

  return (
    <div
      className={cn(
        `${fontMenuRestaurantArabic.variable} ${fontMenuRestaurantEnglish.variable}`,
        className
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {logoUrl ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-stone-200/90 bg-white/90 shadow-lg shadow-stone-900/10 dark:border-white/10 dark:bg-stone-900/60 dark:shadow-black/40 sm:h-16 sm:w-16">
            <Image
              src={logoUrl}
              alt={name}
              fill
              className="object-contain object-center"
              sizes="64px"
              priority
              unoptimized
            />
          </div>
        ) : (
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-100/80 text-stone-500 dark:border-white/15 dark:bg-stone-900/50 sm:h-16 sm:w-16"
            aria-hidden
          >
            <span className="text-xs font-medium">Logo</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-300/80">
            MENU
          </p>
          {nameIsArabic ? (
            <div className="mt-2 flex flex-col items-stretch gap-1">
              <div
                className="flex max-w-[min(100%,28rem)] items-center gap-2"
                dir="rtl"
                aria-hidden
              >
                <span className="h-px min-w-[1.5rem] flex-1 bg-gradient-to-l from-amber-400/55 to-transparent" />
                <span className="text-[11px] leading-none text-amber-400/90">✦</span>
                <span className="h-px min-w-[1.5rem] flex-1 bg-gradient-to-r from-amber-400/55 to-transparent" />
              </div>
              <h1
                dir="auto"
                className={cn(
                  "[font-family:var(--font-menu-restaurant-ar)] text-2xl font-bold leading-snug tracking-wide sm:text-[1.85rem]",
                  menuTitleAnimationEnabled
                    ? "menu-restaurant-title-animate"
                    : "text-stone-900 drop-shadow-[0_1px_8px_rgba(0,0,0,0.08)] dark:text-stone-50 dark:drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]"
                )}
              >
                {name}
              </h1>
              <div
                aria-hidden
                className="mt-0.5 h-[2px] w-28 max-w-full rounded-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
              />
            </div>
          ) : (
            <h1
              dir="ltr"
              className={cn(
                "mt-1 [font-family:var(--font-menu-restaurant-en)] text-2xl font-semibold tracking-tight sm:text-3xl sm:tracking-[0.02em]",
                menuTitleAnimationEnabled
                  ? "menu-restaurant-title-animate"
                  : "text-stone-900 dark:text-stone-50"
              )}
            >
              {name}
            </h1>
          )}
        </div>
      </div>
    </div>
  );
}
