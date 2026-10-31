"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLinkIcon,
  KeyRoundIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  ShuffleIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  createRestaurant,
  deleteRestaurant,
  extendTrial,
  recordSubscriptionPayment,
  updateRestaurantPlan,
  updateRestaurantStatus,
  updateRestaurantSubdomain,
} from "@/app/actions/super-admin";
import { PLAN_LIST, PLANS, suggestedAmountCents, type PlanId } from "@/lib/plans";
import type { SubscriptionState } from "@/lib/subscription";
import { formatDateAr, SUB_STATE_UI, subscriptionSummary } from "@/lib/subscription-ui";
import { createOrUpdateOwnerCredentials, updateOwnerPassword } from "@/app/actions/owner-credentials";
import type { PlatformRestaurantRow } from "@/lib/data/platform";
import { cn } from "@/lib/utils";

const STATES = Object.keys(SUB_STATE_UI) as SubscriptionState[];
const usd = (cents: number) => `$${(cents / 100).toLocaleString("en", { maximumFractionDigits: 2 })}`;

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-bg-base px-3.5 text-[15px] text-text-primary outline-none placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";

/** كلمة مرور عشوائية سهلة القراءة (بدون حروف ملتبسة) */
function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function siteUrl(subdomain: string, rootHost: string, proto: string) {
  return rootHost ? `${proto}://${subdomain}.${rootHost}` : "";
}

export function RestaurantsTable({
  restaurants,
  rootHost,
  proto,
  openNew,
}: {
  restaurants: PlatformRestaurantRow[];
  /** النطاق الرئيسي مثل resturant.app أو localhost:3001 */
  rootHost: string;
  proto: string;
  openNew: boolean;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<SubscriptionState | "all">("all");
  const router = useRouter();
  const [creating, setCreatingState] = useState(openNew);
  const [manageId, setManageId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return restaurants.filter(
      (r) =>
        (filter === "all" || r.subState === filter) &&
        (!query || r.name.toLowerCase().includes(query) || r.subdomain.includes(query))
    );
  }, [restaurants, q, filter]);

  const managed = restaurants.find((r) => r.id === manageId) ?? null;

  function setCreating(v: boolean) {
    setCreatingState(v);
    // رابط «مطعم جديد» من النظرة العامة يحمل ?new=1 — نزيله حتى لا يُعاد فتح النموذج عند التحديث
    if (!v && openNew) router.replace("/admin/restaurants");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو النطاق…" className={cn(inputCls, "bg-bg-surface ps-10")} />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as SubscriptionState | "all")}
            className={cn(inputCls, "bg-bg-surface sm:w-40")}
            aria-label="تصفية حسب الحالة"
          >
            <option value="all">كل الحالات ({restaurants.length})</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {SUB_STATE_UI[s].label} ({restaurants.filter((r) => r.subState === s).length})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark"
          >
            <PlusIcon className="size-4" />
            مطعم جديد
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[20px] border border-border bg-bg-surface">
        <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] gap-4 border-b border-border bg-bg-surface-2/50 px-5 py-2.5 text-xs font-semibold text-text-muted md:grid">
          <span>المطعم</span>
          <span>المنيو</span>
          <span>الطلبات (30 يوماً)</span>
          <span>الاشتراك</span>
          <span className="w-20" />
        </div>
        {shown.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-text-muted">{restaurants.length ? "لا نتائج مطابقة." : "لا توجد مطاعم بعد."}</p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] md:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-light font-bold text-brand">
                    {r.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.logoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      r.name.charAt(0)
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-text-muted">
                      <span className="font-mono">{r.subdomain}</span>
                      {r.ownerLogin ? (
                        <>
                          {" · "}
                          <span className="font-mono">{r.ownerLogin}</span>
                        </>
                      ) : (
                        <span className="font-semibold text-amber-600 dark:text-amber-400"> · بلا مستخدم دخول</span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="hidden text-sm text-text-secondary md:block">
                  {r.items} صنف · {r.tables} طاولة
                </p>
                <p className="hidden text-sm md:block">
                  <span className="font-semibold tabular-nums">{r.orders30d}</span>
                  {r.ordersToday ? <span className="text-xs text-emerald-600 dark:text-emerald-400"> · {r.ordersToday} اليوم</span> : null}
                </p>
                <div className="hidden md:block">
                  <span className={cn("inline-block rounded-full px-2.5 py-1 text-[11px] font-bold", SUB_STATE_UI[r.subState].cls)}>
                    {SUB_STATE_UI[r.subState].label} · {PLANS[r.plan].name}
                  </span>
                  <p className="mt-1 text-[11px] text-text-muted">{subscriptionSummary(r.subState, r.daysLeft, r.subState === "trial" ? r.trialEndsAt : r.paidUntil)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold md:hidden", SUB_STATE_UI[r.subState].cls)}>{SUB_STATE_UI[r.subState].label}</span>
                  <a
                    href={siteUrl(r.subdomain, rootHost, proto)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="فتح المنيو"
                    className="flex size-9 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface-2 hover:text-text-primary"
                  >
                    <ExternalLinkIcon className="size-4" />
                  </a>
                  <button
                    type="button"
                    aria-label="إدارة المطعم"
                    onClick={() => setManageId(r.id)}
                    className="flex size-9 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface-2 hover:text-text-primary"
                  >
                    <Settings2Icon className="size-4" />
                  </button>
                </div>
                <p className="col-span-2 text-xs text-text-muted md:hidden">
                  {PLANS[r.plan].name} · {subscriptionSummary(r.subState, r.daysLeft, r.subState === "trial" ? r.trialEndsAt : r.paidUntil)} · {r.orders30d} طلب في 30 يوماً
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent side="left" className="w-full max-w-md gap-0 bg-bg-surface p-0 sm:max-w-md">
          {creating ? <NewRestaurantForm rootHost={rootHost} onDone={() => setCreating(false)} /> : null}
        </SheetContent>
      </Sheet>

      <Sheet open={managed != null} onOpenChange={(v) => !v && setManageId(null)}>
        <SheetContent side="left" className="w-full max-w-md gap-0 bg-bg-surface p-0 sm:max-w-md">
          {managed ? <ManageRestaurant key={managed.id} r={managed} rootHost={rootHost} onDeleted={() => setManageId(null)} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold">{label}</span>
        {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputCls, "font-mono")}
        dir="ltr"
        autoComplete="new-password"
        placeholder="8 أحرف على الأقل"
      />
      <button
        type="button"
        onClick={() => onChange(generatePassword())}
        title="توليد كلمة مرور"
        aria-label="توليد كلمة مرور"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-text-muted hover:text-text-primary"
      >
        <ShuffleIcon className="size-4" />
      </button>
    </div>
  );
}

function NewRestaurantForm({ rootHost, onDone }: { rootHost: string; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [plan, setPlan] = useState<PlanId>("pro");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createRestaurant({ name, subdomain, plan });
      if (res.error || !res.data) {
        setError(res.error ?? "تعذر إنشاء المطعم");
        return;
      }
      if (username.trim()) {
        const cred = await createOrUpdateOwnerCredentials(res.data.id, username, password);
        if (cred.error) {
          toast.warning("أُنشئ المطعم، لكن تعذر إنشاء مستخدم الدخول", { description: cred.error });
          router.refresh();
          onDone();
          return;
        }
      }
      toast.success(`أُنشئ «${res.data.name}»`);
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={submit} dir="rtl" className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <SheetTitle className="font-display text-xl font-bold">مطعم جديد</SheetTitle>
        <SheetDescription className="text-xs text-text-muted">أنشئ المطعم وبيانات دخول صاحبه في خطوة واحدة</SheetDescription>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <Field label="اسم المطعم">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مطعم البركة" className={inputCls} />
        </Field>
        <Field label="النطاق الفرعي" hint="حروف إنجليزية صغيرة وأرقام">
          <div className="flex items-center rounded-xl border border-border bg-bg-base focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20" dir="ltr">
            <input
              required
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="albaraka"
              className="h-11 min-w-0 flex-1 bg-transparent px-3.5 font-mono text-[15px] outline-none"
            />
            {rootHost ? <span className="pe-3.5 font-mono text-sm text-text-muted">.{rootHost}</span> : null}
          </div>
        </Field>
        <Field label="الخطة" hint="تبدأ بتجربة مجانية 30 يوماً بكل الميزات">
          <PlanPicker value={plan} onChange={setPlan} />
        </Field>

        <div className="space-y-4 rounded-2xl border border-border p-4">
          <div>
            <p className="text-sm font-bold">دخول صاحب المطعم</p>
            <p className="text-xs text-text-muted">اختياري الآن — يمكنك إضافته لاحقاً من إدارة المطعم.</p>
          </div>
          <Field label="بريد صاحب المطعم">
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="owner@example.com"
              dir="ltr"
              autoComplete="off"
              className={inputCls}
            />
          </Field>
          {username.trim() ? (
            <Field label="كلمة المرور">
              <PasswordInput value={password} onChange={setPassword} />
            </Field>
          ) : null}
        </div>
        {error ? <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">{error}</p> : null}
      </div>
      <div className="flex gap-2 border-t border-border p-4">
        <button type="submit" disabled={pending} className="h-12 flex-1 rounded-xl bg-brand text-[15px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60">
          {pending ? "جارٍ الإنشاء…" : "إنشاء المطعم"}
        </button>
        <button type="button" onClick={onDone} className="h-12 rounded-xl border border-border px-5 text-sm font-semibold text-text-secondary">
          إلغاء
        </button>
      </div>
    </form>
  );
}

function ManageRestaurant({ r, rootHost, onDeleted }: { r: PlatformRestaurantRow; rootHost: string; onDeleted: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subdomain, setSubdomain] = useState(r.subdomain);
  const [username, setUsername] = useState(r.ownerLogin?.includes("@") ? r.ownerLogin : "");
  const [password, setPassword] = useState("");
  const [confirmName, setConfirmName] = useState("");

  function run(fn: () => Promise<{ error: string | null }>, ok: string, after?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(ok);
      after?.();
      router.refresh();
    });
  }

  const usernameChanged = username.trim().toLowerCase() !== (r.ownerLogin ?? "");

  return (
    <div dir="rtl" className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <SheetTitle className="font-display text-xl font-bold">{r.name}</SheetTitle>
        <SheetDescription className="text-xs text-text-muted">
          أُنشئ في {new Date(r.createdAt).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })} · {r.items} صنف · {r.orders30d} طلب في 30 يوماً
        </SheetDescription>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <SubscriptionPanel r={r} pending={pending} run={run} />

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-sm font-bold">النطاق الفرعي</p>
          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-xl border border-border bg-bg-base focus-within:border-brand" dir="ltr">
              <input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="h-11 min-w-0 flex-1 bg-transparent px-3.5 font-mono text-[15px] outline-none"
              />
              {rootHost ? <span className="pe-3 font-mono text-xs text-text-muted">.{rootHost}</span> : null}
            </div>
            <button
              type="button"
              disabled={pending || !subdomain || subdomain === r.subdomain}
              onClick={() => run(() => updateRestaurantSubdomain(r.id, subdomain), "تم تغيير النطاق")}
              className="h-11 shrink-0 rounded-xl bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
          {subdomain !== r.subdomain ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">تنبيه: رموز QR المطبوعة بالنطاق القديم ستتوقف عن العمل.</p>
          ) : null}
        </section>

        <section className="space-y-3 rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-text-muted" />
            <p className="text-sm font-bold">دخول صاحب المطعم</p>
          </div>
          <Field label="البريد الإلكتروني">
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              autoComplete="off"
              placeholder="owner@example.com"
              className={inputCls}
            />
          </Field>
          <Field label={r.ownerLogin ? "كلمة مرور جديدة" : "كلمة المرور"} hint={r.ownerLogin ? "اتركها فارغة لتغيير البريد فقط" : undefined}>
            <PasswordInput value={password} onChange={setPassword} />
          </Field>
          <button
            type="button"
            disabled={pending || !username.trim() || (!password && (!r.ownerLogin || !usernameChanged))}
            onClick={() =>
              r.ownerLogin && !usernameChanged
                ? run(() => updateOwnerPassword(r.id, password), "تم تغيير كلمة المرور وتسجيل خروجه من كل الأجهزة", () => setPassword(""))
                : run(() => createOrUpdateOwnerCredentials(r.id, username, password), "تم حفظ بيانات الدخول", () => setPassword(""))
            }
            className="h-11 w-full rounded-xl border border-brand text-sm font-bold text-brand transition hover:bg-brand-light disabled:opacity-50"
          >
            {r.ownerLogin ? "حفظ بيانات الدخول" : "إنشاء حساب الدخول"}
          </button>
          <p className="text-[11px] text-text-muted">
            يستطيع صاحب المطعم أيضاً الدخول عبر Google بنفس البريد، أو استعادة كلمة المرور بنفسه. تغيير كلمة المرور ينهي جلساته المفتوحة.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-red-300/60 p-4 dark:border-red-500/30">
          <div className="flex items-center gap-2 text-danger">
            <Trash2Icon className="size-4" />
            <p className="text-sm font-bold">حذف المطعم نهائياً</p>
          </div>
          <p className="text-xs text-text-muted">يحذف المنيو والطلبات والعملاء والصور. اكتب اسم المطعم للتأكيد.</p>
          <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={r.name} className={inputCls} />
          <button
            type="button"
            disabled={pending || confirmName.trim() !== r.name}
            onClick={() => run(() => deleteRestaurant(r.id), "حُذف المطعم", onDeleted)}
            className="h-11 w-full rounded-xl bg-danger text-sm font-bold text-white disabled:opacity-40"
          >
            حذف المطعم
          </button>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PlanPicker({ value, onChange, disabled }: { value: PlanId; onChange: (p: PlanId) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PLAN_LIST.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p.id)}
          className={cn(
            "rounded-xl border px-2 py-2.5 text-center transition disabled:opacity-60",
            value === p.id ? "border-brand bg-brand-light" : "border-border hover:border-border-strong"
          )}
        >
          <span className="block text-sm font-bold">{p.name}</span>
          <span className="block text-[11px] text-text-muted" dir="ltr">
            {usd(p.monthlyCents)}/mo
          </span>
        </button>
      ))}
    </div>
  );
}

const MONTH_CHOICES = [1, 3, 6, 12];

function SubscriptionPanel({
  r,
  pending,
  run,
}: {
  r: PlatformRestaurantRow;
  pending: boolean;
  run: (fn: () => Promise<{ error: string | null }>, ok: string, after?: () => void) => void;
}) {
  const [payPlan, setPayPlan] = useState<PlanId>(r.plan);
  const [months, setMonths] = useState(12);
  const [amount, setAmount] = useState(String(suggestedAmountCents(r.plan, 12) / 100));
  const [note, setNote] = useState("");

  function pick(plan: PlanId, m: number) {
    setPayPlan(plan);
    setMonths(m);
    setAmount(String(suggestedAmountCents(plan, m) / 100));
  }

  const ui = SUB_STATE_UI[r.subState];
  const endsAt = r.subState === "trial" ? r.trialEndsAt : r.paidUntil;

  return (
    <section className="space-y-4 rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">الاشتراك</p>
          <p className="mt-0.5 text-xs text-text-muted">{subscriptionSummary(r.subState, r.daysLeft, endsAt)}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", ui.cls)}>{ui.label}</span>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-text-muted">الخطة الحالية</p>
        <PlanPicker
          value={r.plan}
          disabled={pending}
          onChange={(p) => p !== r.plan && run(() => updateRestaurantPlan(r.id, p), `أصبحت الخطة: ${PLANS[p].name}`)}
        />
      </div>

      {r.status === "trial" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-muted">تمديد التجربة:</span>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              disabled={pending}
              onClick={() => run(() => extendTrial(r.id, d), `مُددت التجربة ${d} يوماً`)}
              className="h-8 rounded-lg border border-border px-3 text-xs font-semibold hover:border-brand hover:text-brand disabled:opacity-50"
            >
              +{d} يوم
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl bg-bg-surface-2/60 p-3">
        <p className="text-sm font-bold">تسجيل دفعة</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MONTH_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pick(payPlan, m)}
              className={cn(
                "h-9 rounded-lg text-xs font-semibold transition",
                months === m ? "bg-brand text-white" : "bg-bg-surface text-text-secondary"
              )}
            >
              {m === 12 ? "سنة" : `${m} ${m === 1 ? "شهر" : "أشهر"}`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={payPlan}
            onChange={(e) => pick(e.target.value as PlanId, months)}
            className={cn(inputCls, "h-10 bg-bg-surface text-sm")}
            aria-label="خطة الدفعة"
          >
            {PLAN_LIST.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex h-10 w-36 shrink-0 items-center rounded-xl border border-border bg-bg-surface focus-within:border-brand" dir="ltr">
            <span className="ps-3 text-sm text-text-muted">$</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              aria-label="المبلغ بالدولار"
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold outline-none"
            />
          </div>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ملاحظة (اختياري): تحويل بنكي، نقداً…"
          className={cn(inputCls, "h-10 bg-bg-surface text-sm")}
        />
        <button
          type="button"
          disabled={pending || !amount}
          onClick={() =>
            run(
              () =>
                recordSubscriptionPayment({
                  restaurantId: r.id,
                  plan: payPlan,
                  months,
                  amountCents: Math.round(Number(amount) * 100),
                  note,
                }),
              "سُجّلت الدفعة وفُعّل الاشتراك",
              () => setNote("")
            )
          }
          className="h-10 w-full rounded-xl bg-brand text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          تسجيل الدفعة وتفعيل {months === 12 ? "سنة" : `${months} ${months === 1 ? "شهر" : "أشهر"}`}
        </button>
      </div>

      {r.payments.length ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-text-muted">الدفعات</p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {r.payments.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {PLANS[p.plan].name} · {p.months === 12 ? "سنة" : `${p.months} ${p.months === 1 ? "شهر" : "أشهر"}`}
                  </span>
                  <span className="block truncate text-text-muted">
                    {formatDateAr(p.createdAt)}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-bold tabular-nums" dir="ltr">
                  {usd(p.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          r.status === "suspended"
            ? run(() => updateRestaurantStatus(r.id, r.paidUntil ? "active" : "trial"), "أُعيد تفعيل المطعم")
            : run(() => updateRestaurantStatus(r.id, "suspended"), "أُوقف المطعم")
        }
        className={cn(
          "h-10 w-full rounded-xl border text-sm font-semibold transition disabled:opacity-50",
          r.status === "suspended"
            ? "border-emerald-500 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
            : "border-border text-text-secondary hover:border-red-400 hover:text-danger"
        )}
      >
        {r.status === "suspended" ? "إعادة تفعيل المطعم" : "إيقاف المطعم مؤقتاً (المنيو والطلبات)"}
      </button>
    </section>
  );
}
