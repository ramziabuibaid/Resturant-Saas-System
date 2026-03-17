"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  QrCode,
  LayoutDashboard,
  Globe,
  UtensilsCrossed,
  Sparkles,
  Store,
  ChevronLeft,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubdomainRedirect } from "@/components/subdomain-redirect";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export function LandingPage() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <SubdomainRedirect />

      {/* Nav */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-bg-base/80 backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold text-text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
              <UtensilsCrossed className="size-4" />
            </span>
            منيو
          </span>
          <nav className="flex items-center gap-4">
            <a
              href="#features"
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              الميزات
            </a>
            <a
              href="#pricing"
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              الأسعار
            </a>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                تسجيل الدخول
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">ابدأ الآن</Button>
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-brand/8 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand"
          >
            <Sparkles className="size-4" />
            منصة استضافة المطاعم والمنيو الرقمي
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="text-4xl font-bold leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl"
          >
            منيو مطعمك على الهواء
            <br />
            <span className="text-brand">كود QR واحد. زبائن أكثر.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary"
          >
            استضف صفحة المنيو، لوحة تحكم بسيطة، ورمز QR يفتح المنيو أمام زبائنك فوراً. ابدأ من اليوم بدون تعقيد.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                <ChevronLeft className="size-4" />
                إنشاء حساب المطعم
              </Button>
            </Link>
            <Link href="#pricing">
              <Button variant="outline" size="lg">
                عرض الخطط والأسعار
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.h2
            {...fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-text-primary md:text-4xl"
          >
            كل ما تحتاجه لإدارة منيو مطعمك
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mx-auto mt-4 max-w-2xl text-center text-text-secondary"
          >
            من صفحة منيو واحدة إلى نظام كامل للطاولات والطلبات والولاء — اختر ما يناسب حجم مطعمك.
          </motion.p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: QrCode,
                title: "رمز QR للمطعم",
                desc: "كود واحد يفتح المنيو للزبائن من هواتفهم دون تطبيقات.",
              },
              {
                icon: LayoutDashboard,
                title: "لوحة تحكم أساسية",
                desc: "إدارة المنيو، التصنيفات، والأصناف من مكان واحد.",
              },
              {
                icon: Globe,
                title: "دومين خاص (الخطة الاحترافية)",
                desc: "عنوانك الخاص مثل menu.restaurant.com لتعزيز الهوية.",
              },
              {
                icon: Store,
                title: "للسلاسل (الخطة الأعلى)",
                desc: "إدارة عدة فروع، منيو متقدم، وتعقيدات احترافية.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="rounded-xl border border-border bg-bg-surface p-6 shadow-sm transition hover:border-brand/30 hover:shadow-md"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-brand/15 text-brand">
                  <item.icon className="size-6" />
                </div>
                <h3 className="font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60 bg-bg-surface/50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.h2
            {...fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-text-primary md:text-4xl"
          >
            خطط اشتراك تناسب كل مطعم
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mt-4 max-w-xl text-center text-text-secondary"
          >
            أول شهر مجاناً للخطة الأساسية والاحترافية — دون إدخال فيزا أو بطاقة بنكية. ادفع شهرياً أو وفر مع الاشتراك السنوي.
          </motion.p>

          {/* Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-10 flex justify-center"
          >
            <div className="inline-flex rounded-xl border border-border bg-bg-base p-1">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={cn(
                  "min-w-[7rem] rounded-lg px-5 py-2.5 text-sm font-medium transition",
                  !yearly
                    ? "bg-brand text-white"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                شهري
              </button>
              <button
                type="button"
                onClick={() => setYearly(true)}
                className={cn(
                  "flex min-w-[7rem] flex-col items-center gap-0.5 rounded-lg px-5 py-2.5 text-sm font-medium transition",
                  yearly
                    ? "bg-brand text-white"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <span>سنوي</span>
                <span className="rounded bg-brand/20 px-1.5 py-0.5 text-xs">
                  توفير
                </span>
              </button>
            </div>
          </motion.div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Basic */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex flex-col rounded-2xl border border-border bg-bg-base p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-text-primary">
                الأساسية
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                للمطاعم الصغيرة — منيو ولوحة تحكم و QR
              </p>
              <div className="mt-6">
                <p className="rounded-lg bg-success-bg px-2 py-1 text-sm font-medium text-success">
                  أول شهر مجاناً — دون إدخال فيزا أو بطاقة بنكية
                </p>
                <p className="mt-2 flex items-baseline gap-1 text-text-secondary">
                  <span className="text-3xl font-bold text-text-primary">
                    ${yearly ? "5" : "8"}
                  </span>
                  <span className="text-text-muted">/شهر</span>
                  {yearly && (
                    <span className="mr-2 text-xs text-text-muted">
                      (بعد التجربة — مدفوعة سنوياً)
                    </span>
                  )}
                  {!yearly && (
                    <span className="mr-2 text-xs text-text-muted">
                      بعد انتهاء الشهر المجاني
                    </span>
                  )}
                </p>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  صفحة المنيو الرقمية
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  لوحة تحكم أساسية
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  استخراج QR للمطعم وتصفحه من الزبائن
                </li>
              </ul>
              <Link href="/signup" className="mt-6 block">
                <Button variant="outline" className="w-full">
                  ابدأ بالأساسية
                </Button>
              </Link>
            </motion.div>

            {/* Pro - highlighted */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="relative flex flex-col rounded-2xl border-2 border-brand bg-bg-base p-6 shadow-lg ring-2 ring-brand/20"
            >
              <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
                الأكثر طلباً
              </span>
              <h3 className="text-lg font-semibold text-text-primary">
                الاحترافية
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                دومين خاص، QR للطاولات، طلب أونلاين، ولاء وزبائن
              </p>
              <div className="mt-6">
                <p className="rounded-lg bg-success-bg px-2 py-1 text-sm font-medium text-success">
                  أول شهر مجاناً — دون إدخال فيزا أو بطاقة بنكية
                </p>
                <p className="mt-2 flex items-baseline gap-1 text-text-secondary">
                  <span className="text-3xl font-bold text-brand">
                    ${yearly ? "10" : "15"}
                  </span>
                  <span className="text-text-muted">/شهر</span>
                  {yearly && (
                    <span className="mr-2 text-xs text-text-muted">
                      (بعد التجربة — مدفوعة سنوياً)
                    </span>
                  )}
                  {!yearly && (
                    <span className="mr-2 text-xs text-text-muted">
                      بعد انتهاء الشهر المجاني
                    </span>
                  )}
                </p>
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  صفحة المنيو الرقمية
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  لوحة تحكم أساسية
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  استخراج QR للمطعم وتصفحه من الزبائن
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  دومين خاص
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  QR لكل طاولة
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  طلب الطلبات من الصفحة للزبون
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  نظام ولاء للزبائن
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  قاعدة بيانات للزبائن المحتملين
                  <span className="text-xs text-text-muted">(قريباً)</span>
                </li>
              </ul>
              <Link href="/signup" className="mt-6 block">
                <Button className="w-full">اختر الاحترافية</Button>
              </Link>
            </motion.div>

            {/* Enterprise / Chains */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col rounded-2xl border border-border bg-bg-base p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-text-primary">
                السلاسل
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                للسلاسل والفروع — تعقيدات أكثر ومنيو متقدم
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-text-primary">
                  ${yearly ? "20" : "30"}
                </span>
                <span className="text-text-muted">/شهر</span>
                {yearly && (
                  <span className="mr-2 text-xs text-text-muted">
                    (مدفوعة سنوياً)
                  </span>
                )}
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  صفحة المنيو الرقمية
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  لوحة تحكم أساسية
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  استخراج QR للمطعم وتصفحه من الزبائن
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  دومين خاص
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  QR لكل طاولة
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  طلب الطلبات من الصفحة للزبون
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  نظام ولاء للزبائن
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  قاعدة بيانات للزبائن المحتملين
                  <span className="text-xs text-text-muted">(قريباً)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  موجه للسلاسل والفروع
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  تعقيدات وإعدادات متقدمة
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                  تصاميم منيو متقدمة
                </li>
              </ul>
              <Link href="/signup" className="mt-6 block">
                <Button variant="outline" className="w-full">
                  للسلاسل
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-text-primary md:text-4xl"
          >
            جاهز لرفع منيو مطعمك؟
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-text-secondary"
          >
            أنشئ حسابك في دقائق وابدأ باستقبال الطلبات عبر QR.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-wrap justify-center gap-4"
          >
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                <ChevronLeft className="size-4" />
                إنشاء حساب المطعم
              </Button>
            </Link>
            <Link href="/menu/albaraka">
              <Button variant="outline" size="lg">
                معاينة منيو تجريبي
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-surface/50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <span className="flex items-center gap-2 text-sm text-text-muted">
            <UtensilsCrossed className="size-4" />
            منيو — منصة استضافة المطاعم والمنيو الرقمي
          </span>
          <div className="flex gap-6 text-sm text-text-muted">
            <Link href="/login" className="hover:text-text-primary">
              تسجيل الدخول
            </Link>
            <a href="#pricing" className="hover:text-text-primary">
              الأسعار
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
