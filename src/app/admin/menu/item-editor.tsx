"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlusIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { createMenuItem, updateMenuItem } from "@/app/actions/admin-items";
import { uploadMenuImage } from "@/lib/uploads/client";
import type { Category, MenuItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export type CurrencySetup = {
  secondaryEnabled: boolean;
  secondaryCode: string | null;
  /** عند ضبطه تُحسب أسعار العملة الثانية تلقائياً إن تُركت فارغة */
  hasExchangeRate: boolean;
};

type SizeRow = { label: string; price: string; secondary: string };

const toMoney = (cents: number | null | undefined) => (typeof cents === "number" ? (cents / 100).toFixed(2).replace(/\.00$/, "") : "");
/** "12.5" → 1250؛ قيمة غير صالحة → null */
function toCents(v: string): number | null {
  const n = Number(v.replace(",", ".").trim());
  return v.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-bg-base px-3.5 text-[15px] text-text-primary outline-none placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";

/** ورقة إضافة/تعديل صنف — item = null للإضافة */
export function ItemEditor({
  open,
  item,
  defaultCategoryId,
  categories,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: MenuItem | null;
  defaultCategoryId: string | null;
  categories: Category[];
  currency: CurrencySetup;
  onClose: () => void;
  onSaved: (item: MenuItem, isNew: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-full max-w-lg gap-0 bg-bg-surface p-0 sm:max-w-lg">
        {open ? (
          <EditorBody
            key={item?.id ?? `new-${defaultCategoryId}`}
            item={item}
            defaultCategoryId={defaultCategoryId}
            categories={categories}
            currency={currency}
            onClose={onClose}
            onSaved={onSaved}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function EditorBody({
  item,
  defaultCategoryId,
  categories,
  currency,
  onClose,
  onSaved,
}: {
  item: MenuItem | null;
  defaultCategoryId: string | null;
  categories: Category[];
  currency: CurrencySetup;
  onClose: () => void;
  onSaved: (item: MenuItem, isNew: boolean) => void;
}) {
  const secondaryByLabel = new Map((item?.secondary_price_options ?? []).map((o) => [o.label, o.price_cents]));
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? defaultCategoryId ?? "");
  const [price, setPrice] = useState(toMoney(item?.price));
  const [secondaryPrice, setSecondaryPrice] = useState(toMoney(item?.secondary_price));
  const [sizes, setSizes] = useState<SizeRow[]>(
    (item?.price_options ?? []).map((o) => ({
      label: o.label,
      price: toMoney(o.price_cents),
      secondary: toMoney(secondaryByLabel.get(o.label)),
    }))
  );
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [available, setAvailable] = useState(item?.is_available !== false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const useSizes = sizes.length > 0;
  const secondaryRequired = currency.secondaryEnabled && !currency.hasExchangeRate;

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("اختر صورة (jpg, png, webp)");
    if (f.size > 5 * 1024 * 1024) return setError("حجم الصورة أكبر من 5MB");
    setError(null);
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError("اسم الصنف مطلوب");

    let priceCents: number;
    let price_options: { label: string; price_cents: number }[] | null = null;
    let secondary_price_options: { label: string; price_cents: number }[] | null = null;
    let secondary_price: number | null = null;

    if (useSizes) {
      const rows = sizes.filter((r) => r.label.trim() || r.price.trim());
      if (!rows.length) return setError("أضف حجماً واحداً على الأقل أو ارجع لسعر واحد");
      const opts = rows.map((r) => ({ label: r.label.trim(), price_cents: toCents(r.price) }));
      if (opts.some((o) => !o.label || o.price_cents == null)) return setError("أكمل اسم وسعر كل حجم");
      if (new Set(opts.map((o) => o.label)).size !== opts.length) return setError("أسماء الأحجام مكررة");
      price_options = opts as { label: string; price_cents: number }[];
      priceCents = price_options[0].price_cents;
      if (currency.secondaryEnabled) {
        const sec = rows
          .map((r) => ({ label: r.label.trim(), price_cents: toCents(r.secondary) }))
          .filter((o) => o.price_cents != null) as { label: string; price_cents: number }[];
        if (secondaryRequired && sec.length !== rows.length) return setError(`أدخل سعر ${currency.secondaryCode} لكل الأحجام`);
        secondary_price_options = sec.length ? sec : null;
      }
    } else {
      const c = toCents(price);
      if (c == null) return setError("أدخل سعراً صحيحاً");
      priceCents = c;
      if (currency.secondaryEnabled) {
        secondary_price = toCents(secondaryPrice);
        if (secondaryRequired && secondary_price == null) return setError(`أدخل السعر بـ ${currency.secondaryCode}`);
      }
    }

    setSaving(true);
    let finalImage = imageUrl;
    if (imageFile) {
      const up = await uploadMenuImage("", imageFile);
      if ("error" in up) {
        setSaving(false);
        return setError(up.error);
      }
      finalImage = up.url;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceCents,
      secondary_price,
      category_id: categoryId || null,
      image_url: finalImage,
      is_available: available,
      price_options,
      secondary_price_options,
    };
    const res = item ? await updateMenuItem(item.id, payload) : await createMenuItem({ ...payload, restaurant_id: "" });
    setSaving(false);
    if (res.error || !res.data) return setError(res.error ?? "تعذر الحفظ");
    onSaved(res.data, !item);
  }

  const shownImage = preview ?? imageUrl;

  return (
    <div className="flex h-full flex-col" dir="rtl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <SheetTitle className="font-display text-xl font-bold text-text-primary">{item ? "تعديل الصنف" : "صنف جديد"}</SheetTitle>
          <SheetDescription className="text-xs text-text-muted">الصورة والاسم والسعر يظهرون للزبون في المنيو</SheetDescription>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {/* الصورة */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          {shownImage ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-bg-surface-2">
              <Image src={shownImage} alt="" fill className="object-cover" sizes="480px" unoptimized={!!preview} />
              <div className="absolute bottom-3 start-3 flex gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  تغيير الصورة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setPreview(null);
                    setImageUrl(null);
                  }}
                  className="rounded-full bg-black/60 p-1.5 text-white backdrop-blur"
                  aria-label="إزالة الصورة"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong bg-bg-base text-text-muted transition hover:border-brand hover:text-brand"
            >
              <ImagePlusIcon className="size-8" />
              <span className="text-sm font-semibold">أضف صورة للصنف</span>
              <span className="text-xs">اسحبها هنا أو اضغط للاختيار · حتى 5MB</span>
            </button>
          )}
        </div>

        <Field label="اسم الصنف">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: شاورما دجاج" />
        </Field>

        <Field label="التصنيف">
          <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">بدون تصنيف</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="الوصف" hint="اختياري — مكونات أو طريقة التحضير">
          <textarea
            className={cn(inputCls, "h-auto min-h-[84px] py-2.5")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثال: خبز صاج، دجاج مشوي، ثومية ومخلل"
          />
        </Field>

        {/* السعر */}
        <div className="space-y-3 rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">السعر</p>
            <div className="inline-flex rounded-full bg-bg-surface-2 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSizes([])}
                className={cn("rounded-full px-3 py-1.5", !useSizes ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-muted")}
              >
                سعر واحد
              </button>
              <button
                type="button"
                onClick={() =>
                  !useSizes &&
                  setSizes([
                    { label: "صغير", price: price, secondary: secondaryPrice },
                    { label: "كبير", price: "", secondary: "" },
                  ])
                }
                className={cn("rounded-full px-3 py-1.5", useSizes ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-muted")}
              >
                أحجام
              </button>
            </div>
          </div>

          {!useSizes ? (
            <div className={cn("grid gap-3", currency.secondaryEnabled ? "grid-cols-2" : "grid-cols-1")}>
              <input className={inputCls} inputMode="decimal" dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" aria-label="السعر" />
              {currency.secondaryEnabled ? (
                <input
                  className={inputCls}
                  inputMode="decimal"
                  dir="ltr"
                  value={secondaryPrice}
                  onChange={(e) => setSecondaryPrice(e.target.value)}
                  placeholder={currency.hasExchangeRate ? `${currency.secondaryCode} · تلقائي` : currency.secondaryCode ?? ""}
                  aria-label="السعر بالعملة الثانية"
                />
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {sizes.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={cn(inputCls, "flex-[1.3]")}
                    value={row.label}
                    onChange={(e) => setSizes((s) => s.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
                    placeholder="الحجم (نفر، كيلو، كبير…)"
                  />
                  <input
                    className={cn(inputCls, "flex-1")}
                    inputMode="decimal"
                    dir="ltr"
                    value={row.price}
                    onChange={(e) => setSizes((s) => s.map((r, j) => (j === i ? { ...r, price: e.target.value } : r)))}
                    placeholder="0.00"
                  />
                  {currency.secondaryEnabled ? (
                    <input
                      className={cn(inputCls, "flex-1")}
                      inputMode="decimal"
                      dir="ltr"
                      value={row.secondary}
                      onChange={(e) => setSizes((s) => s.map((r, j) => (j === i ? { ...r, secondary: e.target.value } : r)))}
                      placeholder={currency.hasExchangeRate ? "تلقائي" : currency.secondaryCode ?? ""}
                    />
                  ) : null}
                  <button
                    type="button"
                    aria-label="حذف الحجم"
                    onClick={() => setSizes((s) => s.filter((_, j) => j !== i))}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-bg-surface-2 hover:text-danger"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSizes((s) => [...s, { label: "", price: "", secondary: "" }])}
                className="flex items-center gap-1.5 text-sm font-semibold text-brand"
              >
                <PlusIcon className="size-4" /> إضافة حجم
              </button>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between rounded-2xl border border-border p-4">
          <span>
            <span className="block text-sm font-bold">متاح للطلب</span>
            <span className="text-xs text-text-muted">أوقفه عند نفاد الصنف — يبقى ظاهراً بعلامة «نفد»</span>
          </span>
          <input type="checkbox" className="size-5 accent-[var(--brand)]" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
        </label>

        {error ? <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">{error}</p> : null}
      </div>

      <div className="flex gap-2 border-t border-border p-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-12 flex-1 rounded-xl bg-brand text-[15px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "جاري الحفظ…" : item ? "حفظ التعديلات" : "إضافة الصنف"}
        </button>
        <button type="button" onClick={onClose} className="h-12 rounded-xl border border-border px-5 text-sm font-semibold text-text-secondary">
          إلغاء
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-bold">{label}</span>
        {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
