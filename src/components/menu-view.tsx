"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const MENU_WELCOME_HINT =
  "أضف الأصناف إلى طلبك ثم أدخل جوالك لإرسال الطلب للمطعم مباشرة.";

function inferMenuBannerKind(url: string): "image" | "video" {
  const path = url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm)$/i.test(path)) return "video";
  return "image";
}

/** سطر تلميح تحت الترحيب: كتابة تدريجية + شريط تقدّم عند فتح المنيو */
function MenuWelcomeHintTyping({ text }: { text: string }) {
  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean), [text]);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= words.length) return;
    const delay =
      visible === 0 ? 400 : 48 + Math.floor(Math.random() * 56);
    const t = window.setTimeout(() => setVisible((n) => n + 1), delay);
    return () => window.clearTimeout(t);
  }, [visible, words.length]);

  const progress = words.length === 0 ? 1 : visible / words.length;

  return (
    <div className="w-full max-w-[min(100%,22rem)]">
      <span className="sr-only">{text}</span>
      <div
        dir="rtl"
        aria-hidden
        className="inline-flex min-h-[1.35em] w-full items-center justify-end gap-1.5 text-[11px] leading-relaxed text-stone-600 dark:text-stone-500"
      >
        <span className="text-right">
          {words.slice(0, visible).join(" ")}
        </span>
        {visible < words.length && (
          <span
            className="inline-block h-3.5 w-px shrink-0 animate-pulse bg-amber-600/80 dark:bg-amber-400/85"
            style={{ animationDuration: "0.85s" }}
          />
        )}
      </div>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-stone-200/85 dark:bg-stone-700/75"
        aria-hidden
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-amber-500/85 via-amber-400/75 to-amber-600/70 dark:from-amber-500/50 dark:via-amber-400/45 dark:to-amber-500/55"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        />
      </div>
    </div>
  );
}

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
  const menuBannerKindResolved: "image" | "video" | null =
    !menuBannerUrl
      ? null
      : restaurant.menu_banner_kind === "image" ||
          restaurant.menu_banner_kind === "video"
        ? restaurant.menu_banner_kind
        : inferMenuBannerKind(menuBannerUrl);

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
              <div className="flex min-w-0 flex-1 flex-col items-end sm:max-w-md sm:items-start">
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="font-medium text-amber-800 dark:text-amber-200/90"
                >
                  جاهزون لاستقبال طلبك
                </motion.span>
                <div
                  className="relative mt-1.5 h-0.5 w-full max-w-[min(100%,15rem)] overflow-hidden rounded-full bg-stone-200/75 dark:bg-stone-700/80 sm:max-w-[17rem]"
                  aria-hidden
                >
                  <motion.div
                    className="absolute inset-y-0 w-[42%] rounded-full bg-gradient-to-r from-transparent via-amber-400/85 to-transparent dark:via-amber-400/55"
                    initial={{ left: "-42%" }}
                    animate={{ left: "100%" }}
                    transition={{
                      duration: 2.35,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  />
                </div>
                <div className="mt-2 w-full">
                  <MenuWelcomeHintTyping text={MENU_WELCOME_HINT} />
                </div>
              </div>
            </div>
          </div>

          {menuBannerUrl && menuBannerKindResolved ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-100/80 shadow-lg shadow-stone-900/10 dark:border-white/10 dark:bg-stone-900/50 dark:shadow-black/40"
            >
              <div className="relative aspect-video w-full bg-stone-200/80 dark:bg-stone-950/60">
                {menuBannerKindResolved === "video" ? (
                  <video
                    src={menuBannerUrl}
                    className="absolute inset-0 h-full w-full object-cover"
                    controls
                    playsInline
                    muted
                    loop
                    autoPlay
                    preload="metadata"
                  />
                ) : (
                  <Image
                    src={menuBannerUrl}
                    alt={
                      restaurant.menu_banner_caption?.trim() ||
                      `إعلان — ${restaurant.name}`
                    }
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 896px"
                    priority
                    unoptimized
                  />
                )}
              </div>
              {restaurant.menu_banner_caption?.trim() ? (
                <p
                  dir="rtl"
                  className="border-t border-stone-200/90 bg-white/70 px-4 py-3 text-center text-sm leading-relaxed text-stone-800 dark:border-white/10 dark:bg-stone-900/70 dark:text-stone-100/95"
                >
                  {restaurant.menu_banner_caption.trim()}
                </p>
              ) : null}
            </motion.div>
          ) : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] sm:items-stretch">
            <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-gradient-to-br from-amber-500/25 via-amber-400/10 to-stone-200/80 p-5 shadow-sm shadow-stone-900/5 dark:border-white/10 dark:from-amber-500/20 dark:via-amber-400/5 dark:to-stone-900/80 dark:shadow-none sm:p-6">
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
              <div className="relative space-y-3 sm:space-y-4">
                <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-50/90 px-3 py-1 text-[11px] font-medium text-amber-900 shadow-sm shadow-amber-900/10 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100 dark:shadow-black/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(34,197,94,0.35)] dark:bg-emerald-400" />
                  اطلب الآن خلال ثوانٍ
                </p>
                <h2 className="text-balance text-xl font-semibold leading-tight tracking-tight text-stone-900 dark:text-stone-50 sm:text-2xl">
                  {heroTitle}
                </h2>
                <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-200/90 sm:text-[15px]">
                  {heroSubtitle}
                </p>
              </div>
            </div>

            {featuredItems.length > 0 && (
              <div className="relative flex flex-col overflow-hidden rounded-3xl border border-stone-200/90 bg-white/90 p-4 shadow-sm shadow-stone-900/5 dark:border-white/8 dark:bg-stone-900/80 dark:shadow-none">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                    أطباق مقترحة
                  </p>
                  <span className="text-[11px] text-stone-600 dark:text-stone-500">
                    اسحب أفقياً لاكتشاف المزيد
                  </span>
                </div>
                <div className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pe-1 ps-2">
                  {featuredItems.map((item, idx) => (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.05 }}
                      className="group relative flex w-56 shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-100 shadow-sm shadow-stone-900/10 transition-shadow duration-200 hover:shadow-lg hover:shadow-stone-900/15 dark:border-stone-700/80 dark:from-stone-900/90 dark:to-stone-950/90 dark:shadow-black/40 dark:hover:shadow-black/30"
                    >
                      {/* w-56 للبطاقة — ارتفاع صريح 14rem لضمان مربع حقيقي */}
                      <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-stone-100 dark:bg-stone-900">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                            sizes="224px"
                            unoptimized
                          />
                        ) : (
                          <MenuItemImagePlaceholder className="h-full min-h-0 w-full" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute bottom-2 right-2 flex max-w-[min(100%,11rem)] flex-col items-end gap-0.5 rounded-2xl bg-black/65 px-3 py-1.5 dark:bg-black/70">
                          <span
                            className="text-sm font-bold tabular-nums text-[var(--success)]"
                            dir="ltr"
                            style={{ unicodeBidi: "isolate" }}
                          >
                            {formatMenuPrice(getDisplayPrice(item), currencyCode)}
                          </span>
                          {secondaryCurrencyEnabled && secondaryCurrencyCode ? (
                            (() => {
                              const opts = item.price_options;
                              let sec: number | null = null;
                              if (opts && opts.length > 0) {
                                const o = opts[0];
                                sec = resolveSecondaryUnitCents(
                                  item,
                                  o.price_cents,
                                  o.label,
                                  exchangeRate
                                );
                              } else {
                                sec = resolveSecondaryUnitCents(
                                  item,
                                  item.price,
                                  null,
                                  exchangeRate
                                );
                              }
                              if (sec == null) return null;
                              return (
                                <span
                                  className="text-[11px] font-semibold tabular-nums text-white/90"
                                  dir="ltr"
                                  style={{ unicodeBidi: "isolate" }}
                                >
                                  {formatMenuPrice(sec, secondaryCurrencyCode)}
                                </span>
                              );
                            })()
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-2.5">
                        <h3 className="line-clamp-1 text-[13px] font-semibold text-stone-900 dark:text-stone-50">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-600 dark:text-stone-400">
                            {item.description}
                          </p>
                        )}
                        <AddItemButton
                          item={item}
                          unavailable={item.is_available === false}
                          onAdd={mergeAdd}
                          orderContext={addItemOrderContext}
                        />
                      </div>
                    </motion.article>
                  ))}
                </div>
              </div>
            )}
          </div>

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

