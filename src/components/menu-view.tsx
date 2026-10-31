"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BadgeCheck, MapPin, Phone, Plus, Search, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import type { Restaurant, Category, MenuItem } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { resolveSecondaryUnitCents } from "@/lib/secondary-currency";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  MenuCartBar,
  MenuCheckoutDialog,
  cartLineKey,
  type CartLine,
  type TableContext,
} from "@/components/menu-ordering";
import { MenuPublicFooter } from "@/components/menu-public-footer";
import { MenuPromoBanner } from "@/components/menu-promo-banner";
import { ItemSheet, type PriceContext } from "@/components/menu/item-sheet";

/* ------------------------------------------------------------------ */
/* أدوات                                                               */
/* ------------------------------------------------------------------ */

type Group = { id: string; name: string; items: MenuItem[] };

/** التصنيفات بترتيبها، ثم الأصناف بلا تصنيف تحت «أخرى» */
function groupItemsByCategory(menuItems: MenuItem[], categories: Category[]): Group[] {
  const byCategory = new Map<string, MenuItem[]>();
  const uncategorized: MenuItem[] = [];
  const known = new Set(categories.map((c) => c.id));
  for (const item of menuItems) {
    if (item.category_id && known.has(item.category_id)) {
      const list = byCategory.get(item.category_id) ?? [];
      list.push(item);
      byCategory.set(item.category_id, list);
    } else {
      uncategorized.push(item);
    }
  }
  const groups = categories
    .map((c) => ({ id: c.id, name: c.name, items: byCategory.get(c.id) ?? [] }))
    .filter((g) => g.items.length > 0);
  if (uncategorized.length) groups.push({ id: "other", name: "أخرى", items: uncategorized });
  return groups;
}

function minPriceCents(item: MenuItem): { cents: number; hasOptions: boolean } {
  const opts = Array.isArray(item.price_options) ? item.price_options : [];
  if (opts.length > 1) return { cents: Math.min(...opts.map((o) => o.price_cents)), hasOptions: true };
  if (opts.length === 1) return { cents: opts[0].price_cents, hasOptions: false };
  return { cents: item.price, hasOptions: false };
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ْ]/g, "") // تشكيل
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

/* ------------------------------------------------------------------ */

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
  /** false = عرض المنيو فقط بدون سلة وطلب (حسب خطة الاشتراك) */
  orderingEnabled?: boolean;
};

export function MenuView({
  restaurant,
  categories,
  menuItems,
  subdomain,
  tableFromQr = null,
  tableToken = null,
  publicTables = [],
  orderingEnabled = true,
}: MenuViewProps) {
  const currencyCode = restaurant.currency_code ?? "ILS";
  const secondaryOn = restaurant.secondary_currency_enabled === true && !!restaurant.secondary_currency_code;
  const price: PriceContext = useMemo(
    () => ({
      currencyCode,
      secondaryCode: secondaryOn ? restaurant.secondary_currency_code ?? null : null,
      exchangeRate:
        restaurant.secondary_currency_exchange_rate != null ? Number(restaurant.secondary_currency_exchange_rate) : null,
      roundStep: Number(restaurant.secondary_round_step ?? 0),
      secondaryFirst: restaurant.show_secondary_first === true,
    }),
    [
      currencyCode,
      secondaryOn,
      restaurant.secondary_currency_code,
      restaurant.secondary_currency_exchange_rate,
      restaurant.secondary_round_step,
      restaurant.show_secondary_first,
    ]
  );

  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);
  const [query, setQuery] = useState("");

  const menuById = useMemo(() => new Map(menuItems.map((i) => [i.id, i] as const)), [menuItems]);
  const addLabel = tableFromQr ? "أضف إلى الطاولة" : "أضف إلى الطلب";

  const mergeAdd = useCallback(
    (line: CartLine) => {
      setCart((prev) => {
        const i = prev.findIndex((l) => cartLineKey(l) === cartLineKey(line));
        if (i < 0) return [...prev, line];
        const copy = [...prev];
        copy[i] = { ...copy[i], quantity: Math.min(99, copy[i].quantity + line.quantity) };
        return copy;
      });
      const name = menuById.get(line.menuItemId)?.name;
      if (name) toast.success(`أُضيف: ${name}`, { duration: 1500 });
    },
    [menuById]
  );

  /** نقرة «+»: صنف بسعر واحد يُضاف مباشرة، وغير ذلك يفتح ورقة التفاصيل */
  const quickAdd = useCallback(
    (item: MenuItem) => {
      const opts = Array.isArray(item.price_options) ? item.price_options : [];
      if (opts.length > 1) return setSheetItem(item);
      mergeAdd({
        menuItemId: item.id,
        quantity: 1,
        priceOptionLabel: opts[0]?.label ?? null,
        excludedIngredients: [],
      });
    },
    [mergeAdd]
  );

  const tableCtx: TableContext = useMemo(
    () => ({ fromQr: tableFromQr, token: tableToken, publicTables }),
    [tableFromQr, tableToken, publicTables]
  );

  const groups = useMemo(() => groupItemsByCategory(menuItems, categories), [menuItems, categories]);
  const filteredGroups = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => normalize(`${i.name} ${i.description ?? ""}`).includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const featured = useMemo(
    () => menuItems.filter((i) => i.image_url && i.is_available !== false).slice(0, 8),
    [menuItems]
  );

  const bannerUrl = restaurant.menu_banner_url?.trim() ?? "";
  const bannerKind: "image" | "video" | null = bannerUrl
    ? restaurant.menu_banner_kind ?? (/\.(mp4|webm)(\?|$)/i.test(bannerUrl) ? "video" : "image")
    : null;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary" dir="rtl">
      <MenuHero restaurant={restaurant} tableLabel={tableFromQr?.label ?? null} />

      <CategoryNav groups={filteredGroups} query={query} onQuery={setQuery} />

      <main className={cn("mx-auto max-w-3xl px-4", cart.length ? "pb-36" : "pb-16")}>
        {bannerUrl && bannerKind ? (
          <MenuPromoBanner
            url={bannerUrl}
            kind={bannerKind}
            caption={restaurant.menu_banner_caption}
            alt={restaurant.menu_banner_caption?.trim() || `عرض — ${restaurant.name}`}
          />
        ) : null}

        {featured.length >= 3 && !query ? (
          <FeaturedRow items={featured} price={price} onOpen={setSheetItem} onAdd={orderingEnabled ? quickAdd : undefined} />
        ) : null}

        {menuItems.length === 0 ? (
          <EmptyState title="المنيو قيد التحضير" text="سيظهر المنيو هنا قريباً." />
        ) : filteredGroups.length === 0 ? (
          <EmptyState title="لا توجد نتائج" text={`لم نجد أطباقاً تطابق «${query}».`} />
        ) : (
          <div className="mt-6 space-y-10">
            {filteredGroups.map((g) => (
              <section key={g.id} id={`cat-${g.id}`} data-cat={g.id} className="scroll-mt-32">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-display text-2xl font-bold">{g.name}</h2>
                  <span className="text-xs text-text-muted">{g.items.length} أصناف</span>
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-[22px] border border-border bg-bg-surface">
                  {g.items.map((item) => (
                    <MenuItemRow key={item.id} item={item} price={price} onOpen={setSheetItem} onAdd={orderingEnabled ? quickAdd : undefined} />
                  ))}
                </ul>
              </section>
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

      <ItemSheet item={sheetItem} onClose={() => setSheetItem(null)} onAdd={orderingEnabled ? mergeAdd : undefined} price={price} addLabel={addLabel} />

      {orderingEnabled ? (
        <>
      <MenuCartBar
        cart={cart}
        setCart={setCart}
        menuById={menuById}
        currencyCode={currencyCode}
        secondaryEnabled={secondaryOn}
        secondaryCurrencyCode={price.secondaryCode}
        secondaryExchangeRate={price.exchangeRate}
        secondaryRoundStep={price.roundStep}
        secondaryFirst={price.secondaryFirst}
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
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* الأجزاء                                                             */
/* ------------------------------------------------------------------ */

const noopSubscribe = () => () => {};

/**
 * «الأسعار محدّثة اليوم» — يُحسب بتوقيت جهاز الزبون بعد التحميل فقط
 * (لا شيء في HTML الخادم، فلا اختلاف في الترطيب). يختفي إن مضى أكثر من أسبوع.
 */
function PricesFreshBadge({ updatedAt }: { updatedAt: string | null }) {
  const label = useSyncExternalStore(
    noopSubscribe,
    () => {
      if (!updatedAt) return null;
      const d = new Date(updatedAt);
      const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
      const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
      if (days < 0 || days > 7) return null;
      return days === 0 ? "الأسعار محدّثة اليوم" : days === 1 ? "الأسعار محدّثة أمس" : `الأسعار محدّثة ${d.toLocaleDateString("ar", { weekday: "long" })}`;
    },
    () => null
  );
  if (!label) return null;
  return (
    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
      <BadgeCheck className="size-4" />
      {label}
    </p>
  );
}

function MenuHero({ restaurant, tableLabel }: { restaurant: Restaurant; tableLabel: string | null }) {
  const cover = restaurant.hero_background_url?.trim() || null;
  const logo = restaurant.logo_url?.trim() || null;
  const phone = restaurant.public_phone_1?.trim() || null;

  return (
    <header className="relative">
      <div className="relative h-56 overflow-hidden sm:h-72">
        {cover ? (
          <Image src={cover} alt="" fill priority className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_80%_0%,color-mix(in_oklab,var(--brand)_55%,transparent),transparent_70%),linear-gradient(160deg,#2a1810,#0e0d0c)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-bg-base" />
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-3xl items-center justify-between p-4">
          {tableLabel ? (
            <span className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              {tableLabel}
            </span>
          ) : (
            <span />
          )}
          <div className="rounded-xl bg-black/30 backdrop-blur [&_.theme-toggle-btn]:border-white/20 [&_.theme-toggle-btn]:bg-transparent [&_.theme-toggle-btn]:text-white">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="relative mx-auto -mt-14 max-w-3xl px-4">
        <div className="flex items-end gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-[26px] border-4 border-bg-base bg-bg-surface shadow-lg">
            {logo ? (
              <Image src={logo} alt={restaurant.name} fill className="object-cover" sizes="96px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-brand font-display text-4xl font-bold text-white">
                {restaurant.name.trim().replace(/^(مطعم|مطاعم|مقهى|كافيه)\s+/, "").replace(/^ال/, "").charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="font-display text-[28px] font-bold leading-tight sm:text-4xl">{restaurant.name}</h1>
            {restaurant.headline ? <p className="mt-0.5 text-sm text-text-secondary">{restaurant.headline}</p> : null}
          </div>
        </div>

        {restaurant.subheadline ? (
          <p className="mt-4 text-[15px] leading-7 text-text-secondary">{restaurant.subheadline}</p>
        ) : null}

        <PricesFreshBadge updatedAt={restaurant.prices_updated_at ?? null} />

        {restaurant.public_address || phone ? (
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {restaurant.public_address ? (
              <a
                href={restaurant.public_maps_url || undefined}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-surface px-3 py-1.5 text-text-secondary"
              >
                <MapPin className="size-4 text-brand" />
                {restaurant.public_address}
              </a>
            ) : null}
            {phone ? (
              <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-surface px-3 py-1.5 text-text-secondary">
                <Phone className="size-4 text-brand" />
                <span dir="ltr">{phone}</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** شريط لاصق: بحث + تصنيفات تتبع موضع التمرير */
function CategoryNav({ groups, query, onQuery }: { groups: Group[]; query: string; onQuery: (q: string) => void }) {
  const [active, setActive] = useState<string | null>(groups[0]?.id ?? null);
  const [searching, setSearching] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("section[data-cat]")];
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.getAttribute("data-cat"));
      },
      { rootMargin: "-140px 0px -55% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [groups]);

  // إبقاء التصنيف النشط ظاهراً في الشريط
  useEffect(() => {
    chipsRef.current?.querySelector(`[data-chip="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  return (
    <nav className="sticky top-0 z-30 mt-6 border-b border-border bg-bg-base/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
        {searching ? (
          <div className="flex h-10 flex-1 items-center gap-2 rounded-full border border-border bg-bg-surface px-4">
            <Search className="size-4 shrink-0 text-text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="ابحث عن طبق…"
              className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-muted"
            />
            <button
              type="button"
              aria-label="إغلاق البحث"
              onClick={() => {
                onQuery("");
                setSearching(false);
              }}
            >
              <X className="size-4 text-text-muted" />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              aria-label="بحث"
              onClick={() => setSearching(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-surface text-text-secondary"
            >
              <Search className="size-4" />
            </button>
            <div ref={chipsRef} className="flex flex-1 gap-2 overflow-x-auto [scrollbar-width:none]">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  data-chip={g.id}
                  onClick={() => {
                    setActive(g.id);
                    document.getElementById(`cat-${g.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition",
                    active === g.id ? "bg-brand text-white" : "border border-border bg-bg-surface text-text-secondary"
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

function PriceTag({ item, price, className }: { item: MenuItem; price: PriceContext; className?: string }) {
  const { cents, hasOptions } = minPriceCents(item);
  const secondary =
    price.secondaryCode ? resolveSecondaryUnitCents(item, cents, null, price.exchangeRate, price.roundStep) : null;
  // الأحجام لها أسعار ثانية يدوية لكل حجم — «من» تعرض المحسوب من أقل سعر
  const main = formatMenuPrice(cents, price.currencyCode);
  const second = secondary != null && price.secondaryCode ? formatMenuPrice(secondary, price.secondaryCode) : null;
  const [big, small] = price.secondaryFirst && second ? [second, main] : [main, second];
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
      {hasOptions ? <span className="text-xs font-medium text-text-muted">من</span> : null}
      <span className="font-bold text-brand" dir="ltr">
        {big}
      </span>
      {small ? (
        <span className="text-xs text-text-muted" dir="ltr">
          {small}
        </span>
      ) : null}
    </span>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_6px_16px_-6px_var(--brand)] transition active:scale-90"
    >
      <Plus className="size-5" />
    </button>
  );
}

function MenuItemRow({
  item,
  price,
  onOpen,
  onAdd,
}: {
  item: MenuItem;
  price: PriceContext;
  onOpen: (i: MenuItem) => void;
  onAdd?: (i: MenuItem) => void;
}) {
  const unavailable = item.is_available === false;
  return (
    <li>
      <div
        role={unavailable ? undefined : "button"}
        tabIndex={unavailable ? -1 : 0}
        onClick={() => !unavailable && onOpen(item)}
        onKeyDown={(e) => !unavailable && (e.key === "Enter" || e.key === " ") && onOpen(item)}
        className={cn(
          "flex gap-4 p-4 text-start transition",
          unavailable ? "opacity-55" : "cursor-pointer hover:bg-bg-surface-2/60 active:bg-bg-surface-2"
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{item.name}</p>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-text-secondary">{item.description}</p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <PriceTag item={item} price={price} />
            {unavailable ? (
              <span className="rounded-full bg-bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text-muted">نفد حالياً</span>
            ) : null}
          </div>
        </div>
        <div className="relative shrink-0">
          {item.image_url ? (
            <div className="relative size-24 overflow-hidden rounded-2xl bg-bg-surface-2 sm:size-28">
              <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="112px" />
            </div>
          ) : (
            <div className="flex size-24 items-center justify-center rounded-2xl bg-bg-surface-2 text-text-muted sm:size-28">
              <UtensilsCrossed className="size-7 opacity-50" />
            </div>
          )}
          {!unavailable && onAdd ? (
            <div className="absolute -bottom-2 -start-2">
              <AddButton onClick={() => onAdd(item)} label={`أضف ${item.name}`} />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function FeaturedRow({
  items,
  price,
  onOpen,
  onAdd,
}: {
  items: MenuItem[];
  price: PriceContext;
  onOpen: (i: MenuItem) => void;
  onAdd?: (i: MenuItem) => void;
}) {
  return (
    <section className="mt-6" aria-label="أطباق مختارة">
      <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
        <Sparkles className="size-5 text-gold" /> أطباق مختارة
      </h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {items.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(item)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(item)}
            className="w-44 shrink-0 snap-start overflow-hidden rounded-[22px] border border-border bg-bg-surface text-start"
          >
            <div className="relative aspect-square">
              <Image src={item.image_url!} alt={item.name} fill className="object-cover" sizes="176px" />
              {onAdd ? (
                <div className="absolute bottom-2 start-2">
                  <AddButton onClick={() => onAdd(item)} label={`أضف ${item.name}`} />
                </div>
              ) : null}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-bold">{item.name}</p>
              <PriceTag item={item} price={price} className="mt-1 text-sm" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-10 rounded-[22px] border border-dashed border-border-strong p-10 text-center">
      <UtensilsCrossed className="mx-auto size-10 text-text-muted" />
      <p className="mt-4 font-bold">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">{text}</p>
    </div>
  );
}
