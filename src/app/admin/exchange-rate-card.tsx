"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowDownIcon, ArrowUpIcon, CheckIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { updateExchangeRate, updatePriceDisplay } from "@/app/actions/pricing";
import { formatMenuPrice, MENU_CURRENCIES } from "@/lib/currencies";
import { resolveSecondaryUnitCents, ROUND_STEPS } from "@/lib/secondary-currency";
import type { MenuItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type Props = {
  currencyCode: string;
  secondaryEnabled: boolean;
  secondaryCode: string | null;
  rate: number | null;
  roundStep: number;
  showSecondaryFirst: boolean;
  pricesUpdatedAt: string | null;
  items: MenuItem[];
  history: { rate: number; currencyCode: string; createdAt: string }[];
};

const symbolOf = (code: string) => MENU_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
const labelOf = (code: string) => MENU_CURRENCIES.find((c) => c.code === code)?.labelAr ?? code;

/** العملة الثانية المقترحة: الليرة السورية عند التسعير بالدولار */
function defaultSecondary(primary: string) {
  return primary === "USD" ? "SYP" : "USD";
}

function formatWhen(iso: string | null) {
  if (!iso) return "لم تُحدَّث بعد";
  const d = new Date(iso);
  return d.toLocaleString("ar", { weekday: "long", hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });
}

/**
 * بطاقة «سعر الصرف اليوم»: رقم واحد يحدّث كل أسعار العملة الثانية.
 * عند التسعير بالليرة والعملة الثانية دولار يُكتب السعر كـ«1 دولار = X ليرة» ويُخزَّن معكوساً.
 */
export function ExchangeRateCard(p: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState(p.secondaryCode ?? defaultSecondary(p.currencyCode));
  // «1 دولار = X» أوضح للسوق السوري من «1 ليرة = 0.008 دولار»
  const inverted = code === "USD" && p.currencyCode !== "USD";
  const shownRate = (r: number | null) => (r == null ? "" : String(+(inverted ? 1 / r : r).toFixed(inverted ? 2 : 4)));
  const [input, setInput] = useState(shownRate(p.secondaryEnabled ? p.rate : null));
  const [roundStep, setRoundStep] = useState(p.roundStep);
  const [secondaryFirst, setSecondaryFirst] = useState(p.showSecondaryFirst);

  const typed = Number(input.replace(/,/g, ""));
  const valid = Number.isFinite(typed) && typed > 0;
  const newRate = valid ? (inverted ? 1 / typed : typed) : null;
  const rateChanged = valid && (!p.secondaryEnabled || p.secondaryCode !== code || Math.abs((newRate ?? 0) - (p.rate ?? 0)) > (p.rate ?? 0) * 1e-6);
  const displayChanged = roundStep !== p.roundStep || secondaryFirst !== p.showSecondaryFirst;

  const preview = useMemo(
    () =>
      p.items.slice(0, 4).map((item) => {
        const primary = item.price_options?.length ? item.price_options[0].price_cents : item.price;
        const before =
          p.secondaryEnabled && p.secondaryCode === code ? resolveSecondaryUnitCents(item, primary, null, p.rate, p.roundStep) : null;
        const after = newRate ? resolveSecondaryUnitCents(item, primary, null, newRate, roundStep) : null;
        return { id: item.id, name: item.name, primary, before, after };
      }),
    [p.items, p.secondaryEnabled, p.secondaryCode, p.rate, p.roundStep, code, newRate, roundStep]
  );

  const [bigUnit, smallUnit] = inverted ? ["USD", p.currencyCode] : [p.currencyCode, code];
  const last = p.history[0];
  const prev = p.history[1];
  const delta = last && prev ? last.rate - prev.rate : 0;

  function save() {
    startTransition(async () => {
      const res = rateChanged
        ? await updateExchangeRate({ rate: newRate!, currencyCode: code, roundStep, showSecondaryFirst: secondaryFirst })
        : await updatePriceDisplay({ roundStep, showSecondaryFirst: secondaryFirst });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(rateChanged ? `تحدّثت أسعار ${p.items.length} صنف على السعر الجديد` : "حُفظت طريقة عرض الأسعار");
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-[20px] border border-border bg-bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            <RefreshCwIcon className="size-[18px] text-brand" />
            سعر الصرف اليوم
          </p>
          <p className="text-xs text-text-muted">آخر تحديث للأسعار: {formatWhen(p.pricesUpdatedAt)}</p>
        </div>
        {!p.secondaryEnabled ? (
          <select
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setInput("");
            }}
            aria-label="العملة الثانية"
            className="h-9 rounded-xl border border-border bg-bg-base px-3 text-sm font-semibold"
          >
            {MENU_CURRENCIES.filter((c) => c.code !== p.currencyCode).map((c) => (
              <option key={c.code} value={c.code}>
                {c.labelAr}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-bg-surface-2/70 p-4" dir="ltr">
            <span className="shrink-0 font-display text-2xl font-bold">1 {symbolOf(bigUnit)}</span>
            <span className="text-xl text-text-muted">=</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^0-9.,]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              aria-label={`سعر 1 ${labelOf(bigUnit)} بـ${labelOf(smallUnit)}`}
              className="h-14 min-w-0 flex-1 rounded-xl border border-border bg-bg-surface px-4 text-end font-display text-3xl font-bold tabular-nums outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <span className="shrink-0 font-display text-xl font-bold text-text-secondary">{symbolOf(smallUnit)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-text-muted">تقريب أسعار {labelOf(code)}</span>
              <select
                value={roundStep}
                onChange={(e) => setRoundStep(Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-border bg-bg-base px-3 text-sm"
              >
                {ROUND_STEPS.map((s) => (
                  <option key={s} value={s}>
                    {s === 0 ? "بدون تقريب" : `لأقرب ${s.toLocaleString("en")}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex cursor-pointer items-end gap-2 pb-2.5">
              <input
                type="checkbox"
                checked={secondaryFirst}
                onChange={(e) => setSecondaryFirst(e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              <span className="text-sm font-semibold">{labelOf(code)} بالخط الكبير</span>
            </label>
          </div>

          <button
            type="button"
            disabled={pending || (!rateChanged && !displayChanged) || (!valid && !p.secondaryEnabled)}
            onClick={save}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-white shadow-[0_12px_28px_-14px_var(--brand)] transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-50"
          >
            {pending ? <RefreshCwIcon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
            {rateChanged ? `حدّث كل الأسعار (${p.items.length} صنف)` : "حفظ"}
          </button>

          {p.history.length ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
              <span>السابق:</span>
              {p.history.slice(0, 4).map((h, i) => (
                <span key={h.createdAt} className="tabular-nums" dir="ltr">
                  {shownRate(h.rate)}
                  {i === 0 && delta !== 0 ? (
                    (inverted ? -delta : delta) > 0 ? (
                      <ArrowUpIcon className="ms-0.5 inline size-3 text-red-500" />
                    ) : (
                      <ArrowDownIcon className="ms-0.5 inline size-3 text-emerald-500" />
                    )
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted">معاينة الأسعار في المنيو</p>
          {preview.length === 0 ? (
            <p className="rounded-xl bg-bg-surface-2/60 px-4 py-6 text-center text-sm text-text-muted">أضف أصنافاً لترى المعاينة</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {preview.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
                  <span className="text-xs text-text-muted tabular-nums" dir="ltr">
                    {formatMenuPrice(r.primary, p.currencyCode)}
                  </span>
                  <span className="flex items-center gap-1.5 tabular-nums" dir="ltr">
                    {r.before != null && rateChanged ? (
                      <>
                        <span className="text-xs text-text-muted line-through">{formatMenuPrice(r.before, code)}</span>
                        <ArrowLeftIcon className="size-3 rotate-180 text-text-muted" />
                      </>
                    ) : null}
                    <span className="font-bold text-brand">{r.after != null ? formatMenuPrice(r.after, code) : "—"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-text-muted">
            الأسعار التي أدخلتها يدوياً بـ{labelOf(code)} لصنف معيّن تبقى كما هي.
          </p>
        </div>
      </div>
    </section>
  );
}
