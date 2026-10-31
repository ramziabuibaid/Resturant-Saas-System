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
  updateRestaurantStatus,
  updateRestaurantSubdomain,
} from "@/app/actions/super-admin";
import { createOrUpdateOwnerCredentials, updateOwnerPassword } from "@/app/actions/owner-credentials";
import type { PlatformRestaurantRow } from "@/lib/data/platform";
import { cn } from "@/lib/utils";

type Status = PlatformRestaurantRow["status"];

const STATUS: Record<Status, { label: string; cls: string; hint: string }> = {
  active: { label: "نشط", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300", hint: "مشترك فعّال" },
  trial: { label: "تجريبي", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300", hint: "فترة تجربة" },
  suspended: { label: "موقوف", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300", hint: "المنيو والطلبات متوقفة" },
};

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
  const [filter, setFilter] = useState<Status | "all">("all");
  const router = useRouter();
  const [creating, setCreatingState] = useState(openNew);
  const [manageId, setManageId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return restaurants.filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
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
            onChange={(e) => setFilter(e.target.value as Status | "all")}
            className={cn(inputCls, "bg-bg-surface sm:w-40")}
            aria-label="تصفية حسب الحالة"
          >
            <option value="all">كل الحالات ({restaurants.length})</option>
            {(Object.keys(STATUS) as Status[]).map((s) => (
              <option key={s} value={s}>
                {STATUS[s].label} ({restaurants.filter((r) => r.status === s).length})
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
          <span>الحالة</span>
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
                      {r.ownerUsername ? (
                        <>
                          {" · "}
                          <span className="font-mono">{r.ownerUsername}</span>
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
                <span className={cn("hidden w-fit rounded-full px-2.5 py-1 text-[11px] font-bold md:inline-block", STATUS[r.status].cls)}>
                  {STATUS[r.status].label}
                </span>
                <div className="flex items-center gap-1">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold md:hidden", STATUS[r.status].cls)}>{STATUS[r.status].label}</span>
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
                  {r.items} صنف · {r.tables} طاولة · {r.orders30d} طلب في 30 يوماً
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
  const [status, setStatus] = useState<Status>("trial");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createRestaurant({ name, subdomain, status });
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
        <Field label="الحالة">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-bg-surface-2 p-1">
            {(Object.keys(STATUS) as Status[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn("h-9 rounded-lg text-sm font-semibold transition", status === s ? "bg-bg-surface shadow-sm" : "text-text-muted")}
              >
                {STATUS[s].label}
              </button>
            ))}
          </div>
        </Field>

        <div className="space-y-4 rounded-2xl border border-border p-4">
          <div>
            <p className="text-sm font-bold">دخول صاحب المطعم</p>
            <p className="text-xs text-text-muted">اختياري الآن — يمكنك إضافته لاحقاً من إدارة المطعم.</p>
          </div>
          <Field label="اسم المستخدم">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="owner"
              dir="ltr"
              autoComplete="off"
              className={cn(inputCls, "font-mono")}
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
  const [username, setUsername] = useState(r.ownerUsername ?? "");
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

  const usernameChanged = username.trim().toLowerCase() !== (r.ownerUsername ?? "");

  return (
    <div dir="rtl" className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <SheetTitle className="font-display text-xl font-bold">{r.name}</SheetTitle>
        <SheetDescription className="text-xs text-text-muted">
          أُنشئ في {new Date(r.createdAt).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })} · {r.items} صنف · {r.orders30d} طلب في 30 يوماً
        </SheetDescription>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <section className="space-y-2">
          <p className="text-sm font-bold">حالة الاشتراك</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(STATUS) as Status[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending || r.status === s}
                onClick={() => run(() => updateRestaurantStatus(r.id, s), `أصبحت الحالة: ${STATUS[s].label}`)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-center transition disabled:cursor-default",
                  r.status === s ? "border-brand bg-brand-light" : "border-border hover:border-border-strong"
                )}
              >
                <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-bold", STATUS[s].cls)}>{STATUS[s].label}</span>
                <span className="mt-1 block text-[11px] text-text-muted">{STATUS[s].hint}</span>
              </button>
            ))}
          </div>
        </section>

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
          <Field label="اسم المستخدم">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              dir="ltr"
              autoComplete="off"
              placeholder="owner"
              className={cn(inputCls, "font-mono")}
            />
          </Field>
          <Field label={r.ownerUsername ? "كلمة مرور جديدة" : "كلمة المرور"}>
            <PasswordInput value={password} onChange={setPassword} />
          </Field>
          <button
            type="button"
            disabled={pending || !username.trim() || !password}
            onClick={() =>
              r.ownerUsername && !usernameChanged
                ? run(() => updateOwnerPassword(r.id, password), "تم تغيير كلمة المرور وتسجيل خروجه من كل الأجهزة", () => setPassword(""))
                : run(() => createOrUpdateOwnerCredentials(r.id, username, password), "تم حفظ بيانات الدخول", () => setPassword(""))
            }
            className="h-11 w-full rounded-xl border border-brand text-sm font-bold text-brand transition hover:bg-brand-light disabled:opacity-50"
          >
            {r.ownerUsername ? "حفظ بيانات الدخول" : "إنشاء مستخدم الدخول"}
          </button>
          <p className="text-[11px] text-text-muted">أرسل البيانات لصاحب المطعم بطريقة آمنة؛ تغيير كلمة المرور ينهي جلساته المفتوحة.</p>
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
