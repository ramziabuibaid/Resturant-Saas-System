"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Category, GuestOrderWithDetails, MenuItem } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { resolveUnitPriceCents } from "@/lib/order-pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MenuItemImagePlaceholder } from "@/components/menu-item-image-placeholder";
import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";

const UNCATEGORIZED_FILTER = "__uncat__";

function foldForSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

function parseMajorToCents(raw: string): number | null {
  const n = parseFloat(raw.replace(",", ".").trim());
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function initialPriceOptionLabel(m: MenuItem): string {
  const opts = m.price_options;
  if (!opts || !Array.isArray(opts) || opts.length === 0) return "";
  if (opts.length === 1) return opts[0].label;
  return "";
}

function previewPriceLine(m: MenuItem, currencyCode: string): string {
  const opts = m.price_options;
  if (opts && Array.isArray(opts) && opts.length > 0) {
    const cents = opts.map((o) => o.price_cents);
    const minC = Math.min(...cents);
    const maxC = Math.max(...cents);
    if (minC === maxC) return formatMenuPrice(minC, currencyCode);
    return `من ${formatMenuPrice(minC, currencyCode)}`;
  }
  return formatMenuPrice(m.price, currencyCode);
}

type Props = {
  order: GuestOrderWithDetails;
  currencyCode: string;
  /** إن وُجد نص، يُعطّل تعديل الأصناف والخصم اليدوي */
  structureEditBlocked: string | null;
  menuItems: MenuItem[];
  categories: Category[];
  savingKey: string | null;
  onSaveNotes: (notes: string) => Promise<void>;
  onSaveDiscount: (discountCents: number) => Promise<void>;
  onAddItem: (input: {
    menuItemId: string;
    quantity: number;
    priceOptionLabel: string | null;
  }) => Promise<void>;
  onChangeQuantity: (orderItemId: string, quantity: number) => Promise<void>;
  onRemoveItem: (orderItemId: string) => Promise<void>;
};

export function OrderStaffEditor({
  order,
  currencyCode,
  structureEditBlocked,
  menuItems,
  categories,
  savingKey,
  onSaveNotes,
  onSaveDiscount,
  onAddItem,
  onChangeQuantity,
  onRemoveItem,
}: Props) {
  const [notesDraft, setNotesDraft] = useState(order.staff_notes ?? "");
  const [discountDraft, setDiscountDraft] = useState(
    String((order.owner_discount_cents ?? 0) / 100)
  );
  const [addSearch, setAddSearch] = useState("");
  const deferredSearch = useDeferredValue(addSearch);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedAdd, setSelectedAdd] = useState<MenuItem | null>(null);
  const [pickOption, setPickOption] = useState("");
  const [addQty, setAddQty] = useState("1");

  useEffect(() => {
    setNotesDraft(order.staff_notes ?? "");
  }, [order.id, order.staff_notes]);

  useEffect(() => {
    setDiscountDraft(String((order.owner_discount_cents ?? 0) / 100));
  }, [order.id, order.owner_discount_cents]);

  useEffect(() => {
    setSelectedAdd(null);
    setPickOption("");
    setAddQty("1");
    setAddSearch("");
    setCategoryFilter(null);
  }, [order.id]);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.name.localeCompare(b.name, "ar", { sensitivity: "base" })
      ),
    [categories]
  );

  const hasUncategorized = useMemo(
    () => menuItems.some((m) => !m.category_id),
    [menuItems]
  );

  const needsOption = Boolean(
    selectedAdd?.price_options &&
      Array.isArray(selectedAdd.price_options) &&
      selectedAdd.price_options.length > 0
  );

  const filteredMenuGrid = useMemo(() => {
    const qFold = foldForSearch(deferredSearch);
    let list = menuItems.slice();
    if (categoryFilter === UNCATEGORIZED_FILTER) {
      list = list.filter((m) => !m.category_id);
    } else if (categoryFilter) {
      list = list.filter((m) => m.category_id === categoryFilter);
    }
    if (qFold) {
      list = list.filter((m) => {
        const nameF = foldForSearch(m.name);
        const descF = m.description ? foldForSearch(m.description) : "";
        return nameF.includes(qFold) || descF.includes(qFold);
      });
    }
    return list;
  }, [menuItems, categoryFilter, deferredSearch]);

  async function submitNotes() {
    await onSaveNotes(notesDraft.trim());
  }

  async function submitDiscount() {
    const c = parseMajorToCents(discountDraft);
    if (c === null) return;
    await onSaveDiscount(c);
  }

  async function handleAdd() {
    if (!selectedAdd) return;
    const q = Math.max(1, Math.min(99, Math.floor(Number(addQty) || 1)));
    const resolved = resolveUnitPriceCents(selectedAdd, pickOption.trim() || null);
    if (!resolved.ok) return;
    await onAddItem({
      menuItemId: selectedAdd.id,
      quantity: q,
      priceOptionLabel: needsOption ? pickOption.trim() || null : null,
    });
    setAddSearch("");
    setSelectedAdd(null);
    setPickOption("");
    setAddQty("1");
  }

  function selectMenuCard(m: MenuItem) {
    setSelectedAdd(m);
    setPickOption(initialPriceOptionLabel(m));
    setAddQty("1");
  }

  const canStructure = !structureEditBlocked;

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-3 text-sm">
      <div>
        <p className="text-xs font-semibold text-foreground">ملاحظات داخلية (للطاقم فقط)</p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          لا تظهر في صفحة تتبّع الزبون العامة.
        </p>
        <Textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={3}
          className="text-sm"
          dir="auto"
          disabled={savingKey === "notes"}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={savingKey === "notes" || (notesDraft.trim() === (order.staff_notes ?? "").trim())}
          onClick={() => void submitNotes()}
        >
          {savingKey === "notes" ? "جاري الحفظ…" : "حفظ الملاحظات"}
        </Button>
      </div>

      <div className="border-t border-border/60 pt-3">
        <p className="text-xs font-semibold text-foreground">خصم خاص (من المطعم)</p>
        {structureEditBlocked ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{structureEditBlocked}</p>
        ) : (
          <>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-muted-foreground">المبلغ ({currencyCode})</label>
                <Input
                  dir="ltr"
                  className="tabular-nums"
                  value={discountDraft}
                  onChange={(e) => setDiscountDraft(e.target.value)}
                  disabled={savingKey === "discount"}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={savingKey === "discount"}
                onClick={() => void submitDiscount()}
              >
                {savingKey === "discount" ? "…" : "تطبيق الخصم"}
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              الحد أقصى = مجموع الأصناف الحالي. يُطرح قبل خصم الولاء عند الحساب.
            </p>
          </>
        )}
      </div>

      <div className="border-t border-border/60 pt-3">
        <p className="text-xs font-semibold text-foreground">أصناف الطلب</p>
        {structureEditBlocked ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{structureEditBlocked}</p>
        ) : null}
        <ul className="mt-2 space-y-2">
          {order.items.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2 py-2"
            >
              <span className="min-w-0 flex-1 text-sm font-medium">
                {i.menu_item_name ?? "صنف"}
                {i.price_option_label ? ` (${i.price_option_label})` : ""}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground">الكمية</span>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  className="h-8 w-14 tabular-nums"
                  dir="ltr"
                  key={`${i.id}-${i.quantity}`}
                  defaultValue={i.quantity}
                  disabled={!canStructure || savingKey === `q-${i.id}`}
                  onBlur={(e) => {
                    const n = Math.max(1, Math.min(99, Math.floor(Number(e.target.value)) || 1));
                    if (n !== i.quantity) void onChangeQuantity(i.id, n);
                  }}
                />
              </div>
              <span dir="ltr" className="text-xs tabular-nums text-muted-foreground">
                {formatMenuPrice(i.line_total_cents, currencyCode)}
              </span>
              {i.excluded_ingredients && i.excluded_ingredients.length > 0 ? (
                <p className="w-full basis-full text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">بدون: </span>
                  {i.excluded_ingredients.join("، ")}
                </p>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-destructive"
                disabled={!canStructure || order.items.length <= 1 || savingKey === `d-${i.id}`}
                aria-label="حذف الصنف"
                onClick={() => void onRemoveItem(i.id)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>

        {canStructure ? (
          <div className="mt-3 space-y-3 rounded-xl border border-dashed border-border/70 bg-background/50 p-3 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">إضافة من المنيو</p>
              {addSearch.trim() !== deferredSearch.trim() ? (
                <span className="text-[10px] text-muted-foreground">جاري البحث…</span>
              ) : null}
            </div>

            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="ابحث بالاسم أو الوصف…"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="h-10 ps-9 pe-9"
                dir="auto"
                autoComplete="off"
                inputMode="search"
                enterKeyHint="search"
                spellCheck={false}
              />
              {addSearch ? (
                <button
                  type="button"
                  className="absolute top-1/2 end-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="مسح البحث"
                  onClick={() => setAddSearch("")}
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </div>

            <div
              className="flex flex-wrap gap-2 sm:flex-nowrap sm:overflow-x-auto sm:pb-1 sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="تصفية حسب التصنيف"
            >
              <button
                type="button"
                role="tab"
                aria-selected={categoryFilter === null}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  categoryFilter === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted/80"
                )}
                onClick={() => setCategoryFilter(null)}
              >
                الكل
              </button>
              {sortedCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === c.id}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    categoryFilter === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted/80"
                  )}
                  onClick={() => setCategoryFilter(c.id)}
                >
                  {c.name}
                </button>
              ))}
              {hasUncategorized ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === UNCATEGORIZED_FILTER}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    categoryFilter === UNCATEGORIZED_FILTER
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted/80"
                  )}
                  onClick={() => setCategoryFilter(UNCATEGORIZED_FILTER)}
                >
                  بدون تصنيف
                </button>
              ) : null}
            </div>

            <div className="max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain rounded-lg border border-border/40 bg-muted/15 p-2">
              {filteredMenuGrid.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  لا توجد أصناف تطابق التصفية. جرّب تصنيفاً آخر أو امسح البحث.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredMenuGrid.map((m) => {
                    const unavailable = m.is_available === false;
                    const active = selectedAdd?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => selectMenuCard(m)}
                        className={cn(
                          "flex flex-col overflow-hidden rounded-xl border bg-background text-start shadow-sm transition-all",
                          "hover:border-primary/50 hover:shadow-md",
                          active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                          unavailable && "opacity-75"
                        )}
                      >
                        <div className="relative aspect-[4/3] w-full bg-muted">
                          {m.image_url ? (
                            <Image
                              src={m.image_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 45vw, 180px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full min-h-[5rem] w-full items-center justify-center bg-muted">
                              <MenuItemImagePlaceholder className="aspect-auto size-16 rounded-lg" />
                            </div>
                          )}
                          {unavailable ? (
                            <span className="absolute start-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                              غير متوفر
                            </span>
                          ) : null}
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-2">
                          <p className="line-clamp-2 text-[11px] font-semibold leading-snug">{m.name}</p>
                          <p
                            dir="ltr"
                            className="text-[10px] font-medium tabular-nums text-muted-foreground"
                          >
                            {previewPriceLine(m, currencyCode)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedAdd ? (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 shadow-sm">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {selectedAdd.image_url ? (
                      <Image
                        src={selectedAdd.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized
                      />
                    ) : (
                      <MenuItemImagePlaceholder className="h-full w-full rounded-none" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-semibold leading-tight">{selectedAdd.name}</p>
                    {needsOption && selectedAdd.price_options ? (
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">الحجم / السعر</label>
                        <select
                          className="h-9 w-full max-w-full rounded-md border border-input bg-background px-2 text-xs"
                          value={pickOption}
                          onChange={(e) => setPickOption(e.target.value)}
                        >
                          {selectedAdd.price_options.length > 1 ? (
                            <option value="">— اختر —</option>
                          ) : null}
                          {selectedAdd.price_options.map((o) => (
                            <option key={o.label} value={o.label}>
                              {o.label} — {formatMenuPrice(o.price_cents, currencyCode)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">الكمية</span>
                      <div className="flex items-center gap-1 rounded-lg border border-input bg-background">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          aria-label="نقص الكمية"
                          onClick={() =>
                            setAddQty(String(Math.max(1, (Math.floor(Number(addQty)) || 1) - 1)))
                          }
                        >
                          <MinusIcon className="size-3.5" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          className="h-8 w-12 border-0 bg-transparent p-0 text-center text-xs tabular-nums shadow-none focus-visible:ring-0"
                          dir="ltr"
                          value={addQty}
                          onChange={(e) => setAddQty(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          aria-label="زيادة الكمية"
                          onClick={() =>
                            setAddQty(String(Math.min(99, (Math.floor(Number(addQty)) || 1) + 1)))
                          }
                        >
                          <PlusIcon className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedAdd(null);
                      setPickOption("");
                      setAddQty("1");
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      savingKey === "add" ||
                      Boolean(
                        needsOption &&
                          selectedAdd.price_options &&
                          selectedAdd.price_options.length > 1 &&
                          !pickOption.trim()
                      )
                    }
                    onClick={() => void handleAdd()}
                  >
                    {savingKey === "add" ? "جاري الإضافة…" : "إضافة للطلب"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                اختر صنفاً من الشبكة أعلاه لضبط الكمية والحجم ثم أضفه للطلب.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
