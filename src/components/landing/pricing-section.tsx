"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_LIST } from "@/lib/plans";

// النصوص التسويقية فقط — الأسعار والميزات من src/lib/plans.ts
const PLAN_COPY = {
  basic: { cta: "ابدأ بالأساسية", trial: true, featured: false },
  pro: { cta: "ابدأ بالاحترافية", trial: true, featured: true },
  chain: { cta: "تواصل معنا", trial: false, featured: false },
} as const;

const PLANS = PLAN_LIST.map((p) => ({
  name: p.name,
  desc: p.desc,
  monthly: p.monthlyCents / 100,
  yearly: p.yearlyMonthlyCents / 100,
  features: p.highlights,
  ...PLAN_COPY[p.id],
}));

export function PricingSection() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold text-brand">الأسعار</p>
        <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">خطط تناسب كل مطعم</h2>
        <p className="mt-4 text-lg text-text-secondary">أول شهر مجاناً — بدون بطاقة بنكية. وفّر أكثر مع الاشتراك السنوي.</p>
      </div>

      <div className="mt-10 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-bg-surface p-1 text-sm font-semibold">
          {[
            { v: false, label: "شهري" },
            { v: true, label: "سنوي · وفّر 35%" },
          ].map(({ v, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setYearly(v)}
              className={cn("rounded-full px-5 py-2 transition", yearly === v ? "bg-brand text-white" : "text-text-secondary hover:text-text-primary")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={cn(
              "relative flex flex-col rounded-[26px] border bg-bg-surface p-7",
              p.featured ? "border-brand shadow-[0_24px_60px_-30px_var(--brand)] lg:-translate-y-3" : "border-border"
            )}
          >
            {p.featured ? (
              <span className="absolute -top-3 start-7 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">الأكثر طلباً</span>
            ) : null}
            <h3 className="text-lg font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-text-muted">{p.desc}</p>
            <p className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold" dir="ltr">${yearly ? p.yearly : p.monthly}</span>
              <span className="text-text-muted">/ شهرياً</span>
            </p>
            <p className="mt-1 h-5 text-xs text-text-muted">{yearly ? "تُدفع سنوياً" : ""}</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className={cn(
                "mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold transition",
                p.featured ? "bg-brand text-white hover:bg-brand-dark" : "border border-border-strong hover:bg-bg-surface-2"
              )}
            >
              {p.cta}
            </Link>
            {p.trial ? <p className="mt-3 text-center text-xs text-text-muted">أول شهر مجاناً</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
