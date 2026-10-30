import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  Check,
  ChefHat,
  Coins,
  Flame,
  Gift,
  Languages,
  MapPin,
  Moon,
  Palette,
  Printer,
  QrCode,
  ScanLine,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PricingSection } from "@/components/landing/pricing-section";

/*
 * الصفحة الرئيسية للمنصة. مكوّن خادم بالكامل ما عدا الأسعار (تبديل شهري/سنوي) وزر الثيم.
 * الصور من Nano Banana في public/images.
 */

const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_var(--brand)] transition hover:bg-brand-dark active:scale-[0.98]";
const btnGhost =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border-strong bg-bg-surface/70 px-6 text-[15px] font-semibold text-text-primary backdrop-blur transition hover:bg-bg-surface-2";

export function LandingPage({ demoUrl }: { demoUrl: string }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-bg-base text-text-primary" dir="rtl">
      <Nav />
      <Hero demoUrl={demoUrl} />
      <Highlights />
      <TableSection />
      <HowItWorks />
      <Features />
      <PricingSection />
      <Faq />
      <FinalCta demoUrl={demoUrl} />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Logo() {
  return (
    <span className="flex items-center gap-2.5 font-display text-xl font-bold">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-[0_6px_18px_-6px_var(--brand)]">
        <Flame className="size-5" />
      </span>
      منيو
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg-base/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="منيو — الرئيسية">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-text-secondary md:flex">
          <a href="#how" className="hover:text-text-primary">كيف يعمل</a>
          <a href="#features" className="hover:text-text-primary">الميزات</a>
          <a href="#pricing" className="hover:text-text-primary">الأسعار</a>
          <a href="#faq" className="hover:text-text-primary">الأسئلة</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden h-9 items-center rounded-full px-4 text-sm font-semibold text-text-secondary hover:text-text-primary sm:inline-flex">
            تسجيل الدخول
          </Link>
          <Link href="/signup" className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
            ابدأ مجاناً
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */

function Hero({ demoUrl }: { demoUrl: string }) {
  return (
    <section className="relative isolate">
      {/* خلفية: توهج جمري — وصورة Nano Banana في الوضع الداكن */}
      <div className="absolute inset-0 -z-10 hidden dark:block">
        <Image src="/images/landing/hero-bg-dark.png" alt="" fill priority className="object-cover opacity-70" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base/30 via-bg-base/60 to-bg-base" />
      </div>
      <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(60%_60%_at_25%_20%,color-mix(in_oklab,var(--brand)_18%,transparent),transparent_70%)] dark:hidden" />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-light px-3.5 py-1.5 text-[13px] font-semibold text-brand">
            <Sparkles className="size-4" />
            منيو رقمي · طلب من الطاولة · نقاط ولاء
          </p>
          <h1 className="font-display text-[40px] font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-[58px]">
            منيو مطعمك الرقمي،
            <br />
            <span className="text-brand">جاهز خلال دقائق.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-text-secondary">
            الزبون يمسح رمز QR على الطاولة، يتصفح أطباقك بالصور، ويرسل طلبه مباشرة إلى لوحتك —
            بدون تطبيق وبدون انتظار النادل.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className={btnPrimary}>
              ابدأ تجربتك المجانية
              <ArrowLeft className="size-4" />
            </Link>
            <a href={demoUrl} target="_blank" rel="noopener" className={btnGhost}>
              <Smartphone className="size-4" />
              شاهد منيو تجريبي
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
            {["أول شهر مجاناً", "بدون بطاقة بنكية", "عربي بالكامل"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-brand" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <PhoneMockup />
      </div>
    </section>
  );
}

const MOCK_ITEMS = [
  { name: "مشاوي مشكلة", desc: "كفتة وشيش طاووق على الفحم", price: "75", img: "/images/demo/mixed-grill.png" },
  { name: "شاورما دجاج", desc: "صاج، ثومية ومخلل", price: "20", img: "/images/demo/chicken-shawarma.png" },
  { name: "كنافة نابلسية", desc: "بالجبنة والفستق الحلبي", price: "25", img: "/images/demo/kunafa.png" },
];

/** هاتف بواجهة منيو حقيقية (HTML وليس صورة) */
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] animate-in fade-in zoom-in-95 duration-700 lg:max-w-[360px]">
      <div className="absolute -inset-10 -z-10 rounded-full bg-brand/20 blur-3xl" />

      <div className="rounded-[44px] border border-white/10 bg-[#141210] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
        <div className="overflow-hidden rounded-[36px] bg-[#0e0d0c] text-[#f6f1ec]">
          <div className="relative h-28">
            <Image src="/images/demo/cover.png" alt="" fill className="object-cover" sizes="360px" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0d0c] via-[#0e0d0c]/40 to-transparent" />
            <div className="absolute inset-x-4 bottom-2 flex items-end justify-between">
              <div>
                <p className="font-display text-lg font-bold">مطعم الديوان</p>
                <p className="flex items-center gap-1 text-[11px] text-[#c9beb4]">
                  <MapPin className="size-3" /> رام الله · مفتوح الآن
                </p>
              </div>
              <span className="rounded-full bg-[#f2541b] px-2.5 py-1 text-[10px] font-bold">طاولة 3</span>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-hidden px-4 py-3 text-[11px] font-semibold">
            {["الكل", "المشاوي", "السندويشات", "الحلويات"].map((c, i) => (
              <span key={c} className={i === 0 ? "rounded-full bg-[#f2541b] px-3 py-1" : "rounded-full bg-white/8 px-3 py-1 text-[#c9beb4]"}>
                {c}
              </span>
            ))}
          </div>

          <div className="space-y-2.5 px-4 pb-4">
            {MOCK_ITEMS.map((it) => (
              <div key={it.name} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.06]">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                  <Image src={it.img} alt={it.name} fill className="object-cover" sizes="64px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{it.name}</p>
                  <p className="truncate text-[11px] text-[#8f847a]">{it.desc}</p>
                  <p className="mt-1 text-[13px] font-bold text-[#f5b33e]" dir="ltr">₪ {it.price}</p>
                </div>
                <span className="flex size-7 items-center justify-center rounded-full bg-[#f2541b] text-base leading-none">+</span>
              </div>
            ))}
          </div>

          <div className="mx-3 mb-3 flex items-center justify-between rounded-2xl bg-[#f2541b] px-4 py-3 text-sm font-bold">
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-4" /> إرسال الطلب
            </span>
            <span dir="ltr">₪ 95</span>
          </div>
        </div>
      </div>

      {/* بطاقات عائمة */}
      <div className="absolute -start-6 top-24 hidden rounded-2xl border border-border bg-bg-surface/95 p-3 shadow-lg backdrop-blur sm:block lg:-start-14">
        <p className="flex items-center gap-2 text-xs font-bold">
          <BellRing className="size-4 text-brand" /> طلب جديد #24
        </p>
        <p className="mt-0.5 text-[11px] text-text-muted">طاولة 3 · قبل لحظات</p>
      </div>
      <div className="absolute -end-4 bottom-28 hidden rounded-2xl border border-border bg-bg-surface/95 p-3 shadow-lg backdrop-blur sm:block lg:-end-10">
        <p className="flex items-center gap-2 text-xs font-bold">
          <Gift className="size-4 text-gold" /> +95 نقطة ولاء
        </p>
        <p className="mt-0.5 text-[11px] text-text-muted">أُضيفت لرصيد الزبون</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Highlights() {
  const items = [
    { icon: QrCode, title: "QR لكل طاولة", text: "رقم الطاولة يصل مع الطلب" },
    { icon: Smartphone, title: "بدون تطبيق", text: "يفتح من كاميرا الجوال" },
    { icon: Languages, title: "عربي بالكامل", text: "من اليمين لليسار" },
    { icon: Moon, title: "فاتح وداكن", text: "حسب جهاز الزبون" },
  ];
  return (
    <section className="border-y border-border bg-bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border md:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3 bg-bg-surface px-4 py-6 sm:px-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="text-xs text-text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-bold text-brand">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>
      {text ? <p className="mt-4 text-lg leading-8 text-text-secondary">{text}</p> : null}
    </div>
  );
}

function TableSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-[28px] shadow-lg">
          <Image
            src="/images/landing/hero-table-qr.png"
            alt="زبون يمسح رمز QR على طاولة مطعم"
            width={1200}
            height={896}
            className="h-full w-full object-cover"
            sizes="(min-width: 1024px) 560px, 100vw"
          />
          {/* شاشة الهاتف في الصورة بيضاء — نضع عليها لقطة منيو بنفس زاوية الهاتف */}
          <div
            aria-hidden
            className="absolute overflow-hidden rounded-[7%] bg-[#0e0d0c]"
            style={{
              left: "21.2%",
              top: "33.6%",
              width: "21%",
              height: "44.4%",
              transform: "rotate(1.6deg) skewX(-10.8deg)",
              transformOrigin: "50% 50%",
            }}
          >
            <div className="relative h-[30%]">
              <Image src="/images/demo/cover.png" alt="" fill className="object-cover" sizes="120px" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0d0c] to-transparent" />
            </div>
            <div className="space-y-[6%] px-[8%] pt-[4%]">
              {MOCK_ITEMS.map((it) => (
                <div key={it.name} className="flex items-center gap-[6%]">
                  <div className="relative aspect-square w-[30%] overflow-hidden rounded-[18%]">
                    <Image src={it.img} alt="" fill className="object-cover" sizes="40px" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 w-[80%] rounded bg-white/70" />
                    <div className="h-1.5 w-[45%] rounded bg-[#f5b33e]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-[8%] bottom-[5%] h-[9%] rounded-full bg-[#f2541b]" />
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-brand">من الطاولة إلى المطبخ</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
            الزبون يمسح، يطلب،
            <br />
            ومطبخك يستلم فوراً.
          </h2>
          <ul className="mt-8 space-y-5">
            {[
              { icon: ScanLine, t: "رمز QR خاص بكل طاولة", d: "اطبع البطاقات من لوحتك — الطلب يصل ومعه رقم الطاولة." },
              { icon: BellRing, t: "تنبيه فوري في لوحة الطلبات", d: "صوت وإشعار لكل طلب جديد، وتغيير الحالة بنقرة." },
              { icon: Timer, t: "الزبون يتابع طلبه", d: "صفحة تتبع: مستجد ← قيد التحضير ← جاهز." },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex gap-4">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-bold">{t}</p>
                  <p className="mt-1 text-text-secondary">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "١", icon: Store, title: "أنشئ مطعمك", text: "اسم المطعم ورابطه — جاهز خلال دقيقة واحدة." },
    { n: "٢", icon: UtensilsCrossed, title: "أضف المنيو", text: "التصنيفات والأصناف والصور والأحجام والأسعار." },
    { n: "٣", icon: QrCode, title: "اطبع رموز QR", text: "ضعها على الطاولات وابدأ باستقبال الطلبات.", img: "/images/landing/how-step-3-scan.png" },
  ];
  return (
    <section id="how" className="scroll-mt-20 bg-bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionTitle eyebrow="كيف يعمل" title="ثلاث خطوات وتبدأ" text="لا تحتاج خبرة تقنية ولا أجهزة خاصة — جوالك يكفي." />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {steps.map(({ n, icon: Icon, title, text, img }) => (
            <div key={title} className="relative overflow-hidden rounded-[24px] border border-border bg-bg-base p-6">
              <span className="font-display text-5xl font-bold text-brand/15">{n}</span>
              <div className="mt-2 flex size-12 items-center justify-center rounded-2xl bg-brand-light text-brand">
                <Icon className="size-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-text-secondary">{text}</p>
              {img ? (
                <Image src={img} alt="" width={160} height={160} className="absolute -bottom-4 -start-4 opacity-90" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: ShoppingBag, title: "طلب من الطاولة أو استلام", text: "داخل المطعم، استلام، أو توصيل — مع ملاحظات «بدون بصل»." },
    { icon: BellRing, title: "لوحة طلبات حيّة", text: "تنبيه لكل طلب، تعديل الأصناف والخصم، وتعيين النادل." },
    { icon: Gift, title: "نقاط ولاء ومكافآت", text: "الزبون يكسب نقاطاً من كل طلب ويستبدلها بخصم أو مكافأة." },
    { icon: Coins, title: "عملتان في المنيو", text: "اعرض الشيكل والدينار أو الدولار معاً بسعر صرف تحدده." },
    { icon: Printer, title: "طباعة فاتورة حرارية", text: "اطبع الطلب للمطبخ أو للزبون بنقرة." },
    { icon: Palette, title: "منيو بهويتك", text: "شعارك، صورة الغلاف، بانر العروض، وروابط التواصل." },
    { icon: ChefHat, title: "إدارة سهلة للمنيو", text: "أوقف صنفاً نفد بنقرة، وعدّل الأسعار في أي وقت." },
    { icon: Moon, title: "فاتح وداكن", text: "المنيو يتبع إعداد جوال الزبون تلقائياً." },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 md:py-28">
      <SectionTitle eyebrow="الميزات" title="كل ما يحتاجه مطعمك في مكان واحد" />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="group rounded-[22px] border border-border bg-bg-surface p-6 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-light text-brand transition group-hover:bg-brand group-hover:text-white">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-5 font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const qs = [
    { q: "هل يحتاج الزبون تحميل تطبيق؟", a: "لا. يمسح رمز QR بكاميرا الجوال فيفتح المنيو مباشرة في المتصفح." },
    { q: "هل أستطيع استعمال دومين خاص بمطعمي؟", a: "نعم في الخطة الاحترافية — مثل menu.yourrestaurant.com. وكل مطعم يحصل تلقائياً على رابط مثل yourname.resturant.app." },
    { q: "كيف أعرف بوصول طلب جديد؟", a: "تظهر الطلبات في لوحة التحكم مع تنبيه فوري، ويمكنك طباعتها على طابعة حرارية." },
    { q: "هل أستطيع تعديل المنيو بنفسي؟", a: "نعم، من لوحة التحكم: إضافة الأصناف والصور والأحجام والأسعار، وإيقاف أي صنف نفد بنقرة." },
    { q: "ماذا يحدث بعد الشهر المجاني؟", a: "تختار الخطة المناسبة وتستمر بنفس المنيو والبيانات. لا نطلب بطاقة بنكية للتجربة." },
  ];
  return (
    <section id="faq" className="scroll-mt-20 bg-bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4">
        <SectionTitle eyebrow="الأسئلة الشائعة" title="أسئلة يطرحها أصحاب المطاعم" />
        <div className="mt-12 space-y-3">
          {qs.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-border bg-bg-base px-5 py-4 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {q}
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-7 text-text-secondary">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ demoUrl }: { demoUrl: string }) {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[32px] px-6 py-16 text-center text-white sm:px-12 md:py-24">
        <Image src="/images/demo/cover.png" alt="" fill className="-z-10 object-cover" sizes="(min-width: 1152px) 1152px, 100vw" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0e0d0c] via-[#0e0d0c]/80 to-[#0e0d0c]/50" />
        <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">جاهز تنقل منيو مطعمك إلى الجوال؟</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">أنشئ حسابك الآن — أول شهر مجاناً وبدون بطاقة بنكية.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={btnPrimary}>
            إنشاء حساب المطعم
            <ArrowLeft className="size-4" />
          </Link>
          <a href={demoUrl} target="_blank" rel="noopener" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-[15px] font-semibold text-white backdrop-blur hover:bg-white/20">
            <Smartphone className="size-4" />
            جرّب المنيو التجريبي
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-text-muted sm:flex-row">
        <Logo />
        <nav className="flex gap-6">
          <a href="#features" className="hover:text-text-primary">الميزات</a>
          <a href="#pricing" className="hover:text-text-primary">الأسعار</a>
          <Link href="/login" className="hover:text-text-primary">تسجيل الدخول</Link>
        </nav>
        <p>© {new Date().getFullYear()} منيو — جميع الحقوق محفوظة</p>
      </div>
    </footer>
  );
}
