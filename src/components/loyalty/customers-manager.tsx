"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  CheckIcon,
  GiftIcon,
  Link2Icon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
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

export type RewardRow = {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  active: boolean;
  optional_stock: number | null;
};

export type NotificationRow = {
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
  restaurantName: string;
  currencyCode: string;
  pointValueCents: number;
  loyaltyEnabled: boolean;
  secondaryCurrencyCode?: string | null;
  secondaryExchangeRate?: number | null;
};

type TabId = "customers" | "rewards" | "notifications";
type SortId = "spent" | "points" | "recent";

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-bg-base px-3.5 text-[15px] text-text-primary outline-none placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";

const NOTIFICATION_STATUS: Record<string, { label: string; cls: string }> = {
  queued: { label: "بالانتظار", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  sending: { label: "قيد الإرسال", cls: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" },
  sent: { label: "أُرسل", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  failed: { label: "فشل", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar", { day: "numeric", month: "short", year: "numeric" });
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CustomersManager(props: Props) {
  const { customers, rewards, notifications, currencyCode, pointValueCents, loyaltyEnabled } = props;
  const [tab, setTab] = useState<TabId>("customers");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortId>("spent");
  const [openId, setOpenId] = useState<string | null>(null);
  const money = (c: number) => formatMenuPrice(c, currencyCode);

  const totals = useMemo(
    () => ({
      points: customers.reduce((s, c) => s + c.points_balance, 0),
      spent: customers.reduce((s, c) => s + c.total_spent_cents, 0),
      returning: customers.filter((c) => c.order_count > 1).length,
    }),
    [customers]
  );

  const shown = useMemo(() => {
    const query = q.trim();
    const list = query
      ? customers.filter((c) => c.phone_normalized.includes(query) || (c.name ?? "").includes(query))
      : customers;
    return [...list].sort((a, b) =>
      sort === "points"
        ? b.points_balance - a.points_balance
        : sort === "recent"
          ? (b.last_order_at ?? "").localeCompare(a.last_order_at ?? "")
          : b.total_spent_cents - a.total_spent_cents
    );
  }, [customers, q, sort]);

  const openCustomer = customers.find((c) => c.customer_id === openId) ?? null;
  const queued = notifications.filter((n) => n.status === "queued").length;

  const stats = [
    { label: "العملاء", value: String(customers.length), hint: `${totals.returning} عادوا للطلب مرة أخرى`, icon: UsersIcon },
    { label: "إجمالي المشتريات", value: money(totals.spent), hint: "من كل الطلبات المكتملة", icon: WalletIcon, ltr: true },
    {
      label: "نقاط في أرصدة العملاء",
      value: totals.points.toLocaleString("en"),
      hint: `قيمتها ≈ ${money(redemptionValueCents(totals.points, pointValueCents))}`,
      icon: SparklesIcon,
    },
    { label: "المكافآت المفعّلة", value: String(rewards.filter((r) => r.active).length), hint: `من أصل ${rewards.length}`, icon: GiftIcon },
  ];

  return (
    <div className="space-y-6">
      {!loyaltyEnabled ? (
        <Link
          href="/admin/settings#loyalty"
          className="flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <SparklesIcon className="size-5 shrink-0" />
          <span className="flex-1">برنامج النقاط متوقف — العملاء لا يكسبون نقاطاً على طلباتهم. فعّله من الإعدادات.</span>
          <span className="font-bold">تفعيل ←</span>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[20px] border border-border bg-bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-text-muted sm:text-sm">{s.label}</p>
              <span className="flex size-8 items-center justify-center rounded-xl bg-brand-light text-brand">
                <s.icon className="size-4" />
              </span>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-text-primary sm:text-2xl" dir={s.ltr ? "ltr" : undefined}>
              <span className={s.ltr ? "block text-end" : undefined}>{s.value}</span>
            </p>
            <p className="mt-1 truncate text-[11px] text-text-muted sm:text-xs">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-border bg-bg-surface p-1 text-sm font-semibold">
          {(
            [
              ["customers", "العملاء", customers.length],
              ["rewards", "المكافآت", rewards.length],
              ["notifications", "الإشعارات", queued || null],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full px-4 transition",
                tab === id ? "bg-brand text-white" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {label}
              {n ? (
                <span className={cn("rounded-full px-1.5 text-[11px]", tab === id ? "bg-white/25" : "bg-bg-surface-2")}>{n}</span>
              ) : null}
            </button>
          ))}
        </div>
        <Link
          href="/admin/settings#loyalty"
          className="ms-auto inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
        >
          <SettingsIcon className="size-4" />
          قواعد النقاط
        </Link>
      </div>

      {tab === "customers" ? (
        <section className="overflow-hidden rounded-[20px] border border-border bg-bg-surface">
          <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث برقم الجوال أو الاسم…"
                className={cn(inputCls, "ps-10")}
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className={cn(inputCls, "sm:w-48")}>
              <option value="spent">الأعلى إنفاقاً</option>
              <option value="points">الأكثر نقاطاً</option>
              <option value="recent">آخر طلب</option>
            </select>
          </div>

          {shown.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <UsersIcon className="mx-auto size-10 text-text-muted" />
              <p className="mt-3 font-display text-lg font-bold">{customers.length ? "لا نتائج مطابقة" : "لا يوجد عملاء بعد"}</p>
              <p className="mt-1 text-sm text-text-muted">
                {customers.length ? "جرّب رقماً أو اسماً آخر." : "يظهر هنا كل زبون يطلب من المنيو برقم جواله، مع نقاطه ومشترياته."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-4 border-b border-border bg-bg-surface-2/50 px-5 py-2.5 text-xs font-semibold text-text-muted md:grid">
                <span>العميل</span>
                <span>الطلبات</span>
                <span>المشتريات</span>
                <span>النقاط</span>
                <span>آخر طلب</span>
              </div>
              <ul className="divide-y divide-border">
                {shown.map((c) => (
                  <li key={c.customer_id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(c.customer_id)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 text-start transition hover:bg-bg-surface-2/60 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] md:px-5"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-light font-bold text-brand">
                          {c.name?.trim().charAt(0) || "#"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-text-primary">{c.name?.trim() || "زبون"}</span>
                          <span className="block truncate font-mono text-xs text-text-muted" dir="ltr">
                            <span className="block text-end">{c.phone_normalized}</span>
                          </span>
                        </span>
                      </span>
                      <span className="hidden text-sm tabular-nums md:block">{c.order_count}</span>
                      <span className="hidden text-sm font-semibold tabular-nums md:block">{money(c.total_spent_cents)}</span>
                      <span className="justify-self-end md:justify-self-start">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                            c.points_balance > 0 ? "bg-gold/20 text-amber-700 dark:text-gold" : "bg-bg-surface-2 text-text-muted"
                          )}
                        >
                          <SparklesIcon className="size-3" />
                          {c.points_balance}
                        </span>
                      </span>
                      <span className="hidden text-sm text-text-muted md:block">{formatDate(c.last_order_at)}</span>
                      <span className="col-span-2 ps-[52px] text-xs text-text-muted md:hidden">
                        {c.order_count} طلب · {money(c.total_spent_cents)} · آخر طلب {formatDate(c.last_order_at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}

      {tab === "rewards" ? <RewardsPanel rewards={rewards} /> : null}
      {tab === "notifications" ? <NotificationsPanel notifications={notifications} /> : null}

      <Sheet open={openCustomer != null} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent side="left" className="w-full max-w-md gap-0 bg-bg-surface p-0 sm:max-w-md">
          {openCustomer ? <CustomerPanel key={openCustomer.customer_id} customer={openCustomer} {...props} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CustomerPanel({
  customer: c,
  rewards,
  phoneCountryPrefix,
  restaurantName,
  currencyCode,
  pointValueCents,
  secondaryCurrencyCode,
  secondaryExchangeRate,
}: Props & { customer: LoyaltyDashboardCustomer }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [points, setPoints] = useState("");
  const [rewardId, setRewardId] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const money = (cents: number) => formatMenuPrice(cents, currencyCode);
  const rate = secondaryExchangeRate != null ? Number(secondaryExchangeRate) : NaN;
  const showSecondary = Boolean(secondaryCurrencyCode) && Number.isFinite(rate) && rate > 0;

  const balanceValue = redemptionValueCents(c.points_balance, pointValueCents);
  const pointsNum = Math.floor(Number(points) || 0);
  const redeemPreview = pointsNum > 0 ? redemptionValueCents(Math.min(pointsNum, c.points_balance), pointValueCents) : 0;
  const activeRewards = rewards.filter((r) => r.active);

  function withLink(fn: (url: string) => void | Promise<void>) {
    startTransition(async () => {
      const res = await generateCustomerMagicLink(c.customer_id);
      if (res.error || !res.url) {
        toast.error("تعذر إنشاء رابط النقاط", { description: res.error ?? undefined });
        return;
      }
      await fn(res.url);
    });
  }

  return (
    <div className="flex h-full flex-col" dir="rtl">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand">
            {c.name?.trim().charAt(0) || "#"}
          </span>
          <div className="min-w-0">
            <SheetTitle className="truncate font-display text-xl font-bold text-text-primary">{c.name?.trim() || "زبون"}</SheetTitle>
            <SheetDescription className="font-mono text-sm text-text-muted" dir="ltr">
              <span className="block text-end">{c.phone_normalized}</span>
            </SheetDescription>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white">
          <p className="text-sm text-white/80">رصيد النقاط</p>
          <p className="mt-1 font-display text-4xl font-bold tabular-nums">{c.points_balance.toLocaleString("en")}</p>
          <p className="mt-1 text-sm text-white/85">
            قيمتها ≈ <span dir="ltr">{money(balanceValue)}</span>
            {showSecondary && secondaryCurrencyCode ? (
              <span dir="ltr"> · {formatMenuPrice(secondaryCentsFromPrimaryCents(balanceValue, rate), secondaryCurrencyCode)}</span>
            ) : null}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["الطلبات", String(c.order_count)],
            ["المشتريات", money(c.total_spent_cents)],
            ["نقاط مكتسبة", String(c.lifetime_earned)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border px-2 py-3">
              <p className="truncate text-sm font-bold tabular-nums">{value}</p>
              <p className="mt-0.5 text-[11px] text-text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold">تواصل مع الزبون</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                withLink((url) => {
                  const msg = buildWhatsAppLoyaltyPointsMessage({
                    restaurantName,
                    customerName: c.name,
                    pointsBalance: c.points_balance,
                    loyaltyPageUrl: url,
                  });
                  const digits = normalizeInternationalDigits(phoneCountryPrefix, c.phone_normalized);
                  window.open(buildWhatsAppMeUrl(digits, msg), "_blank", "noopener,noreferrer");
                })
              }
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25d366] text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              <MessageCircleIcon className="size-4" />
              رصيده عبر واتساب
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                withLink(async (url) => {
                  if (await copyText(url)) {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                    toast.success("تم نسخ رابط صفحة النقاط");
                  } else {
                    toast.message("انسخ الرابط يدوياً", { description: url, duration: 8000 });
                  }
                })
              }
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-text-secondary transition hover:text-text-primary disabled:opacity-60"
            >
              {linkCopied ? <CheckIcon className="size-4 text-emerald-600" /> : <Link2Icon className="size-4" />}
              {linkCopied ? "تم النسخ" : "نسخ رابط النقاط"}
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await enqueueCustomerPointsNotification(c.customer_id);
                if (res.error) toast.error(res.error);
                else {
                  toast.success("أُضيفت رسالة الرصيد لطابور الإشعارات");
                  router.refresh();
                }
              })
            }
            className="flex w-full items-center justify-center gap-2 py-1 text-xs font-semibold text-text-muted hover:text-text-primary"
          >
            <BellIcon className="size-3.5" />
            إضافة رسالة SMS للطابور
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-border p-4">
          <div>
            <p className="text-sm font-bold">خصم نقاط من الفاتورة</p>
            <p className="text-xs text-text-muted">تُخصم النقاط من رصيده، وتطبّق قيمة الخصم على حسابه عند الدفع.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={c.points_balance}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="عدد النقاط"
              className={inputCls}
              dir="ltr"
            />
            <button
              type="button"
              disabled={pending || pointsNum < 1 || c.points_balance < 1}
              onClick={() =>
                startTransition(async () => {
                  const res = await redeemCustomerCashPoints(c.customer_id, pointsNum, null);
                  if (res.error) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(`خُصمت ${res.pointsRedeemed} نقطة`, {
                    description: `اخصم ${money(res.discountCents)} من فاتورة الزبون. الرصيد الجديد: ${res.newBalance}`,
                    duration: 8000,
                  });
                  setPoints("");
                  router.refresh();
                })
              }
              className="h-11 shrink-0 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              خصم
            </button>
          </div>
          {pointsNum > 0 ? (
            <p className="text-xs font-semibold text-brand">
              قيمة الخصم: <span dir="ltr">{money(redeemPreview)}</span>
              {pointsNum > c.points_balance ? " (الرصيد المتاح فقط)" : ""}
            </p>
          ) : null}
        </div>

        {activeRewards.length ? (
          <div className="space-y-3 rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">استبدال مكافأة</p>
            <div className="space-y-2">
              {activeRewards.map((r) => {
                const affordable = c.points_balance >= r.points_cost;
                return (
                  <label
                    key={r.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                      rewardId === r.id ? "border-brand bg-brand-light" : "border-border",
                      !affordable && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="reward"
                      className="accent-[var(--brand)]"
                      disabled={!affordable}
                      checked={rewardId === r.id}
                      onChange={() => setRewardId(r.id)}
                    />
                    <GiftIcon className="size-4 shrink-0 text-brand" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.title}</span>
                    <span className="text-xs font-bold tabular-nums text-text-muted">{r.points_cost} نقطة</span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              disabled={pending || !rewardId}
              onClick={() =>
                startTransition(async () => {
                  const res = await redeemCustomerReward(c.customer_id, rewardId);
                  if (res.error) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(`تم الاستبدال وخُصمت ${res.pointsSpent} نقطة`, { description: `الرصيد الجديد: ${res.newBalance}` });
                  setRewardId("");
                  router.refresh();
                })
              }
              className="h-11 w-full rounded-xl border border-brand text-sm font-bold text-brand transition hover:bg-brand-light disabled:opacity-50"
            >
              استبدال المكافأة
            </button>
          </div>
        ) : null}

        <p className="text-center text-xs text-text-muted">
          آخر طلب {formatDate(c.last_order_at)} · استبدل {c.lifetime_redeemed} نقطة حتى الآن
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type RewardDraft = { id?: string; title: string; description: string; pointsCost: string; stock: string; active: boolean };
const EMPTY_REWARD: RewardDraft = { title: "", description: "", pointsCost: "100", stock: "", active: true };

function RewardsPanel({ rewards }: { rewards: RewardRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<RewardDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(d: RewardDraft, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await upsertRestaurantReward({
        id: d.id,
        title: d.title,
        description: d.description || null,
        pointsCost: Number(d.pointsCost),
        active: d.active,
        optionalStock: d.stock.trim() ? Number(d.stock) : null,
      });
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">مكافآت يستبدلها الزبون بنقاطه، مثل مشروب مجاني أو حلوى.</p>
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_REWARD })}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          <PlusIcon className="size-4" />
          مكافأة جديدة
        </button>
      </div>

      {rewards.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border-strong px-6 py-14 text-center">
          <GiftIcon className="mx-auto size-10 text-text-muted" />
          <p className="mt-3 font-display text-lg font-bold">لا توجد مكافآت بعد</p>
          <p className="mt-1 text-sm text-text-muted">أضف أول مكافأة ليتحمّس زبائنك لجمع النقاط.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r) => (
            <div key={r.id} className={cn("rounded-[20px] border border-border bg-bg-surface p-4", !r.active && "opacity-60")}>
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/20 text-amber-700 dark:text-gold">
                  <GiftIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.title}</p>
                  {r.description ? <p className="line-clamp-2 text-xs text-text-muted">{r.description}</p> : null}
                </div>
                <button
                  type="button"
                  aria-label="تعديل"
                  onClick={() =>
                    setDraft({
                      id: r.id,
                      title: r.title,
                      description: r.description ?? "",
                      pointsCost: String(r.points_cost),
                      stock: r.optional_stock == null ? "" : String(r.optional_stock),
                      active: r.active,
                    })
                  }
                  className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface-2 hover:text-text-primary"
                >
                  <PencilIcon className="size-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="font-display text-lg font-bold tabular-nums text-brand">
                  {r.points_cost} <span className="text-xs font-semibold text-text-muted">نقطة</span>
                </span>
                <span className="text-xs text-text-muted">{r.optional_stock == null ? "" : `المتبقي ${r.optional_stock}`}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.active}
                  aria-label={r.active ? "إيقاف المكافأة" : "تفعيل المكافأة"}
                  disabled={pending}
                  onClick={() =>
                    save({
                      id: r.id,
                      title: r.title,
                      description: r.description ?? "",
                      pointsCost: String(r.points_cost),
                      stock: r.optional_stock == null ? "" : String(r.optional_stock),
                      active: !r.active,
                    })
                  }
                  className={cn("relative h-6 w-11 rounded-full transition", r.active ? "bg-emerald-500" : "bg-border-strong")}
                >
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", r.active ? "start-[22px]" : "start-0.5")} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={draft != null} onOpenChange={(v) => !v && setDraft(null)}>
        <SheetContent side="left" className="w-full max-w-md gap-0 bg-bg-surface p-0 sm:max-w-md">
          {draft ? (
            <form
              dir="rtl"
              className="flex h-full flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                save(draft, () => setDraft(null));
              }}
            >
              <div className="border-b border-border px-5 py-4">
                <SheetTitle className="font-display text-xl font-bold">{draft.id ? "تعديل المكافأة" : "مكافأة جديدة"}</SheetTitle>
                <SheetDescription className="text-xs text-text-muted">تظهر للزبون في صفحة نقاطه</SheetDescription>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold">اسم المكافأة</span>
                  <input
                    required
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="مثال: قهوة عربية مجاناً"
                    className={inputCls}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold">الوصف (اختياري)</span>
                  <textarea
                    rows={3}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className={cn(inputCls, "h-auto py-2.5")}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold">تكلفتها بالنقاط</span>
                    <input
                      required
                      type="number"
                      min={1}
                      dir="ltr"
                      value={draft.pointsCost}
                      onChange={(e) => setDraft({ ...draft, pointsCost: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold">الكمية (اختياري)</span>
                    <input
                      type="number"
                      min={0}
                      dir="ltr"
                      value={draft.stock}
                      onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                      placeholder="غير محدودة"
                      className={inputCls}
                    />
                  </label>
                </div>
                <label className="flex items-center justify-between rounded-2xl border border-border p-4">
                  <span className="text-sm font-bold">مكافأة مفعّلة</span>
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--brand)]"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  />
                </label>
                {error ? <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">{error}</p> : null}
              </div>
              <div className="flex gap-2 border-t border-border p-4">
                <button
                  type="submit"
                  disabled={pending}
                  className="h-12 flex-1 rounded-xl bg-brand text-[15px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {pending ? "جارٍ الحفظ…" : "حفظ"}
                </button>
                <button type="button" onClick={() => setDraft(null)} className="h-12 rounded-xl border border-border px-5 text-sm font-semibold text-text-secondary">
                  إلغاء
                </button>
              </div>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function NotificationsPanel({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const queued = notifications.filter((n) => n.status === "queued").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-bg-surface p-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-bold">رسائل الرصيد للعملاء</p>
          <p className="text-sm text-text-muted">
            الإرسال الفعلي عبر SMS غير مربوط بعد — استخدم زر واتساب في صفحة العميل لإرسال رصيده مباشرة.
          </p>
        </div>
        <button
          type="button"
          disabled={pending || queued === 0}
          onClick={() =>
            startTransition(async () => {
              const res = await processQueuedNotifications();
              if (res.error) toast.error(res.error);
              else toast.success(`تمت معالجة ${res.processed} رسالة`);
              router.refresh();
            })
          }
          className="h-10 shrink-0 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          معالجة الطابور ({queued})
        </button>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-bg-surface">
        {notifications.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-text-muted">لا توجد رسائل بعد.</p>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => {
              const st = NOTIFICATION_STATUS[n.status] ?? { label: n.status, cls: "bg-bg-surface-2 text-text-muted" };
              return (
                <li key={n.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-bg-surface-2 text-text-muted">
                    <BellIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      رسالة رصيد النقاط · <span className="uppercase">{n.channel}</span>
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {new Date(n.created_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                      {n.error ? ` · ${n.error}` : ""}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", st.cls)}>{st.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
