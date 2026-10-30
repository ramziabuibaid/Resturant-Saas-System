"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { RestaurantTable, RestaurantWaiter } from "@/lib/types/database";
import {
  createRestaurantTable,
  deleteRestaurantTable,
  setRestaurantTableWaiter,
} from "@/app/actions/tables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PrinterIcon, QrCodeIcon, Trash2Icon } from "lucide-react";

function escapeHtmlForPrint(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** مثل alking.resturant.app من رابط المنيو العام */
function menuPublicHostname(menuBaseUrl: string): string {
  const u = menuBaseUrl.trim();
  if (!u) return "";
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
}

type Props = {
  initialTables: RestaurantTable[];
  menuBaseUrl: string;
  /** يُعرض في ورقة الطباعة أسفل الـ QR للدخول اليدوي عند تعذّر المسح */
  restaurantSubdomain: string;
  waitersSystemEnabled: boolean;
  waiters: RestaurantWaiter[];
};

export function TablesClient({
  initialTables,
  menuBaseUrl,
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

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

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
    setError(null);
    const res = await setRestaurantTableWaiter(tableId, next);
    setAssigningTableId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setTables((prev) =>
      prev.map((x) => (x.id === tableId ? { ...x, waiter_id: next } : x))
    );
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذه الطاولة؟ روابط الـ QR القديمة ستتوقف عن العمل.")) return;
    setError(null);
    const res = await deleteRestaurantTable(id);
    if (res.error) {
      setError(res.error);
      return;
    }
    setTables((t) => t.filter((x) => x.id !== id));
  }

  function printQr(labelText: string, qrSrc: string) {
    const w = window.open("", "_blank");
    if (!w) return;
    const safeLabel = escapeHtmlForPrint(labelText);
    const manualHost =
      menuPublicHostname(menuBaseUrl) || restaurantSubdomain.trim();
    const safeHost = escapeHtmlForPrint(manualHost);
    const subBlock =
      safeHost.length > 0
        ? `<p class="subdomain-label">عنوان موقع المطعم (للدخول اليدوي إن لم يعمل المسح)</p>
      <p class="subdomain-value" dir="ltr">${safeHost}</p>
      <p class="manual-hint">افتح المتصفح واكتب العنوان أعلاه في شريط العنوان، ثم اختر الطاولة «${safeLabel}» من القائمة.</p>`
        : "";
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>QR — ${safeLabel}</title>
      <style>
        body { font-family: system-ui; text-align: center; padding: 2rem; }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; }
        img { width: 280px; height: 280px; }
        p { color: #555; margin-top: 1rem; font-size: 14px; }
        .subdomain-label { margin-top: 1.25rem; margin-bottom: 0.25rem; font-size: 13px; color: #333; }
        .subdomain-value { font-size: 1.35rem; font-weight: 700; font-family: ui-monospace, monospace; letter-spacing: 0.02em; color: #111; margin-top: 0; }
        .manual-hint { font-size: 12px; color: #666; max-width: 320px; margin-left: auto; margin-right: auto; line-height: 1.5; }
      </style></head><body>
      <h1>${safeLabel}</h1>
      <img src="${qrSrc}" alt="QR" />
      ${subBlock}
      <p>امسح الرمز لفتح المنيو وربط الطلب بهذه الطاولة تلقائياً.</p>
      <script>window.onload = () => { window.print(); }</script>
      </body></html>`);
    w.document.close();
  }

  function printGeneralQr(homeUrl: string, qrSrc: string) {
    const w = window.open("", "_blank");
    if (!w) return;
    const safeTitle = escapeHtmlForPrint("الصفحة الرئيسية للمطعم");
    const safeUrl = escapeHtmlForPrint(homeUrl);
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><title>QR — ${safeTitle}</title>
      <style>
        body { font-family: system-ui; text-align: center; padding: 2rem; }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; }
        img { width: 280px; height: 280px; }
        p { color: #555; margin-top: 1rem; font-size: 14px; }
        .subdomain-label { margin-top: 1.25rem; margin-bottom: 0.25rem; font-size: 13px; color: #333; }
        .subdomain-value { font-size: 1.1rem; font-weight: 700; font-family: ui-monospace, monospace; letter-spacing: 0.02em; color: #111; margin-top: 0; word-break: break-all; }
      </style></head><body>
      <h1>${safeTitle}</h1>
      <img src="${qrSrc}" alt="QR" />
      <p class="subdomain-label">رابط المطعم (للدخول اليدوي إن لم يعمل المسح)</p>
      <p class="subdomain-value" dir="ltr">${safeUrl}</p>
      <script>window.onload = () => { window.print(); }</script>
      </body></html>`);
    w.document.close();
  }

  const homeUrl = menuBaseUrl.trim().replace(/\/$/, "");
  const generalQrSrc =
    homeUrl.length > 0 ? `/api/qr?data=${encodeURIComponent(homeUrl)}` : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الطاولات ورموز QR</h1>
        <p className="text-muted-foreground">
          أضف كل طاولة باسم واضح، ثم اطبع رمز QR الخاص بها وضعه على الطاولة. الزبون يمسح الرمز فيفتح المنيو
          ويُرسَم الطلب على هذه الطاولة دون إدخال يدوي.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardHeader>
          <CardTitle>رمز QR عام — الصفحة الرئيسية</CardTitle>
          <CardDescription>
            للواجهة أو المدخل أو الإعلانات: يفتح الزبون صفحة المطعم والمنيو مباشرة دون ربط بطاولة محددة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {homeUrl.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              عيّن النطاق الفرعي للمطعم في الإعدادات حتى يظهر رابط المنيو العام ورمز QR.
            </p>
          ) : (
            <>
              <p className="break-all text-xs text-muted-foreground" dir="ltr">
                {homeUrl}
              </p>
              <div className="relative mx-auto aspect-square w-48 overflow-hidden rounded-lg border bg-white">
                <Image src={generalQrSrc} alt="" fill className="object-contain p-2" unoptimized />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="gap-1"
                  onClick={() => printGeneralQr(homeUrl, generalQrSrc)}
                >
                  <PrinterIcon className="size-4" />
                  طباعة QR العام
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => window.open(generalQrSrc, "_blank")}
                >
                  <QrCodeIcon className="size-4" />
                  صورة QR
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إضافة طاولة</CardTitle>
          <CardDescription>مثال: طاولة 5، تراس 2، VIP...</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addTable} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">اسم الطاولة</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="طاولة 12"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : "إضافة"}
            </Button>
          </form>
          {error ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => {
          const orderUrl = `${menuBaseUrl.replace(/\/$/, "")}/?t=${t.public_token}`;
          const qrSrc = `/api/qr?data=${encodeURIComponent(orderUrl)}`;
          return (
            <Card key={t.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t.label}</CardTitle>
                <CardDescription className="break-all text-xs" dir="ltr">
                  {orderUrl}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {waitersSystemEnabled ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">الويتر المسؤول</label>
                    <select
                      className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm"
                      value={t.waiter_id ?? ""}
                      disabled={assigningTableId === t.id}
                      onChange={(e) => void assignWaiter(t.id, e.target.value)}
                    >
                      <option value="">— بدون —</option>
                      {waiters.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {waiters.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        أضف أسماء الويترز من الإعدادات أولاً.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="relative mx-auto aspect-square w-48 overflow-hidden rounded-lg border bg-white">
                  <Image src={qrSrc} alt="" fill className="object-contain p-2" unoptimized />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => printQr(t.label, qrSrc)}
                  >
                    <PrinterIcon className="size-4" />
                    طباعة
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => window.open(qrSrc, "_blank")}
                  >
                    <QrCodeIcon className="size-4" />
                    صورة QR
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ms-auto text-destructive hover:text-destructive"
                    onClick={() => remove(t.id)}
                  >
                    <Trash2Icon className="size-4" />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tables.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          لا توجد طاولات بعد. أضف أول طاولة أعلاه ثم اطبع الرموز.
        </p>
      ) : null}
    </div>
  );
}
