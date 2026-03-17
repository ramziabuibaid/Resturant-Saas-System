"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MenuItemImagePlaceholder } from "@/components/menu-item-image-placeholder";
import type { Restaurant, Category, MenuItem } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";

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
}: {
  item: MenuItem;
  unavailable: boolean;
  currencyCode: string;
}) {
  const opts = item.price_options;
  const priceClass = unavailable
    ? "text-stone-500"
    : "font-bold tabular-nums text-[var(--brand)] dark:text-[var(--brand-dark)]";
  if (opts && Array.isArray(opts) && opts.length > 0) {
    return (
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-base">
        {opts.map((o) => (
          <span key={o.label} className={priceClass}>
            <span className="font-medium text-stone-400">{o.label}:</span>{" "}
            <span className="inline-block text-lg" dir="ltr" style={{ unicodeBidi: "isolate" }}>
              {formatMenuPrice(o.price_cents, currencyCode)}
            </span>
          </span>
        ))}
      </div>
    );
  }
  return (
    <p className={`mt-2 text-lg font-bold tabular-nums ${priceClass}`}>
      <span className="inline-block" dir="ltr" style={{ unicodeBidi: "isolate" }}>
        {formatMenuPrice(item.price, currencyCode)}
      </span>
    </p>
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
};

const ALL_KEY = "__all__";

export function MenuView({ restaurant, categories, menuItems }: MenuViewProps) {
  const currencyCode = restaurant.currency_code ?? "SAR";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-stone-50">
      <header className="border-b border-white/5 bg-gradient-to-b from-stone-950/80 via-stone-950/90 to-stone-900/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 pt-5 pb-6 sm:pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {restaurant.logo_url ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-stone-900/60 shadow-lg shadow-black/40 sm:h-16 sm:w-16">
                  <Image
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    fill
                    className="object-contain object-center"
                    sizes="64px"
                    priority
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-stone-900/50 text-stone-500 sm:h-16 sm:w-16"
                  aria-hidden
                >
                  <span className="text-xs font-medium">Logo</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">
                  MENU
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-50 sm:text-3xl">
                  {restaurant.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-400 sm:text-sm">
              <div className="flex flex-col items-end sm:items-start">
                <span className="font-medium text-amber-200/90">
                  جاهزون لاستقبال طلبك
                </span>
                <span className="mt-0.5 text-[11px] text-stone-500">
                  اختر نوع الطعام ثم الطبق، وكل شيء يصبح أسهل.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] sm:items-stretch">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/20 via-amber-400/5 to-stone-900/80 p-5 sm:p-6">
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
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-950/80 via-stone-900/80 to-stone-950/90" />
                </div>
              )}
              <div className="relative space-y-3 sm:space-y-4">
                <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-medium text-amber-100 shadow-sm shadow-black/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(34,197,94,0.35)]" />
                  اطلب الآن خلال ثوانٍ
                </p>
                <h2 className="text-balance text-xl font-semibold leading-tight tracking-tight text-stone-50 sm:text-2xl">
                  {heroTitle}
                </h2>
                <p className="text-sm leading-relaxed text-stone-200/90 sm:text-[15px]">
                  {heroSubtitle}
                </p>
              </div>
            </div>

            {featuredItems.length > 0 && (
              <div className="relative flex flex-col overflow-hidden rounded-3xl border border-white/8 bg-stone-900/80 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    أطباق مقترحة
                  </p>
                  <span className="text-[11px] text-stone-500">
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
                      className="group relative flex w-56 shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-stone-700/80 bg-gradient-to-b from-stone-900/90 to-stone-950/90 shadow-sm shadow-black/40 transition-shadow duration-200 hover:shadow-lg hover:shadow-black/30"
                    >
                      <div className="relative w-full overflow-hidden rounded-[var(--radius-md)] bg-stone-900" style={{ aspectRatio: "4/3" }}>
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
                          <MenuItemImagePlaceholder className="h-full w-full !aspect-auto" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-3 py-1.5 text-sm font-bold tabular-nums text-[var(--brand)]" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                          {formatMenuPrice(getDisplayPrice(item), currencyCode)}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-2.5">
                        <h3 className="line-clamp-1 text-[13px] font-semibold text-stone-50">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-400">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </motion.article>
                  ))}
                </div>
              </div>
            )}
          </div>

          {grouped.length > 0 && (
            <div className="mt-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-stone-900/60 p-2 text-xs text-stone-100">
              <button
                type="button"
                onClick={() => setActiveCategoryId(ALL_KEY)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 transition ${
                  activeCategoryId === ALL_KEY
                    ? "bg-amber-400 text-stone-950 shadow-sm shadow-amber-500/60"
                    : "bg-stone-900/70 text-stone-200 hover:bg-stone-800"
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
                      : "bg-stone-900/70 text-stone-200 hover:bg-stone-800"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-8">
        {menuItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-700/80 bg-stone-900/70 p-10 text-center shadow-inner shadow-black/40">
            <p className="text-base font-medium text-stone-100">
              لم تتم إضافة أصناف بعد.
            </p>
            <p className="mt-2 text-sm text-stone-400">
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
                  <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-400">
                    {name}
                  </h2>
                  <span className="text-[11px] text-stone-500">
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
                        className={`group relative flex gap-3 rounded-2xl border border-stone-700/80 bg-stone-900/80 p-3.5 shadow-sm ring-1 ring-white/5 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-lg hover:shadow-black/30 sm:gap-3.5 ${
                          unavailable
                            ? "opacity-60 grayscale-[0.2]"
                            : ""
                        }`}
                      >
                        {item.image_url ? (
                          <div className="relative w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-stone-900 sm:w-24" style={{ aspectRatio: "4/3" }}>
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
                          <MenuItemImagePlaceholder className="w-20 shrink-0 sm:w-24" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              unavailable ? "text-stone-400" : "text-stone-50"
                            }`}
                          >
                            {item.name}
                            {unavailable && (
                              <span className="ms-2 inline-flex items-center rounded-full bg-stone-800/80 px-2 py-0.5 text-[10px] font-normal text-stone-300">
                                غير متاح حالياً
                              </span>
                            )}
                          </p>
                          {item.description ? (
                            <p
                              className={`mt-1 line-clamp-2 text-[12px] leading-snug ${
                                unavailable
                                  ? "text-stone-500"
                                  : "text-stone-300"
                              }`}
                            >
                              {item.description}
                            </p>
                          ) : null}
                          <PriceDisplay item={item} unavailable={unavailable} currencyCode={currencyCode} />
                          {item.calories ? (
                            <p className="mt-1 text-[11px] text-stone-500">
                              {item.calories}
                            </p>
                          ) : null}
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

      <footer
        className="border-t p-6"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="text-[13px]"
            style={{ color: "var(--text-muted)" }}
          >
            {restaurant.footer_note ||
              `© ${new Date().getFullYear()} ${restaurant.name} — جميع الحقوق محفوظة`}
          </p>
          <a
            href="https://resturant.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ color: "var(--brand)" }}
          >
            <span className="font-normal" style={{ color: "var(--text-muted)" }}>
              مدعوم بـ{" "}
            </span>
            <strong>منيو</strong>
          </a>
        </div>
      </footer>
    </div>
  );
}

