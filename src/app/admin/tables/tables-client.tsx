"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import type { RestaurantTable, RestaurantWaiter } from "@/lib/types/database";
import {
  createRestaurantTable,
  deleteRestaurantTable,
  setRestaurantTableWaiter,
} from "@/app/actions/tables";
import { DownloadIcon, PlusIcon, PrinterIcon, QrCodeIcon, Trash2Icon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { cn } from "@/lib/utils";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** مثل demo.resturant.app من رابط المنيو العام */
function menuPublicHostname(menuBaseUrl: string): string {
  try {
    return new URL(menuBaseUrl.trim()).hostname;
  } catch {
    return "";
  }
}

const qrFor = (url: string) => `/api/qr?data=${encodeURIComponent(url)}`;

type PrintCard = { title: string; subtitle: string; qrSrc: string };

/** ورقة طباعة: بطاقة لكل رمز، بطاقتان في الصفحة */
function printCards(restaurantName: string, host: string, cards: PrintCard[]) {
  const w = window.open("", "_blank");
  if (!w) {
    toast.error("اسمح بالنوافذ المنبثقة للطباعة");
    return;
  }
  const origin = window.location.origin;
  const safeHost = escapeHtml(host);
  const body = cards
    .map(
      (c) => `<section class="card">
        <p class="name">${escapeHtml(restaurantName)}</p>
        <h1>${escapeHtml(c.title)}</h1>
        <img src="${origin}${c.qrSrc}" alt="" />
        <p class="cta">امسح الرمز لتصفح المنيو والطلب</p>
        <p class="sub">${escapeHtml(c.subtitle)}</p>
        ${safeHost ? `<p class="host" dir="ltr">${safeHost}</p>` : ""}
      </section>`
    )
    .join("");
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>${escapeHtml(restaurantName)} — QR</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, "Segoe UI", Tahoma, sans-serif; color: #1c1917; }
      .card { height: 132mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
        border: 2px dashed #e7e5e4; border-radius: 16px; margin-bottom: 8mm; page-break-inside: avoid; }
      .card:nth-child(2n) { page-break-after: always; }
      .name { margin: 0; font-size: 14px; font-weight: 700; color: #d9440f; letter-spacing: .02em; }
      h1 { margin: 4px 0 10px; font-size: 30px; }
      img { width: 62mm; height: 62mm; }
      .cta { margin: 10px 0 2px; font-size: 16px; font-weight: 700; }
      .sub { margin: 0; font-size: 12px; color: #78716c; max-width: 120mm; }
      .host { margin: 6px 0 0; font: 700 15px ui-monospace, monospace; }
    </style></head><body>${body}
    <script>
      const imgs = [...document.images];
      Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => window.print());
    </script></body></html>`);
  w.document.close();
}

type Props = {
  initialTables: RestaurantTable[];
  menuBaseUrl: string;
  restaurantName: string;
  /** يُعرض في ورقة الطباعة للدخول اليدوي عند تعذّر المسح */
  restaurantSubdomain: string;
  waitersSystemEnabled: boolean;
  waiters: RestaurantWaiter[];
};

export function TablesClient({
  initialTables,
  menuBaseUrl,
  restaurantName,
  restaurantSubdomain,
  waitersSystemEnabled,
  waiters,
}: Props) {
  const router = useRouter();
  const [tables, setTables] = useState(initialTables);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // مزامنة مع القيمة القادمة من الخادم بعد revalidate (أثناء الرسم بدل useEffect)
  const [prevInitialTables, setPrevInitialTables] = useState(initialTables);
  if (prevInitialTables !== initialTables) {
    setPrevInitialTables(initialTables);
    setTables(initialTables);
  }

  const homeUrl = menuBaseUrl.trim().replace(/\/$/, "");
  const host = menuPublicHostname(homeUrl) || restaurantSubdomain.trim();
  const tableUrl = (t: RestaurantTable) => `${homeUrl}/?t=${t.public_token}`;

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await createRestaurantTable(label);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setLabel("");
    router.refresh();
  }

  async function assignWaiter(tableId: string, waiterId: string) {
    const next = waiterId === "" ? null : waiterId;
    setAssigningTableId(tableId);
    const res = await setRestaurantTableWaiter(tableId, next);
    setAssigningTableId(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setTables((prev) => prev.map((x) => (x.id === tableId ? { ...x, waiter_id: next } : x)));
    router.refresh();
  }

  async function remove(id: string) {
    setConfirmDeleteId(null);
    const res = await deleteRestaurantTable(id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setTables((t) => t.filter((x) => x.id !== id));
    toast.success("حُذفت الطاولة");
  }

  const printTable = (t: RestaurantTable) =>
    printCards(restaurantName, host, [
      { title: t.label, subtitle: "يُربط طلبك بهذه الطاولة تلقائياً", qrSrc: qrFor(tableUrl(t)) },
    ]);

  const printAll = () =>
    printCards(
      restaurantName,
      host,
      tables.map((t) => ({ title: t.label, subtitle: "يُربط طلبك بهذه الطاولة تلقائياً", qrSrc: qrFor(tableUrl(t)) }))
    );

  if (!homeUrl) {
    return (
      <p className="rounded-2xl border border-border bg-bg-surface px-5 py-8 text-center text-sm text-text-muted">
        عيّن النطاق الفرعي للمطعم أولاً حتى تظهر روابط المنيو ورموز QR.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* QR العام */}
      <section className="flex flex-col gap-5 overflow-hidden rounded-[20px] border border-border bg-bg-surface p-5 sm:flex-row sm:items-center">
        <div className="relative mx-auto aspect-square w-36 shrink-0 overflow-hidden rounded-2xl bg-white p-2 sm:mx-0">
          <Image src={qrFor(homeUrl)} alt="QR المنيو" fill className="object-contain p-2" unoptimized />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-display text-lg font-bold">رمز QR العام للمنيو</p>
            <p className="text-sm text-text-muted">
              للواجهة والمدخل والإعلانات ومنشورات التواصل — يفتح المنيو مباشرة دون ربطه بطاولة.
            </p>
          </div>
          <p className="truncate rounded-xl bg-bg-surface-2 px-3 py-2 font-mono text-xs text-text-secondary" dir="ltr">
            {homeUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                printCards(restaurantName, host, [
                  { title: "المنيو", subtitle: "اطلب من هاتفك بسهولة", qrSrc: qrFor(homeUrl) },
                ])
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              <PrinterIcon className="size-4" />
              طباعة
            </button>
            <a
              href={qrFor(homeUrl)}
              download="menu-qr.png"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-text-secondary transition hover:text-text-primary"
            >
              <DownloadIcon className="size-4" />
              تنزيل الصورة
            </a>
            <CopyLinkButton url={homeUrl} />
          </div>
        </div>
      </section>

      {/* الطاولات */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">
              الطاولات <span className="text-base font-semibold text-text-muted">· {tables.length}</span>
            </h2>
            <p className="text-sm text-text-muted">لكل طاولة رمز خاص — يُسجَّل الطلب عليها تلقائياً عند المسح.</p>
          </div>
          {tables.length > 1 ? (
            <button
              type="button"
              onClick={printAll}
              className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-border bg-bg-surface px-4 text-sm font-semibold text-text-secondary transition hover:text-text-primary sm:self-auto"
            >
              <PrinterIcon className="size-4" />
              طباعة الكل
            </button>
          ) : null}
        </div>

        <form onSubmit={addTable} className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="اسم الطاولة — مثال: طاولة 12، تراس 2، VIP"
            required
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg-surface px-3.5 text-[15px] outline-none placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            <PlusIcon className="size-4" />
            {loading ? "جارٍ الإضافة…" : "إضافة"}
          </button>
        </form>
        {error ? (
          <p className="text-sm font-semibold text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {tables.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border-strong px-6 py-14 text-center">
            <QrCodeIcon className="mx-auto size-10 text-text-muted" />
            <p className="mt-3 font-display text-lg font-bold">لا توجد طاولات بعد</p>
            <p className="mt-1 text-sm text-text-muted">أضف أول طاولة ثم اطبع رمزها وضعه عليها.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {tables.map((t) => {
              const waiter = waiters.find((w) => w.id === t.waiter_id);
              return (
                <article key={t.id} className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-bg-surface">
                  <div className="flex items-center justify-between gap-2 px-4 pt-4">
                    <p className="truncate font-display text-lg font-bold">{t.label}</p>
                    <button
                      type="button"
                      aria-label="حذف الطاولة"
                      onClick={() => setConfirmDeleteId(t.id)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition hover:bg-red-500/10 hover:text-danger"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>

                  <div className="relative mx-4 my-3 aspect-square overflow-hidden rounded-2xl bg-white">
                    <Image src={qrFor(tableUrl(t))} alt={`QR ${t.label}`} fill className="object-contain p-3" unoptimized />
                    {confirmDeleteId === t.id ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-surface/95 p-3 text-center">
                        <p className="text-sm font-bold text-text-primary">حذف «{t.label}»؟</p>
                        <p className="text-[11px] text-text-muted">الرمز المطبوع سيتوقف عن العمل.</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void remove(t.id)}
                            className="h-8 rounded-lg bg-danger px-3 text-xs font-bold text-white"
                          >
                            حذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-8 rounded-lg border border-border px-3 text-xs font-semibold"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {waitersSystemEnabled ? (
                    <label className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-bg-surface-2 px-3 py-2">
                      <UserRoundIcon className="size-4 shrink-0 text-text-muted" />
                      <select
                        aria-label="الويتر المسؤول"
                        className={cn(
                          "min-w-0 flex-1 bg-transparent text-sm outline-none",
                          waiter ? "font-semibold text-text-primary" : "text-text-muted"
                        )}
                        value={t.waiter_id ?? ""}
                        disabled={assigningTableId === t.id || waiters.length === 0}
                        onChange={(e) => void assignWaiter(t.id, e.target.value)}
                      >
                        <option value="">{waiters.length ? "بدون ويتر" : "أضف الويترز من الإعدادات"}</option>
                        {waiters.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <div className="mt-auto grid grid-cols-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => printTable(t)}
                      className="flex h-11 items-center justify-center gap-1.5 text-sm font-semibold text-brand transition hover:bg-brand-light"
                    >
                      <PrinterIcon className="size-4" />
                      طباعة
                    </button>
                    <a
                      href={qrFor(tableUrl(t))}
                      download={`qr-${t.label}.png`}
                      className="flex h-11 items-center justify-center gap-1.5 border-s border-border text-sm font-semibold text-text-secondary transition hover:bg-bg-surface-2 hover:text-text-primary"
                    >
                      <DownloadIcon className="size-4" />
                      تنزيل
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
