"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  enqueueCustomerPointsNotification,
  generateCustomerMagicLink,
  type LoyaltyDashboardCustomer,
  redeemCustomerCashPoints,
  redeemCustomerReward,
  upsertRestaurantReward,
} from "@/app/actions/customers";
import { processQueuedNotifications } from "@/app/actions/notifications";
import { formatMenuPrice } from "@/lib/currencies";
import { redemptionValueCents } from "@/lib/loyalty";
import { secondaryCentsFromPrimaryCents } from "@/lib/secondary-currency";
import {
  buildWhatsAppLoyaltyPointsMessage,
  buildWhatsAppMeUrl,
  normalizeInternationalDigits,
} from "@/lib/customer-phone";
import { cn } from "@/lib/utils";

type RewardRow = {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  active: boolean;
  optional_stock: number | null;
};

type NotificationRow = {
  id: string;
  channel: string;
  template_key: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  error: string | null;
};

type Props = {
  customers: LoyaltyDashboardCustomer[];
  rewards: RewardRow[];
  notifications: NotificationRow[];
  phoneCountryPrefix: string | null;
  subdomain: string;
  publicBaseUrl: string;
  restaurantName: string;
  currencyCode: string;
  pointValueCents: number;
  secondaryCurrencyCode?: string | null;
  secondaryExchangeRate?: number | null;
};

type TabId = "customers" | "transactions" | "rewards" | "campaigns" | "settings";

const tabs: { id: TabId; label: string }[] = [
  { id: "customers", label: "العملاء" },
  { id: "transactions", label: "الاستبدال السريع" },
  { id: "rewards", label: "المكافآت" },
  { id: "campaigns", label: "الإشعارات" },
  { id: "settings", label: "إعدادات التشغيل" },
];

export function LoyaltyDashboardClient({
  customers,
  rewards,
  notifications,
  phoneCountryPrefix,
  subdomain,
  publicBaseUrl,
  restaurantName,
  currencyCode,
  pointValueCents,
  secondaryCurrencyCode = null,
  secondaryExchangeRate = null,
}: Props) {
  const rateRaw =
    secondaryExchangeRate != null ? Number(secondaryExchangeRate) : NaN;
  const showSecondary =
    Boolean(secondaryCurrencyCode) &&
    Number.isFinite(rateRaw) &&
    rateRaw > 0;
  const secondaryRate = showSecondary ? rateRaw : NaN;

  const [tab, setTab] = useState<TabId>("customers");
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedLinkCustomerId, setCopiedLinkCustomerId] = useState<string | null>(null);
  const copySuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cashPointsByCustomer, setCashPointsByCustomer] = useState<Record<string, string>>({});
  const [rewardPickByCustomer, setRewardPickByCustomer] = useState<Record<string, string>>({});

  function flashLinkCopied(customerId: string) {
    if (copySuccessTimerRef.current) clearTimeout(copySuccessTimerRef.current);
    setCopiedLinkCustomerId(customerId);
    copySuccessTimerRef.current = setTimeout(() => {
      setCopiedLinkCustomerId(null);
      copySuccessTimerRef.current = null;
    }, 2200);
  }

  const filteredCustomers = useMemo(() => {
    const query = q.trim();
    if (!query) return customers;
    return customers.filter(
      (c) => c.phone_normalized.includes(query) || (c.name ?? "").includes(query)
    );
  }, [customers, q]);

  const [rewardForm, setRewardForm] = useState({
    title: "",
    description: "",
    pointsCost: "100",
    optionalStock: "",
    active: true,
  });

  function waDigitsForCustomer(phoneNormalized: string): string {
    return normalizeInternationalDigits(phoneCountryPrefix, phoneNormalized);
  }

  async function copyTextToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        /* fall through */
      }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">كيف تستخدم هذه اللوحة؟</p>
        <ul className="mt-2 list-disc space-y-1 pr-5">
          <li>
            <strong>رابط النقاط للزبون:</strong> يفتح صفحة عامة برصيده وسجله (بدون تسجيل دخول).
          </li>
          <li>
            <strong>واتساب:</strong> يرسل للزبون رسالة فيها رصيده ورابط الصفحة (بعد توليد الرابط أولاً).
          </li>
          <li>
            <strong>إشعار بالقائمة:</strong> يضيف رسالة إلى طابور الإرسال — ثم من تبويب «الإشعارات» اضغط «تشغيل
            المعالج الآن» (أو فعّل Cron لاحقاً لإرسال SMS/WhatsApp فعلي).
          </li>
          <li>
            <strong>استبدال نقدي:</strong> يخصم نقاطاً ويحسب قيمة الخصم بالسنت حسب إعدادات قيمة النقطة (لا
            يحتاج رقم طلب).
          </li>
          <li>
            <strong>استبدال مكافأة:</strong> اختر مكافأة من القائمة إن وُجدت في تبويب المكافآت.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={tab === item.id ? "default" : "outline"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {feedback ? (
        <p className="rounded-md border border-border/60 px-3 py-2 text-sm whitespace-pre-wrap text-muted-foreground">
          {feedback}
        </p>
      ) : null}

      {tab === "customers" ? (
        <Card>
          <CardHeader>
            <CardTitle>إدارة الولاء لكل عميل</CardTitle>
            <CardDescription>
              نفس أرقام الجوال أعلاه — تمت مزامنتها تلقائياً مع نظام النقاط الاحترافي. عمود «قيمة الرصيد
              (تقدير)» = رصيد النقاط × قيمة النقطة من إعدادات الولاء (كالجدول السابق).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              dir="ltr"
              placeholder="بحث بالجوال أو الاسم..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">الجوال</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead>قيمة الرصيد (تقدير)</TableHead>
                    <TableHead>مكتسبة</TableHead>
                    <TableHead>مستبدلة</TableHead>
                    <TableHead>عمليات</TableHead>
                    <TableHead className="min-w-[280px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        لا يوجد عملاء في النظام الجديد بعد. تأكد من تنفيذ ملف SQL للولاء ثم أعد تحميل الصفحة.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((c) => {
                      const redeemEstimate = redemptionValueCents(
                        c.points_balance,
                        pointValueCents
                      );
                      return (
                      <TableRow key={c.customer_id}>
                        <TableCell dir="ltr" className="font-mono text-sm">
                          {c.phone_normalized}
                        </TableCell>
                        <TableCell>{c.name ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{c.points_balance}</TableCell>
                        <TableCell dir="ltr" className="text-sm tabular-nums text-muted-foreground">
                          <div className="flex flex-col gap-0.5">
                            <span>{formatMenuPrice(redeemEstimate, currencyCode)}</span>
                            {showSecondary && secondaryCurrencyCode ? (
                              <span className="text-[11px] opacity-90">
                                {formatMenuPrice(
                                  secondaryCentsFromPrimaryCents(
                                    redeemEstimate,
                                    secondaryRate
                                  ),
                                  secondaryCurrencyCode
                                )}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{c.lifetime_earned}</TableCell>
                        <TableCell className="tabular-nums">{c.lifetime_redeemed}</TableCell>
                        <TableCell className="tabular-nums">{c.tx_count}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                disabled={pending}
                                title="نسخ رابط صفحة النقاط"
                                aria-label="نسخ رابط صفحة النقاط"
                                className={cn(
                                  "size-9 shrink-0 border-emerald-500/45 text-emerald-600 transition-all",
                                  "hover:border-emerald-500 hover:bg-emerald-500/12 hover:text-emerald-700",
                                  "focus-visible:ring-emerald-500/30",
                                  copiedLinkCustomerId === c.customer_id &&
                                    "border-emerald-600 bg-emerald-500/15 text-emerald-700 shadow-sm"
                                )}
                                onClick={() =>
                                  startTransition(async () => {
                                    const res = await generateCustomerMagicLink(c.customer_id);
                                    if (res.error || !res.url) {
                                      toast.error("تعذر إنشاء الرابط", {
                                        description: res.error ?? undefined,
                                      });
                                      return;
                                    }
                                    const copied = await copyTextToClipboard(res.url);
                                    if (copied) {
                                      flashLinkCopied(c.customer_id);
                                      toast.success("تم نسخ رابط النقاط", {
                                        description: "يمكنك لصقه في واتساب أو أي تطبيق.",
                                        duration: 2800,
                                      });
                                    } else {
                                      toast.error("تعذر النسخ التلقائي", {
                                        description: res.url,
                                        duration: 8000,
                                      });
                                    }
                                  })
                                }
                              >
                                {copiedLinkCustomerId === c.customer_id ? (
                                  <Check className="size-4" aria-hidden strokeWidth={2.5} />
                                ) : (
                                  <Link2 className="size-4" aria-hidden strokeWidth={2} />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    const res = await generateCustomerMagicLink(c.customer_id);
                                    if (res.error || !res.url) {
                                      setFeedback(res.error ?? "تعذر إنشاء الرابط");
                                      return;
                                    }
                                    const msg = buildWhatsAppLoyaltyPointsMessage({
                                      restaurantName,
                                      customerName: c.name,
                                      pointsBalance: c.points_balance,
                                      loyaltyPageUrl: res.url,
                                    });
                                    const href = buildWhatsAppMeUrl(waDigitsForCustomer(c.phone_normalized), msg);
                                    window.open(href, "_blank", "noopener,noreferrer");
                                    setFeedback("تم فتح واتساب مع رسالة جاهزة. أرسلها للزبون.");
                                  })
                                }
                              >
                                واتساب
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    const res = await enqueueCustomerPointsNotification(c.customer_id);
                                    setFeedback(
                                      res.error
                                        ? res.error
                                        : `تمت إضافة الإشعار للطابور.\nمعاينة الرسالة:\n${res.previewMessage}\n\nانتقل لتبويب «الإشعارات» واضغط «تشغيل المعالج الآن».`
                                    );
                                  })
                                }
                              >
                                إشعار (طابور)
                              </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Input
                                dir="ltr"
                                className="h-8 w-20 text-xs"
                                type="number"
                                min={1}
                                placeholder="نقاط"
                                value={cashPointsByCustomer[c.customer_id] ?? ""}
                                onChange={(e) =>
                                  setCashPointsByCustomer((s) => ({
                                    ...s,
                                    [c.customer_id]: e.target.value,
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                className="h-8"
                                disabled={pending}
                                onClick={() =>
                                  startTransition(async () => {
                                    const raw = cashPointsByCustomer[c.customer_id];
                                    const pts = Math.max(1, Math.floor(Number(raw ?? 0)));
                                    const res = await redeemCustomerCashPoints(c.customer_id, pts, null);
                                    setFeedback(
                                      res.error
                                        ? `استبدال نقدي: ${res.error}`
                                        : `تم خصم ${res.pointsRedeemed} نقطة. قيمة الخصم التقديرية: ${res.discountCents} سنت (طبّقها على الطلب يدوياً في نظامك). الرصيد الجديد: ${res.newBalance}.`
                                    );
                                  })
                                }
                              >
                                خصم نقاط
                              </Button>
                              {rewards.length > 0 ? (
                                <>
                                  <select
                                    className="h-8 max-w-[140px] rounded-md border border-input bg-background px-2 text-xs"
                                    value={rewardPickByCustomer[c.customer_id] ?? ""}
                                    onChange={(e) =>
                                      setRewardPickByCustomer((s) => ({
                                        ...s,
                                        [c.customer_id]: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">مكافأة...</option>
                                    {rewards
                                      .filter((r) => r.active)
                                      .map((r) => (
                                        <option key={r.id} value={r.id}>
                                          {r.title} ({r.points_cost})
                                        </option>
                                      ))}
                                  </select>
                                  <Button
                                    size="sm"
                                    className="h-8"
                                    variant="outline"
                                    disabled={pending || !rewardPickByCustomer[c.customer_id]}
                                    onClick={() =>
                                      startTransition(async () => {
                                        const rid = rewardPickByCustomer[c.customer_id];
                                        if (!rid) return;
                                        const res = await redeemCustomerReward(c.customer_id, rid);
                                        setFeedback(
                                          res.error
                                            ? `استبدال مكافأة: ${res.error}`
                                            : `تم استبدال المكافأة وخصم ${res.pointsSpent} نقطة. الرصيد: ${res.newBalance}.`
                                        );
                                      })
                                    }
                                  >
                                    استبدال
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "transactions" ? (
        <Card>
          <CardHeader>
            <CardTitle>استبدال بدون معرفات تقنية</CardTitle>
            <CardDescription>
              الطريقة الأسهل: استخدم تبويب «العملاء» وأزرار «خصم نقاط» أو «استبدال» بجانب كل رقم. هذا القسم
              للنسخ اليدوي لمعرّفات العميل/الطلب إن احتجتها.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <form
              className="space-y-2 rounded-md border border-border/60 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const customerId = String(form.get("customer_id") ?? "");
                const orderIdRaw = String(form.get("order_id") ?? "");
                const points = Number(form.get("points") ?? 0);
                startTransition(async () => {
                  const res = await redeemCustomerCashPoints(
                    customerId,
                    points,
                    orderIdRaw.trim() ? orderIdRaw.trim() : null
                  );
                  setFeedback(
                    res.error
                      ? `فشل الاستبدال النقدي: ${res.error}`
                      : `تم خصم ${res.pointsRedeemed} نقطة وقيمة خصم ${res.discountCents} سنت. الرصيد: ${res.newBalance}.`
                  );
                });
              }}
            >
              <p className="text-sm font-medium">استبدال نقدي (متقدم)</p>
              <Input name="customer_id" placeholder="معرّف العميل (UUID)" dir="ltr" required />
              <Input
                name="order_id"
                placeholder="معرّف الطلب (اختياري — اتركه فارغاً)"
                dir="ltr"
              />
              <Input name="points" placeholder="عدد النقاط" type="number" min={1} required />
              <Button size="sm" disabled={pending}>
                تنفيذ
              </Button>
            </form>

            <form
              className="space-y-2 rounded-md border border-border/60 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const customerId = String(form.get("customer_id") ?? "");
                const rewardId = String(form.get("reward_id") ?? "");
                const orderIdRaw = String(form.get("order_id") ?? "");
                startTransition(async () => {
                  const res = await redeemCustomerReward(
                    customerId,
                    rewardId,
                    orderIdRaw.trim() ? orderIdRaw.trim() : undefined
                  );
                  setFeedback(
                    res.error
                      ? `فشل استبدال المكافأة: ${res.error}`
                      : `تم الاستبدال. النقاط المخصومة: ${res.pointsSpent} — الرصيد: ${res.newBalance}.`
                  );
                });
              }}
            >
              <p className="text-sm font-medium">استبدال مكافأة (متقدم)</p>
              <Input name="customer_id" placeholder="معرّف العميل" dir="ltr" required />
              <Input name="reward_id" placeholder="معرّف المكافأة" dir="ltr" required />
              <Input name="order_id" placeholder="معرّف الطلب (اختياري)" dir="ltr" />
              <Button size="sm" disabled={pending}>
                تنفيذ
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {tab === "rewards" ? (
        <Card>
          <CardHeader>
            <CardTitle>كتالوج المكافآت</CardTitle>
            <CardDescription>تعريف المكافآت القابلة للاستبدال بالنقاط من تبويب العملاء.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="grid gap-3 rounded-md border border-border/60 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await upsertRestaurantReward({
                    title: rewardForm.title,
                    description: rewardForm.description || null,
                    pointsCost: Number(rewardForm.pointsCost),
                    active: rewardForm.active,
                    optionalStock: rewardForm.optionalStock ? Number(rewardForm.optionalStock) : null,
                  });
                  setFeedback(res.error ? `فشل حفظ المكافأة: ${res.error}` : "تم حفظ المكافأة — أعد تحميل الصفحة إن لم تظهر في القائمة.");
                });
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="reward-title">العنوان</Label>
                <Input
                  id="reward-title"
                  value={rewardForm.title}
                  onChange={(e) => setRewardForm((s) => ({ ...s, title: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="reward-desc">الوصف</Label>
                <Textarea
                  id="reward-desc"
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm((s) => ({ ...s, description: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="reward-points">تكلفة النقاط</Label>
                <Input
                  id="reward-points"
                  type="number"
                  min={1}
                  value={rewardForm.pointsCost}
                  onChange={(e) => setRewardForm((s) => ({ ...s, pointsCost: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="reward-stock">المخزون (اختياري)</Label>
                <Input
                  id="reward-stock"
                  type="number"
                  min={0}
                  value={rewardForm.optionalStock}
                  onChange={(e) => setRewardForm((s) => ({ ...s, optionalStock: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rewardForm.active}
                  onCheckedChange={(v) => setRewardForm((s) => ({ ...s, active: v }))}
                />
                <span className="text-sm">مكافأة مفعّلة</span>
              </div>
              <Button size="sm" disabled={pending}>
                حفظ المكافأة
              </Button>
            </form>

            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المكافأة</TableHead>
                    <TableHead>النقاط</TableHead>
                    <TableHead>مخزون</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium">{r.title}</p>
                        {r.description ? (
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular-nums">{r.points_cost}</TableCell>
                      <TableCell className="tabular-nums">{r.optional_stock ?? "—"}</TableCell>
                      <TableCell>{r.active ? "مفعّلة" : "متوقفة"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "campaigns" ? (
        <Card>
          <CardHeader>
            <CardTitle>طابور الإشعارات</CardTitle>
            <CardDescription>
              بعد الضغط على «إشعار (طابور)» لأي عميل، شغّل المعالج هنا. حالياً الإرسال تجريبي — اربط مزود SMS
              أو واتساب API في الخادم لاحقاً.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await processQueuedNotifications();
                  setFeedback(
                    res.error
                      ? `فشل المعالجة: ${res.error}`
                      : `تمت المعالجة: ${res.processed} | تم الإرسال: ${res.sent} | فشل: ${res.failed}`
                  );
                })
              }
            >
              تشغيل المعالج الآن
            </Button>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>القناة</TableHead>
                    <TableHead>القالب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>وقت الإنشاء</TableHead>
                    <TableHead>الخطأ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>{n.channel}</TableCell>
                      <TableCell className="font-mono text-xs">{n.template_key}</TableCell>
                      <TableCell>{n.status}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(n.created_at).toLocaleString("en-GB", {
                          dateStyle: "short",
                          timeStyle: "short",
                          hour12: false,
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-destructive">{n.error ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "settings" ? (
        <Card>
          <CardHeader>
            <CardTitle>إعدادات متقدمة</CardTitle>
            <CardDescription>
              قواعد الكسب وقيمة النقطة من صفحة إعدادات المطعم. هنا تشغيل المعالج وربط المزود لاحقاً.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pr-5 text-sm text-muted-foreground">
              <li>تفعيل Cron كل دقيقة لاستدعاء معالج الإشعارات على الخادم.</li>
              <li>ربط مزود SMS أو WhatsApp Business API بدل الإرسال التجريبي.</li>
              <li>تأكد من ضبط «مقدمة الدولة» للجوال في الإعدادات لاتصال واتساب الصحيح.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              النطاق الحالي للوحة:{" "}
              <span dir="ltr" className="font-mono">
                {publicBaseUrl || "—"}
              </span>{" "}
              · المطعم: {subdomain || "—"}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
