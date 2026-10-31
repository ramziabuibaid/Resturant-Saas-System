import Link from "next/link";
import { CheckIcon, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const BENEFITS = [
  "أسعار بالدولار والليرة — وتحديث سعر الصرف بلمسة",
  "رمز QR لكل طاولة والطلب يصلك فوراً",
  "نقاط ولاء لزبائنك وإرسال الرصيد عبر واتساب",
  "أول شهر مجاناً — بدون بطاقة بنكية",
];

const STEPS = ["الحساب", "المطعم", "لوحة التحكم"];

/** إطار صفحات الدخول والتسجيل: لوحة الهوية + النموذج + خطوات التسجيل */
export function AuthShell({
  title,
  subtitle,
  step,
  children,
}: {
  /** بدونه: النموذج يعرض عنوانه بنفسه (مثل صفحة الدخول) */
  title?: string;
  subtitle?: string;
  /** رقم خطوة التسجيل (1 أو 2) — بدونه لا تظهر الخطوات */
  step?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh bg-bg-base lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" dir="rtl">
      <aside className="relative hidden overflow-hidden bg-[#140d09] p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_10%,color-mix(in_oklab,var(--brand)_55%,transparent),transparent_70%)]" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand">
            <Flame className="size-5" />
          </span>
          <span className="font-display text-xl font-bold">منيو</span>
        </Link>
        <div className="relative mt-auto space-y-6">
          <h2 className="font-display text-4xl font-bold leading-tight">
            منيو مطعمك أونلاين
            <br />
            <span className="text-[#ff8a5c]">بدقيقتين.</span>
          </h2>
          <ul className="space-y-3 text-[15px] text-white/85">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/90">
                  <CheckIcon className="size-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-6">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white">
              <Flame className="size-5" />
            </span>
            <span className="font-display text-lg font-bold">منيو</span>
          </Link>

          {step ? (
            <ol className="flex items-center gap-2 text-xs font-semibold">
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px]",
                      i + 1 < step ? "bg-emerald-500 text-white" : i + 1 === step ? "bg-brand text-white" : "bg-bg-surface-2 text-text-muted"
                    )}
                  >
                    {i + 1 < step ? <CheckIcon className="size-3.5" /> : i + 1}
                  </span>
                  <span className={i + 1 === step ? "text-text-primary" : "text-text-muted"}>{s}</span>
                  {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
                </li>
              ))}
            </ol>
          ) : null}

          {title ? (
            <div>
              <h1 className="font-display text-3xl font-bold">{title}</h1>
              {subtitle ? <p className="mt-1.5 text-text-secondary">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}

export const authInputCls =
  "h-12 w-full rounded-xl border border-border bg-bg-surface px-4 text-[15px] text-text-primary outline-none placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export const authButtonCls =
  "flex h-12 w-full items-center justify-center rounded-xl bg-brand text-[15px] font-bold text-white shadow-[0_12px_28px_-14px_var(--brand)] transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60";
