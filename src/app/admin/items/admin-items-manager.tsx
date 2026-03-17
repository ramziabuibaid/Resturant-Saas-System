"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Category, MenuItem } from "@/lib/types/database";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "@/app/actions/admin-items";
import { uploadMenuImage } from "@/lib/supabase/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { PlusIcon, MoreVerticalIcon, PencilIcon, Trash2Icon, PlusCircleIcon, XIcon } from "lucide-react";

type AdminItemsManagerProps = {
  restaurantId: string;
  initialCategories: Category[];
  initialItems: MenuItem[];
};

type PriceOptionRow = { label: string; price: string };

const emptyPriceOptionRow = (): PriceOptionRow => ({ label: "", price: "" });

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category_id: "",
  image_url: "",
  imageFile: null as File | null,
  priceOptions: [] as PriceOptionRow[],
};

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parsePriceToCents(value: string): number {
  const num = parseFloat(value);
  if (Number.isNaN(num) || num < 0) return -1;
  return Math.round(num * 100);
}

export function AdminItemsManager({
  restaurantId,
  initialCategories,
  initialItems,
}: AdminItemsManagerProps) {
  const [categories] = useState<Category[]>(initialCategories);
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledOptions = addForm.priceOptions.filter((r) => r.label.trim() && r.price.trim());
    let priceCents: number;
    let price_options: { label: string; price_cents: number }[] | null = null;
    if (filledOptions.length > 0) {
      const opts = filledOptions.map((r) => ({
        label: r.label.trim(),
        price_cents: parsePriceToCents(r.price),
      }));
      const invalid = opts.find((o) => o.price_cents < 0);
      if (invalid) {
        showMsg("err", "أدخل أسعاراً صحيحة لجميع الأحجام (مثلاً 25 أو 50.00).");
        return;
      }
      price_options = opts;
      priceCents = opts[0].price_cents;
    } else {
      priceCents = parsePriceToCents(addForm.price);
      if (priceCents < 0) {
        showMsg("err", "أدخل سعراً صحيحاً (مثلاً 50.00).");
        return;
      }
    }
    setAdding(true);
    let imageUrl: string | null = addForm.image_url || null;
    if (addForm.imageFile) {
      const result = await uploadMenuImage(restaurantId, addForm.imageFile);
      if ("error" in result) {
        showMsg("err", result.error);
        setAdding(false);
        return;
      }
      imageUrl = result.url;
    }
    const { data, error } = await createMenuItem({
      restaurant_id: restaurantId,
      name: addForm.name.trim(),
      description: addForm.description.trim() || null,
      price: priceCents,
      category_id: addForm.category_id || null,
      image_url: imageUrl,
      is_available: true,
      price_options,
    });
    setAdding(false);
    if (error) {
      showMsg("err", error);
      return;
    }
    showMsg("ok", "تمت إضافة الصنف.");
    setAddForm(emptyForm);
    setAddDialogOpen(false);
    if (data) setItems((prev) => [...prev, data]);
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    const priceOptions: PriceOptionRow[] =
      item.price_options && Array.isArray(item.price_options) && item.price_options.length > 0
        ? item.price_options.map((o) => ({
            label: o.label,
            price: (o.price_cents / 100).toFixed(2),
          }))
        : [];
    setEditForm({
      name: item.name,
      description: item.description || "",
      price: formatPrice(item.price),
      category_id: item.category_id || "",
      image_url: item.image_url || "",
      imageFile: null,
      priceOptions,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const filledOptions = editForm.priceOptions.filter((r) => r.label.trim() && r.price.trim());
    let priceCents: number;
    let price_options: { label: string; price_cents: number }[] | null = null;
    if (filledOptions.length > 0) {
      const opts = filledOptions.map((r) => ({
        label: r.label.trim(),
        price_cents: parsePriceToCents(r.price),
      }));
      const invalid = opts.find((o) => o.price_cents < 0);
      if (invalid) {
        showMsg("err", "أدخل أسعاراً صحيحة لجميع الأحجام (مثلاً 25 أو 50.00).");
        return;
      }
      price_options = opts;
      priceCents = opts[0].price_cents;
    } else {
      priceCents = parsePriceToCents(editForm.price);
      if (priceCents < 0) {
        showMsg("err", "أدخل سعراً صحيحاً (مثلاً 50.00).");
        return;
      }
    }
    setSavingEdit(true);
    let imageUrl: string | undefined = editForm.image_url || undefined;
    if (editForm.imageFile) {
      const result = await uploadMenuImage(restaurantId, editForm.imageFile);
      if ("error" in result) {
        showMsg("err", result.error);
        setSavingEdit(false);
        return;
      }
      imageUrl = result.url;
    }
    const { data, error } = await updateMenuItem(editingId, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      price: priceCents,
      category_id: editForm.category_id || null,
      image_url: imageUrl,
      price_options,
    });
    setSavingEdit(false);
    if (error) {
      showMsg("err", error);
      return;
    }
    showMsg("ok", "تم تحديث الصنف.");
    setEditingId(null);
    if (data) setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
  };

  const handleAvailabilityChange = async (item: MenuItem, checked: boolean) => {
    setTogglingId(item.id);
    const { data, error } = await updateMenuItem(item.id, { is_available: checked });
    setTogglingId(null);
    if (error) {
      showMsg("err", error);
      return;
    }
    if (data) setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setItems((prev) => prev.filter((i) => i.id !== deleteId));
    const { error } = await deleteMenuItem(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (error) {
      showMsg("err", error);
      setItems(initialItems);
      return;
    }
    showMsg("ok", "تم حذف الصنف.");
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (categoryId == null) return "—";
    return categories.find((c) => c.id === categoryId)?.name ?? "—";
  };

  return (
    <div className="space-y-6">
      {message && (
        <p
          className={`rounded-[var(--radius-md)] px-4 py-2 text-sm ${
            message.type === "ok"
              ? "bg-[var(--success-bg)] text-[var(--success)]"
              : "bg-[var(--danger-bg)] text-[var(--danger)]"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          إضافة وتعديل وحذف الأصناف. السعر بالدولار (مثلاً 50.00).
        </p>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="gap-2 bg-[var(--brand)] text-[var(--text-inverse)] hover:bg-[var(--brand-dark)]"
        >
          <PlusIcon className="size-4" />
          إضافة صنف
        </Button>
      </div>

      {/* إضافة صنف — نافذة عائمة حديثة مع جسم قابل للتمرير وزرّي حفظ ثابتين */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent
          className="max-w-xl border-0 bg-[var(--bg-surface)] shadow-[0_24px_48px_-12px_rgba(15,14,23,0.25)] sm:rounded-2xl"
          showCloseButton
          scrollable
        >
          <DialogHeader className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 py-5">
            <DialogTitle className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              إضافة صنف جديد
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-[var(--text-muted)]">
              سيظهر الصنف في منيو المطعم للعملاء بعد الحفظ.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              <div className="space-y-6">
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    معلومات أساسية
                  </h3>
                  <div className="space-y-3 rounded-xl bg-[var(--bg-base)]/60 p-4">
                    <div>
                      <Label htmlFor="add-name" className="text-sm font-medium text-[var(--text-primary)]">
                        اسم الصنف
                      </Label>
                      <Input
                        id="add-name"
                        value={addForm.name}
                        onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="مثال: كباب لحم"
                        required
                        disabled={adding}
                        className="mt-1.5 h-11 rounded-xl border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="add-category" className="text-sm font-medium text-[var(--text-primary)]">
                        التصنيف
                      </Label>
                      <select
                        id="add-category"
                        value={addForm.category_id}
                        onChange={(e) => setAddForm((f) => ({ ...f, category_id: e.target.value }))}
                        disabled={adding}
                        className="mt-1.5 flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
                      >
                        <option value="">— لا تصنيف —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    السعر والأحجام
                  </h3>
                  <div className="space-y-4 rounded-xl bg-[var(--bg-base)]/60 p-4">
                    <div>
                      <Label htmlFor="add-price" className="text-sm font-medium text-[var(--text-primary)]">
                        سعر واحد (إن لم تُضف أحجاماً أدناه)
                      </Label>
                      <Input
                        id="add-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="25.00"
                        value={addForm.price}
                        onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
                        disabled={adding}
                        className="mt-1.5 h-11 w-32 rounded-xl border-[var(--border)] bg-[var(--bg-surface)] font-mono tabular-nums text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
                        أو أضف عدة أحجام/أوزان (نفر، نصف كيلو، كيلو، صغير، وسط، كبير)
                      </p>
                      <div className="space-y-2">
                        {addForm.priceOptions.map((row, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2"
                          >
                            <Input
                              placeholder="الحجم"
                              value={row.label}
                              onChange={(e) =>
                                setAddForm((f) => ({
                                  ...f,
                                  priceOptions: f.priceOptions.map((r, i) =>
                                    i === idx ? { ...r, label: e.target.value } : r
                                  ),
                                }))
                              }
                              disabled={adding}
                              className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="سعر"
                              value={row.price}
                              onChange={(e) =>
                                setAddForm((f) => ({
                                  ...f,
                                  priceOptions: f.priceOptions.map((r, i) =>
                                    i === idx ? { ...r, price: e.target.value } : r
                                  ),
                                }))
                              }
                              disabled={adding}
                              className="h-9 w-20 rounded-lg border-[var(--border)] bg-[var(--bg-base)] font-mono text-sm tabular-nums"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 rounded-full text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                              onClick={() =>
                                setAddForm((f) => ({
                                  ...f,
                                  priceOptions: f.priceOptions.filter((_, i) => i !== idx),
                                }))
                              }
                              disabled={adding}
                              aria-label="إزالة"
                            >
                              <XIcon className="size-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2 rounded-xl border-dashed border-[var(--border)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)]/30 hover:text-[var(--brand)]"
                          onClick={() =>
                            setAddForm((f) => ({
                              ...f,
                              priceOptions: [...f.priceOptions, emptyPriceOptionRow()],
                            }))
                          }
                          disabled={adding}
                        >
                          <PlusCircleIcon className="size-4" />
                          إضافة حجم أو سعر
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    الوصف والوسائط
                  </h3>
                  <div className="space-y-3 rounded-xl bg-[var(--bg-base)]/60 p-4">
                    <div>
                      <Label htmlFor="add-desc" className="text-sm font-medium text-[var(--text-primary)]">
                        الوصف (اختياري)
                      </Label>
                      <Input
                        id="add-desc"
                        value={addForm.description}
                        onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="وصف قصير للصنف"
                        disabled={adding}
                        className="mt-1.5 h-11 rounded-xl border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[var(--text-primary)]">
                        صورة (اختياري)
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setAddForm((f) => ({ ...f, imageFile: e.target.files?.[0] ?? null }))
                        }
                        disabled={adding}
                        className="mt-1.5 h-11 cursor-pointer rounded-xl border-[var(--border)] bg-[var(--bg-surface)] file:me-3 file:rounded-lg file:border-0 file:bg-[var(--brand)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--text-inverse)]"
                      />
                      <p className="mt-1 text-xs text-[var(--text-muted)]">JPG أو PNG</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
            <DialogFooter className="mx-0 shrink-0 gap-3 border-[var(--border)] px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={adding}
                className="rounded-xl border-[var(--border)] px-5"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={adding}
                className="min-w-[120px] rounded-xl bg-[var(--brand)] px-5 text-[var(--text-inverse)] hover:bg-[var(--brand-dark)]"
              >
                {adding ? "جاري الإضافة…" : "إضافة الصنف"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Items grid — Cards */}
      {items.length === 0 ? (
        <Card className="border-[var(--border)] bg-[var(--bg-surface)]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-[var(--text-muted)]">لا توجد أصناف بعد. أضف صنفاً من الزر أعلاه.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {items.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] card-enter"
            >
              <CardContent className="p-0">
                <div className="flex gap-4 p-4">
                  {item.image_url ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-surface-2)]">
                      <Image
                        src={item.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--brand)] font-mono">
                      ${formatPrice(item.price)}
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                      {getCategoryName(item.category_id)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
                      aria-label="الإجراءات"
                    >
                      <MoreVerticalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[var(--bg-overlay)] border-[var(--border)]">
                      <DropdownMenuItem onClick={() => startEdit(item)}>
                        <PencilIcon className="size-4 me-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2Icon className="size-4 me-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    الإتاحة
                  </span>
                  <Switch
                    checked={item.is_available !== false}
                    onCheckedChange={(checked) => handleAvailabilityChange(item, checked)}
                    disabled={togglingId === item.id}
                    aria-label={item.is_available !== false ? "متاح — إيقاف" : "غير متاح — تشغيل"}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* تعديل الصنف — نفس التصميم مع جسم قابل للتمرير وأزرار ثابتة */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent
          className="max-w-xl border-0 bg-[var(--bg-surface)] shadow-[0_24px_48px_-12px_rgba(15,14,23,0.25)] sm:rounded-2xl"
          showCloseButton
          scrollable
        >
          <DialogHeader className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 py-5">
            <DialogTitle className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              تعديل الصنف
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-[var(--text-muted)]">
              عدّل البيانات ثم احفظ. التغييرات تظهر فوراً في المنيو.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              <div className="space-y-6">
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    معلومات أساسية
                  </h3>
                  <div className="space-y-3 rounded-xl bg-[var(--bg-base)]/60 p-4">
                    <div>
                      <Label htmlFor="edit-name" className="text-sm font-medium text-[var(--text-primary)]">
                        اسم الصنف
                      </Label>
                      <Input
                        id="edit-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        required
                        disabled={savingEdit}
                        className="mt-1.5 h-11 rounded-xl border-[var(--border)] bg-[var(--bg-surface)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-category" className="text-sm font-medium text-[var(--text-primary)]">
                        التصنيف
                      </Label>
                      <select
                        id="edit-category"
                        value={editForm.category_id}
                        onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))}
                        disabled={savingEdit}
                        className="mt-1.5 flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
                      >
                        <option value="">— لا تصنيف —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    السعر والأحجام
                  </h3>
                  <div className="space-y-4 rounded-xl bg-[var(--bg-base)]/60 p-4">
                    <div>
                      <Label htmlFor="edit-price" className="text-sm font-medium text-[var(--text-primary)]">
                        سعر واحد (إن لم تُضف أحجاماً أدناه)
                      </Label>
                      <Input
                        id="edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.price}
                        onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                        disabled={savingEdit}
                        className="mt-1.5 h-11 w-32 rounded-xl border-[var(--border)] bg-[var(--bg-surface)] font-mono tabular-nums focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
                        أو عدة أحجام/أوزان
                      </p>
                      <div className="space-y-2">
                        {editForm.priceOptions.map((row, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2"
                          >
                            <Input
                              placeholder="الحجم"
                              value={row.label}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  priceOptions: f.priceOptions.map((r, i) =>
                                    i === idx ? { ...r, label: e.target.value } : r
                                  ),
                                }))
                              }
                              disabled={savingEdit}
                              className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="سعر"
                              value={row.price}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  priceOptions: f.priceOptions.map((r, i) =>
                                    i === idx ? { ...r, price: e.target.value } : r
                                  ),
                                }))
                              }
                              disabled={savingEdit}
                              className="h-9 w-20 rounded-lg border-[var(--border)] bg-[var(--bg-base)] font-mono text-sm tabular-nums"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 shrink-0 rounded-full text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                              onClick={() =>
                                setEditForm((f) => ({
                                  ...f,
                                  priceOptions: f.priceOptions.filter((_, i) => i !== idx),
                                }))
                              }
                              disabled={savingEdit}
                              aria-label="إزالة"
                            >
                              <XIcon className="size-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2 rounded-xl border-dashed border-[var(--border)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)]/30 hover:text-[var(--brand)]"
                          onClick={() =>
                            setEditForm((f) => ({
                              ...f,
                              priceOptions: [...f.priceOptions, emptyPriceOptionRow()],
                            }))
                          }
                          disabled={savingEdit}
                        >
                          <PlusCircleIcon className="size-4" />
                          إضافة حجم أو سعر
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    الوصف والوسائط
                  </h3>
                  <div className="space-y-3 rounded-xl bg-[var(--bg-base)]/60 p-4">
                    <div>
                      <Label htmlFor="edit-desc" className="text-sm font-medium text-[var(--text-primary)]">
                        الوصف (اختياري)
                      </Label>
                      <Input
                        id="edit-desc"
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        disabled={savingEdit}
                        className="mt-1.5 h-11 rounded-xl border-[var(--border)] bg-[var(--bg-surface)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[var(--text-primary)]">
                        صورة (استبدال الحالية)
                      </Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, imageFile: e.target.files?.[0] ?? null }))
                        }
                        disabled={savingEdit}
                        className="mt-1.5 h-11 cursor-pointer rounded-xl border-[var(--border)] bg-[var(--bg-surface)] file:me-3 file:rounded-lg file:border-0 file:bg-[var(--brand)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--text-inverse)]"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
            <DialogFooter className="mx-0 shrink-0 gap-3 border-[var(--border)] px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingId(null)}
                disabled={savingEdit}
                className="rounded-xl border-[var(--border)] px-5"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={savingEdit}
                className="min-w-[120px] rounded-xl bg-[var(--brand)] px-5 text-[var(--text-inverse)] hover:bg-[var(--brand-dark)]"
              >
                {savingEdit ? "جاري الحفظ…" : "حفظ التعديلات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm — Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="border-[var(--border)] bg-[var(--bg-surface)]">
          <DialogHeader>
            <DialogTitle>حذف الصنف؟</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-muted)]">لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="border-[var(--border)]"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              {deleting ? "جاري الحذف…" : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
