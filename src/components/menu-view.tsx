"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MenuItemImagePlaceholder } from "@/components/menu-item-image-placeholder";
import type { Restaurant, Category, MenuItem } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { resolveSecondaryUnitCents } from "@/lib/secondary-currency";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AddItemButton,
  MenuCartBar,
  MenuCheckoutDialog,
  cartLineKey,
  type CartLine,
  type TableContext,
} from "@/components/menu-ordering";
import { MenuRestaurantBrand } from "@/components/menu-restaurant-brand";
import { MenuPublicFooter } from "@/components/menu-public-footer";
import { MenuFeaturedStoriesBanner } from "@/components/menu-featured-stories-banner";
import { MenuPromoBanner } from "@/components/menu-promo-banner";

/** يعيد السعر المعروض للصنف (أول خيار أو السعر الواحد) */
function getDisplayPrice(item: MenuItem): number {
  const opts = item.price_options;
  if (opts && Array.isArray(opts) && opts.length > 0) return opts[0].price_cents;
  return item.price;
}

/** يعرض سطر الأسعار بعملة المطعم — أرقام إنجليزية، شعار العملة، حجم أوضح */
function PriceDisplay({
  item,
  unavailable,
  currencyCode,
  secondaryCurrencyEnabled,
  secondaryCurrencyCode,
  exchangeRate,
}: {
  item: MenuItem;
  unavailable: boolean;
  currencyCode: string;
  secondaryCurrencyEnabled: boolean;
  secondaryCurrencyCode: string | null;
  exchangeRate: number | null;
}) {
  const opts = item.price_options;
  const priceClass = unavailable
    ? "text-stone-500 dark:text-stone-500"
    : "font-bold tabular-nums text-[var(--success)]";
  if (opts && Array.isArray(opts) && opts.length > 0) {
    return (
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-base">
        {opts.map((o) => (
          <span key={o.label} className={priceClass}>
            <span className="font-medium text-stone-600 dark:text-stone-400">{o.label}:</span>{" "}
            <span className="inline-flex flex-col align-top">
              <span className="inline-block text-lg" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                {formatMenuPrice(o.price_cents, currencyCode)}
              </span>
              {secondaryCurrencyEnabled && secondaryCurrencyCode ? (
                (() => {
                  const secondary = resolveSecondaryUnitCents(
                    item,
                    o.price_cents,
                    o.label,
                    exchangeRate
                  );
                  if (secondary == null) return null;
                  return (
                    <span
                      className="inline-block text-xs font-medium text-stone-500 dark:text-stone-400"
                      dir="ltr"
                      style={{ unicodeBidi: "isolate" }}
                    >
                      {formatMenuPrice(secondary, secondaryCurrencyCode)}
                    </span>
                  );
                })()
              ) : null}
            </span>
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className={`mt-2 flex flex-col tabular-nums ${priceClass}`}>
      <span className="inline-block text-lg font-bold" dir="ltr" style={{ unicodeBidi: "isolate" }}>
        {formatMenuPrice(item.price, currencyCode)}
      </span>
      {secondaryCurrencyEnabled && secondaryCurrencyCode ? (
        (() => {
          const secondary = resolveSecondaryUnitCents(
            item,
            item.price,
            null,
            exchangeRate
          );
          if (secondary == null) return null;
          return (
            <span
              className="inline-block text-xs font-medium text-stone-500 dark:text-stone-400"
              dir="ltr"
              style={{ unicodeBidi: "isolate" }}
            >
              {formatMenuPrice(secondary, secondaryCurrencyCode)}
            </span>
          );
        })()
      ) : null}
    </div>
  );
}

/** Group menu items by category; each group has a unique id for React keys */
function groupItemsByCategory(
  menuItems: MenuItem[],
  categories: Category[]
): Array<{ id: string; name: string; items: MenuItem[] }> {
  const byId = new Map(categories.map((c) => [c.id, c.name]));
  const groupsById = new Map<string, MenuItem[]>();

  for (const item of menuItems) {
    const categoryId = item.category_id || "uncategorized";
    const categoryName =
      (item.category_id && byId.get(item.category_id)) ||
      item.category ||
      "Other";
    const key = item.category_id ?? `other-${categoryName}`;
    const list = groupsById.get(key) ?? [];
    list.push(item);
    groupsById.set(key, list);
  }

  const ordered = categories.map((c) => ({
    id: c.id,
    name: c.name,
    items: groupsById.get(c.id) ?? [],
  }));
  const uncategorized = groupsById.get("uncategorized") ?? groupsById.get("other-Other") ?? [];
  const usedIds = new Set(categories.map((c) => c.id));
  const usedNames = new Set(categories.map((c) => c.name));
  const rest = [...groupsById.entries()].filter(
    ([key, items]) =>
      items.length > 0 &&
      !usedIds.has(key) &&
      key !== "uncategorized" &&
      !key.startsWith("other-Other")
  );

  return [
    ...ordered.filter((g) => g.items.length > 0),
    ...rest.map(([id, items]) => {
      const name = categories.find((c) => c.id === id)?.name ?? id;
      return { id: `extra-${id}`, name, items };
    }),
    ...(uncategorized.length
      ? [{ id: "other-Other", name: "Other", items: uncategorized }]
      : []),
  ];
}

export type MenuViewProps = {
  restaurant: Restaurant;
  categories: Category[];
  menuItems: MenuItem[];
  /** النطاق الفرعي لإرسال الطلبات */
  subdomain: string;
  /** عند فتح المنيو من رمز QR للطاولة */
  tableFromQr?: { id: string; label: string } | null;
  /** قيمة ?t= من الرابط */
  tableToken?: string | null;
  /** طاولات المطعم لاختيار «داخل المطعم» بدون QR */
  publicTables?: { id: string; label: string }[];
};

const ALL_KEY = "__all__";

export function MenuView({
  restaurant,
  categories,
  menuItems,
  subdomain,
  tableFromQr = null,
  tableToken = null,
  publicTables = [],
}: MenuViewProps) {
  const currencyCode = restaurant.currency_code ?? "SAR";
  const secondaryCurrencyEnabled = restaurant.secondary_currency_enabled === true;
  const secondaryCurrencyCode = restaurant.secondary_currency_code ?? null;
  const exchangeRate =
    restaurant.secondary_currency_exchange_rate != null
      ? Number(restaurant.secondary_currency_exchange_rate)
      : null;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const menuById = useMemo(
    () => new Map(menuItems.map((i) => [i.id, i] as const)),
    [menuItems]
  );

  const mergeAdd = useCallback((line: CartLine) => {
    setCart((prev) => {
      const i = prev.findIndex((l) => cartLineKey(l) === cartLineKey(line));
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = {
          ...copy[i],
          quantity: Math.min(99, copy[i].quantity + line.quantity),
        };
        return copy;
      }
      return [...prev, line];
    });
  }, []);

  const tableCtx: TableContext = useMemo(
    () => ({
      fromQr: tableFromQr,
      token: tableToken,
      publicTables,
    }),
    [tableFromQr, tableToken, publicTables]
  );

  /** رابط ?t= صالح للطاولة → صياغة «إلى الطاولة»؛ وإلا زيارة عامة (سوشال، رابط مباشر…) */
  const addItemOrderContext = tableFromQr ? "table_qr" : "remote";

  const grouped = useMemo(
    () => groupItemsByCategory(menuItems, categories),
    [menuItems, categories]
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_KEY);

  const visibleGroups =
    activeCategoryId === ALL_KEY
      ? grouped
      : grouped.filter((g) => g.id === activeCategoryId);

  const featuredItems = useMemo(
    () =>
      [...menuItems]
        .filter((i) => i.image_url)
        .slice(0, 8),
    [menuItems]
  );

  const heroTitle =
    restaurant.headline || `مرحبا بك في ${restaurant.name}`;
  const heroSubtitle =
    restaurant.subheadline ||
    "تصفّح قائمتنا واختر وجبتك المفضلة في ثوانٍ.";

  const titleAnimationEnabled =
    restaurant.menu_title_animation_enabled === true;

  const menuBannerUrl = restaurant.menu_banner_url?.trim() ?? "";
  let menuBannerKind: "image" | "video" | null = null;
  if (menuBannerUrl) {
    if (
      restaurant.menu_banner_kind === "video" ||
      restaurant.menu_banner_kind === "image"
    ) {
      menuBannerKind = restaurant.menu_banner_kind;
    } else if (/\.(mp4|webm)(\?|$)/i.test(menuBannerUrl)) {
      menuBannerKind = "video";
    } else {
      menuBannerKind = "image";
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-stone-100 text-stone-900 transition-colors duration-300 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 dark:text-stone-50"
    >
      <header className="border-b border-stone-200/90 bg-gradient-to-b from-white/95 via-stone-50/95 to-stone-100/90 backdrop-blur dark:border-white/5 dark:from-stone-950/80 dark:via-stone-950/90 dark:to-stone-900/90">
        <div className="mx-auto max-w-5xl px-4 pt-5 pb-6 sm:pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <MenuRestaurantBrand
              logoUrl={restaurant.logo_url ?? null}
              name={restaurant.name}
              menuTitleAnimationEnabled={titleAnimationEnabled}
            />
            <div className="flex min-w-0 items-center gap-3 text-xs text-stone-600 sm:text-sm dark:text-stone-400">
              <ThemeToggle />
              <p
                dir="rtl"
                className="max-w-[min(100%,18rem)] text-[11px] leading-relaxed text-stone-600 dark:text-stone-500 sm:text-xs"
              >
                أضف الأصناف ثم أرسل الطلب من أسفل الصفحة.
              </p>
            </div>
          </div>

          {menuBannerUrl && menuBannerKind ? (
            <MenuPromoBanner
              url={menuBannerUrl}
              kind={menuBannerKind}
              caption={restaurant.menu_banner_caption}
              alt={
                restaurant.menu_banner_caption?.trim() ||
                `بانر ترويجي — ${restaurant.name}`
              }
            />
          ) : null}

          {featuredItems.length > 0 ? (
            <MenuFeaturedStoriesBanner
              items={featuredItems}
              currencyCode={currencyCode}
              secondaryCurrencyEnabled={secondaryCurrencyEnabled}
              secondaryCurrencyCode={secondaryCurrencyCode}
              exchangeRate={exchangeRate}
              onAdd={mergeAdd}
              orderContext={addItemOrderContext}
            />
          ) : (
            <div className="relative mt-6 overflow-hidden rounded-3xl border border-stone-200/90 bg-gradient-to-br from-amber-500/25 via-amber-400/10 to-stone-200/80 p-5 shadow-sm shadow-stone-900/5 dark:border-white/10 dark:from-amber-500/20 dark:via-amber-400/5 dark:to-stone-900/80 dark:shadow-none sm:p-6">
              {restaurant.hero_background_url && (
                <div className="pointer-events-none absolute inset-0 opacity-25">
                  <Image
                    src={restaurant.hero_background_url}
                    alt={restaurant.name}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 640px"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/88 via-stone-100/82 to-stone-50/92 dark:from-stone-950/80 dark:via-stone-900/80 dark:to-stone-950/90" />
                </div>
              )}
              <div className="relative space-y-2">
                <h2 className="text-balance text-xl font-semibold leading-tight text-stone-900 dark:text-stone-50 sm:text-2xl">
                  {heroTitle}
                </h2>
                <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-200/90 sm:text-[15px]">
                  {heroSubtitle}
                </p>
                <p className="text-xs text-stone-600 dark:text-stone-500">
                  أضف صوراً لبعض الأصناف لعرضها هنا كأطباق مقترحة.
                </p>
              </div>
            </div>
          )}

          {grouped.length > 0 && (
            <div className="mt-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-stone-200/90 bg-stone-100/90 p-2 text-xs text-stone-800 dark:border-white/10 dark:bg-stone-900/60 dark:text-stone-100">
              <button
                type="button"
                onClick={() => setActiveCategoryId(ALL_KEY)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 transition ${
                  activeCategoryId === ALL_KEY
                    ? "bg-amber-400 text-stone-950 shadow-sm shadow-amber-500/60"
                    : "bg-white text-stone-700 shadow-sm hover:bg-stone-200 dark:bg-stone-900/70 dark:text-stone-200 dark:shadow-none dark:hover:bg-stone-800"
                }`}
              >
                الكل
              </button>
              {grouped.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveCategoryId(g.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 transition ${
                    activeCategoryId === g.id
                      ? "bg-amber-400 text-stone-950 shadow-sm shadow-amber-500/60"
                      : "bg-white text-stone-700 shadow-sm hover:bg-stone-200 dark:bg-stone-900/70 dark:text-stone-200 dark:shadow-none dark:hover:bg-stone-800"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main
        className={`mx-auto max-w-5xl px-4 pt-6 sm:pt-8 ${cart.length > 0 ? "pb-32" : "pb-16"}`}
      >
        {menuItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-100/80 p-10 text-center shadow-inner shadow-stone-900/5 dark:border-stone-700/80 dark:bg-stone-900/70 dark:shadow-inner dark:shadow-black/40">
            <p className="text-base font-medium text-stone-900 dark:text-stone-100">
              لم تتم إضافة أصناف بعد.
            </p>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              عند إضافة الأصناف من لوحة التحكم ستظهر قائمتك هنا تلقائياً.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {visibleGroups.map(({ id, name, items }, groupIndex) => (
              <motion.section
                key={id}
                aria-label={name}
                className="space-y-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: groupIndex * 0.06 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500 dark:text-stone-400">
                    {name}
                  </h2>
                  <span className="text-[11px] text-stone-600 dark:text-stone-500">
                    {items.length} {items.length === 1 ? "طبق" : "أطباق"}
                  </span>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {items.map((item, index) => {
                    const unavailable = item.is_available === false;
                    return (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.04 }}
                        className={`group relative flex items-start gap-3 rounded-2xl border border-stone-200/90 bg-white/95 p-3.5 shadow-sm ring-1 ring-stone-900/5 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-lg hover:shadow-stone-900/10 dark:border-stone-700/80 dark:bg-stone-900/80 dark:ring-white/5 dark:hover:shadow-black/30 sm:gap-3.5 ${
                          unavailable
                            ? "opacity-60 grayscale-[0.2]"
                            : ""
                        }`}
                      >
                        {item.image_url ? (
                          <div className="relative h-20 w-20 shrink-0 self-start overflow-hidden rounded-[var(--radius-md)] bg-stone-100 dark:bg-stone-900 sm:h-24 sm:w-24">
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                              sizes="96px"
                              unoptimized
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-transparent" />
                          </div>
                        ) : (
                          <MenuItemImagePlaceholder className="h-20 w-20 shrink-0 self-start sm:h-24 sm:w-24" />
                        )}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p
                            className={`text-sm font-semibold ${
                              unavailable ? "text-stone-500 dark:text-stone-400" : "text-stone-900 dark:text-stone-50"
                            }`}
                          >
                            {item.name}
                            <span
                              className={`ms-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                unavailable
                                  ? "border border-red-500/35 bg-red-500/15 text-red-400"
                                  : "border border-emerald-500/35 bg-emerald-500/15 text-emerald-400"
                              }`}
                            >
                              {unavailable ? "غير متاح حالياً" : "متاح"}
                            </span>
                          </p>
                          {item.description ? (
                            <p
                              className={`mt-1 line-clamp-2 text-[12px] leading-snug ${
                                unavailable
                                  ? "text-stone-500 dark:text-stone-500"
                                  : "text-stone-600 dark:text-stone-300"
                              }`}
                            >
                              {item.description}
                            </p>
                          ) : null}
                          <PriceDisplay
                            item={item}
                            unavailable={unavailable}
                            currencyCode={currencyCode}
                            secondaryCurrencyEnabled={secondaryCurrencyEnabled}
                            secondaryCurrencyCode={secondaryCurrencyCode}
                            exchangeRate={exchangeRate}
                          />
                          {item.calories ? (
                            <p className="mt-1 text-[11px] text-stone-600 dark:text-stone-500">
                              {item.calories}
                            </p>
                          ) : null}
                          <div className="mt-auto pt-2">
                            <AddItemButton
                              item={item}
                              unavailable={unavailable}
                              onAdd={mergeAdd}
                              orderContext={addItemOrderContext}
                            />
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              </motion.section>
            ))}
          </div>
        )}
      </main>

      <MenuPublicFooter
        variant="menu"
        restaurantName={restaurant.name}
        footerNote={restaurant.footer_note ?? null}
        publicAddress={restaurant.public_address ?? null}
        publicMapsUrl={restaurant.public_maps_url ?? null}
        publicPhone1={restaurant.public_phone_1 ?? null}
        publicPhone2={restaurant.public_phone_2 ?? null}
        publicPhone3={restaurant.public_phone_3 ?? null}
        socialFacebookUrl={restaurant.social_facebook_url ?? null}
        socialInstagramUrl={restaurant.social_instagram_url ?? null}
        socialTiktokUrl={restaurant.social_tiktok_url ?? null}
      />

      <MenuCartBar
        cart={cart}
        setCart={setCart}
        menuById={menuById}
        currencyCode={currencyCode}
        secondaryEnabled={secondaryCurrencyEnabled}
        secondaryCurrencyCode={secondaryCurrencyCode}
        secondaryExchangeRate={exchangeRate}
        onCheckout={() => setCheckoutOpen(true)}
        onCancelOrder={() => {
          setCart([]);
          setCheckoutOpen(false);
        }}
      />
      <MenuCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        restaurant={restaurant}
        subdomain={subdomain}
        currencyCode={currencyCode}
        cart={cart}
        setCart={setCart}
        menuById={menuById}
        tableCtx={tableCtx}
      />
    </div>
  );
}

