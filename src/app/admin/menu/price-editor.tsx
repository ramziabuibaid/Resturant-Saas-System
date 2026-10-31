"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PercentIcon, TableIcon } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { bulkAdjustPrices, bulkSetPrices } from "@/app/actions/pricing";
import { formatMenuPrice } from "@/lib/currencies";
import type { Category, MenuItem, PriceOption } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const QUICK_PERCENTS = [5, 10, 15, 20, -5, -10];
const ROUND_TO = [0, 0.05, 0.1, 0.25, 0.5, 1, 5, 10, 50, 100, 500, 1000];

const toMoney = (cents: number) => (cents / 100).toFixed(2).replace(/\.00$/, "");
function toCents(v: string): number | null {
  const n = Number(v.replace(",", ".").trim());
  return v.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** نفس حساب الخادم في bulkAdjustPrices — للمعاينة فقط */
function previewScale(cents: number, percent: number, roundTo: number) {
  const v = Math.round(cents * (1 + percent / 100));
  const r = Math.round(roundTo * 100);
  return Math.max(0, r > 0 ? Math.max(r, Math.round(v / r) * r) : v);
}

/** ورقة تعديل الأسعار: رفع/خفض بنسبة، أو جدول لتعديل كل الأسعار في شاشة واحدة */
export function PriceEditor({
  open,
  onClose,
  items,
  categories,
  currencyCode,
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  categories: Category[];
  currencyCode: string;
}) {
  const [tab, setTab] = useState<"percent" | "table">("percent");
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-full max-w-lg gap-0 bg-bg-surface p-0 sm:max-w-lg">
        <div className="flex h-full flex-col" dir="rtl">
          <div className="space-y-3 border-b border-border px-5 py-4">
            <div>
              <SheetTitle className="font-display text-xl font-bold">تعديل الأسعار</SheetTitle>
              <SheetDescription className="text-xs text-text-muted">التغييرات تظهر في المنيو فوراً</SheetDescription>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-bg-surface-2 p-1 text-sm font-semibold">
              {(
                [
                  ["percent", "بنسبة مئوية", PercentIcon],
                  ["table", "جدول الأسعار", TableIcon],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 rounded-lg transition",
                    tab === id ? "bg-bg-surface shadow-sm" : "text-text-muted"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          {open ? (
            tab === "percent" ? (
              <PercentPanel items={items} categories={categories} currencyCode={currencyCode} onDone={onClose} />
            ) : (
              <TablePanel items={items} categories={categories} currencyCode={currencyCode} onDone={onClose} />
            )
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PercentPanel({
  items,
  categories,
  currencyCode,
  onDone,
}: {
  items: MenuItem[];
  categories: Category[];
  currencyCode: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<string>("all");
  const [percent, setPercent] = useState("10");
  const [roundTo, setRoundTo] = useState(0);

  const pct = Number(percent.replace(",", "."));
  const validPct = Number.isFinite(pct) && pct !== 0 && pct >= -90 && pct <= 500;
  const affected = scope === "all" ? items : items.filter((i) => i.category_id === scope);

  return (
    <>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-bold">على أي أصناف؟</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-bg-base px-3 text-[15px]"
          >
            <option value="all">كل المنيو ({items.length} صنف)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({items.filter((i) => i.category_id === c.id).length})
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <span className="text-sm font-bold">نسبة التغيير</span>
          <div className="flex items-center gap-2" dir="ltr">
            <input
              value={percent}
              onChange={(e) => setPercent(e.target.value.replace(/[^0-9.,-]/g, ""))}
              inputMode="decimal"
              aria-label="النسبة"
              className="h-14 w-32 rounded-xl border border-border bg-bg-base px-4 text-center font-display text-3xl font-bold tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <span className="font-display text-2xl font-bold text-text-muted">%</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PERCENTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setPercent(String(q))}
                className={cn(
                  "h-8 rounded-lg px-3 text-xs font-bold tabular-nums transition",
                  pct === q ? "bg-brand text-white" : "bg-bg-surface-2 text-text-secondary"
                )}
                dir="ltr"
              >
                {q > 0 ? `+${q}` : q}%
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-bold">تقريب الأسعار الجديدة</span>
          <select
            value={roundTo}
            onChange={(e) => setRoundTo(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-border bg-bg-base px-3 text-[15px]"
          >
            {ROUND_TO.map((r) => (
              <option key={r} value={r}>
                {r === 0 ? "بدون تقريب" : `لأقرب ${formatMenuPrice(Math.round(r * 100), currencyCode)}`}
              </option>
            ))}
          </select>
        </label>

        {validPct && affected.length ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-text-muted">معاينة</p>
            <ul className="divide-y divide-border rounded-xl border border-border text-sm">
              {affected.slice(0, 6).map((i) => {
                const base = i.price_options?.length ? i.price_options[0].price_cents : i.price;
                return (
                  <li key={i.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate font-semibold">{i.name}</span>
                    <span className="text-xs text-text-muted line-through tabular-nums" dir="ltr">
                      {formatMenuPrice(base, currencyCode)}
                    </span>
                    <span className="font-bold text-brand tabular-nums" dir="ltr">
                      {formatMenuPrice(previewScale(base, pct, roundTo), currencyCode)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {affected.length > 6 ? <p className="text-xs text-text-muted">و {affected.length - 6} أصناف أخرى…</p> : null}
          </div>
        ) : null}
      </div>
      <div className="border-t border-border p-4">
        <button
          type="button"
          disabled={pending || !validPct || affected.length === 0}
          onClick={() =>
            startTransition(async () => {
              const res = await bulkAdjustPrices({ categoryId: scope === "all" ? null : scope, percent: pct, roundTo });
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success(`تعدّلت أسعار ${res.updated} صنف`);
              router.refresh();
              onDone();
            })
          }
          className="h-12 w-full rounded-xl bg-brand text-[15px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "جارٍ التطبيق…" : `طبّق ${validPct ? `${pct > 0 ? "+" : ""}${pct}%` : ""} على ${affected.length} صنف`}
        </button>
      </div>
    </>
  );
}

type Draft = { price?: string; options?: string[] };

function TablePanel({
  items,
  categories,
  currencyCode,
  onDone,
}: {
  items: MenuItem[];
  categories: Category[];
  currencyCode: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const groups = useMemo(() => {
    const byCat = new Map<string | null, MenuItem[]>();
    for (const i of items) byCat.set(i.category_id ?? null, [...(byCat.get(i.category_id ?? null) ?? []), i]);
    return [
      ...categories.map((c) => ({ id: c.id, name: c.name, items: byCat.get(c.id) ?? [] })),
      { id: "none", name: "بدون تصنيف", items: byCat.get(null) ?? [] },
    ].filter((g) => g.items.length);
  }, [items, categories]);

  // التعديلات الصالحة فقط، وبما يختلف عن السعر الحالي
  const changes = useMemo(() => {
    const out: { id: string; price?: number; priceOptions?: PriceOption[] }[] = [];
    let invalid = false;
    for (const i of items) {
      const d = drafts[i.id];
      if (!d) continue;
      if (i.price_options?.length && d.options) {
        const parsed = i.price_options.map((o, idx) => (d.options![idx] == null ? o.price_cents : toCents(d.options![idx])));
        if (parsed.some((c) => c == null)) {
          invalid = true;
          continue;
        }
        const opts = i.price_options.map((o, idx) => ({ label: o.label, price_cents: parsed[idx]! }));
        if (opts.some((o, idx) => o.price_cents !== i.price_options![idx].price_cents)) out.push({ id: i.id, priceOptions: opts });
      } else if (d.price != null) {
        const c = toCents(d.price);
        if (c == null) invalid = true;
        else if (c !== i.price) out.push({ id: i.id, price: c });
      }
    }
    return { rows: out, invalid };
  }, [drafts, items]);

  const inputCls =
    "h-9 w-24 rounded-lg border border-border bg-bg-base px-2 text-end text-sm font-semibold tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {groups.map((g) => (
          <section key={g.id}>
            <p className="mb-1.5 text-xs font-bold text-text-muted">{g.name}</p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {g.items.map((i) => {
                const d = drafts[i.id] ?? {};
                return (
                  <li key={i.id} className="px-3 py-2">
                    {i.price_options?.length ? (
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold">{i.name}</p>
                        {i.price_options.map((o, idx) => (
                          <div key={o.label} className="flex items-center justify-between gap-2 ps-3">
                            <span className="text-xs text-text-secondary">{o.label}</span>
                            <input
                              value={d.options?.[idx] ?? toMoney(o.price_cents)}
                              onChange={(e) => {
                                const options = [...(d.options ?? i.price_options!.map((x) => toMoney(x.price_cents)))];
                                options[idx] = e.target.value.replace(/[^0-9.,]/g, "");
                                setDrafts((s) => ({ ...s, [i.id]: { ...d, options } }));
                              }}
                              inputMode="decimal"
                              aria-label={`سعر ${i.name} ${o.label}`}
                              className={inputCls}
                              dir="ltr"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{i.name}</span>
                        <input
                          value={d.price ?? toMoney(i.price)}
                          onChange={(e) =>
                            setDrafts((s) => ({ ...s, [i.id]: { ...d, price: e.target.value.replace(/[^0-9.,]/g, "") } }))
                          }
                          inputMode="decimal"
                          aria-label={`سعر ${i.name}`}
                          className={inputCls}
                          dir="ltr"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <p className="text-[11px] text-text-muted">الأسعار بـ{formatMenuPrice(0, currencyCode).replace(/^0\s*/, "")} — أسعار العملة الثانية تُحسب من سعر الصرف.</p>
      </div>
      <div className="flex gap-2 border-t border-border p-4">
        <button
          type="button"
          disabled={pending || changes.rows.length === 0 || changes.invalid}
          onClick={() =>
            startTransition(async () => {
              const res = await bulkSetPrices(changes.rows);
              if (res.error) {
                toast.error(res.error);
                return;
              }
              toast.success(`حُفظت أسعار ${res.updated} صنف`);
              router.refresh();
              onDone();
            })
          }
          className="h-12 flex-1 rounded-xl bg-brand text-[15px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "جارٍ الحفظ…" : changes.invalid ? "سعر غير صالح" : `حفظ (${changes.rows.length} تعديل)`}
        </button>
        <button type="button" onClick={onDone} className="h-12 rounded-xl border border-border px-5 text-sm font-semibold text-text-secondary">
          إلغاء
        </button>
      </div>
    </>
  );
}
