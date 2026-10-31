"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckIcon,
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UtensilsCrossedIcon,
  XIcon,
} from "lucide-react";
import { deleteMenuItem, reorderMenuItems, updateMenuItem } from "@/app/actions/admin-items";
import { createCategory, deleteCategory, reorderCategories, updateCategory } from "@/app/actions/admin-categories";
import type { Category, MenuItem } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { ItemEditor, type CurrencySetup } from "./item-editor";

const UNCATEGORIZED = "__none__";

export function MenuManager({
  initialCategories,
  initialItems,
  currencyCode,
  currency,
}: {
  initialCategories: Category[];
  initialItems: MenuItem[];
  currencyCode: string;
  currency: CurrencySetup;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ item: MenuItem | null; categoryId: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "item" | "category"; id: string; name: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const groups = useMemo(() => {
    const q = query.trim();
    const match = (i: MenuItem) => !q || i.name.includes(q) || (i.description ?? "").includes(q);
    const byCat = new Map<string, MenuItem[]>();
    for (const it of items) {
      const key = it.category_id && categories.some((c) => c.id === it.category_id) ? it.category_id : UNCATEGORIZED;
      byCat.set(key, [...(byCat.get(key) ?? []), it]);
    }
    const list = categories.map((c) => ({ id: c.id, name: c.name, items: (byCat.get(c.id) ?? []).filter(match) }));
    const none = (byCat.get(UNCATEGORIZED) ?? []).filter(match);
    if (none.length) list.push({ id: UNCATEGORIZED, name: "بدون تصنيف", items: none });
    return list.filter((g) => (activeCat ? g.id === activeCat : true)).filter((g) => !q || g.items.length);
  }, [items, categories, activeCat, query]);

  const countFor = (catId: string) => items.filter((i) => i.category_id === catId).length;

  /* ----- التصنيفات ----- */

  async function onCategoriesDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = categories.findIndex((c) => c.id === e.active.id);
    const to = categories.findIndex((c) => c.id === e.over!.id);
    const next = arrayMove(categories, from, to);
    setCategories(next);
    const res = await reorderCategories(next.map((c) => c.id));
    if (res.error) toast.error(res.error);
  }

  async function addCategory(name: string): Promise<void> {
    const res = await createCategory("", name);
    if (res.error || !res.data) {
      toast.error(res.error ?? "تعذر الإضافة");
      return;
    }
    setCategories((c) => [...c, res.data!]);
    toast.success(`أُضيف التصنيف «${res.data.name}»`);
  }

  async function renameCategory(id: string, name: string) {
    const res = await updateCategory(id, name);
    if (res.error || !res.data) return toast.error(res.error ?? "تعذر الحفظ");
    setCategories((cs) => cs.map((c) => (c.id === id ? res.data! : c)));
  }

  /* ----- الأصناف ----- */

  async function onItemsDragEnd(groupId: string, e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const group = items
      .filter((i) => (groupId === UNCATEGORIZED ? !i.category_id : i.category_id === groupId))
      .slice();
    const from = group.findIndex((i) => i.id === e.active.id);
    const to = group.findIndex((i) => i.id === e.over!.id);
    const reordered = arrayMove(group, from, to);
    // نضع العناصر المعاد ترتيبها في نفس المواضع التي كانت تشغلها المجموعة، وبقية القائمة كما هي
    const groupIds = new Set(group.map((i) => i.id));
    setItems((all) => {
      let k = 0;
      return all.map((i) => (groupIds.has(i.id) ? reordered[k++] : i));
    });
    const res = await reorderMenuItems(reordered.map((i) => i.id));
    if (res.error) toast.error(res.error);
  }

  async function toggleAvailable(item: MenuItem) {
    const next = item.is_available === false;
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, is_available: next } : i)));
    const res = await updateMenuItem(item.id, { is_available: next });
    if (res.error) {
      toast.error(res.error);
      setItems((all) => all.map((i) => (i.id === item.id ? { ...i, is_available: !next } : i)));
    } else {
      toast.success(next ? `«${item.name}» متاح الآن` : `«${item.name}» نفد — يظهر للزبون كغير متاح`);
    }
  }

  async function runDelete() {
    if (!confirmDelete) return;
    const { kind, id, name } = confirmDelete;
    setConfirmDelete(null);
    if (kind === "item") {
      const res = await deleteMenuItem(id);
      if (res.error) return toast.error(res.error);
      setItems((all) => all.filter((i) => i.id !== id));
    } else {
      const res = await deleteCategory(id, "");
      if (res.error) return toast.error(res.error);
      setCategories((cs) => cs.filter((c) => c.id !== id));
      setItems((all) => all.map((i) => (i.category_id === id ? { ...i, category_id: null } : i)));
      if (activeCat === id) setActiveCat(null);
    }
    toast.success(`حُذف «${name}»`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* ------- لوحة التصنيفات ------- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[20px] border border-border bg-bg-surface p-3">
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <h2 className="font-display text-base font-bold">التصنيفات</h2>
            <span className="text-xs text-text-muted">اسحب لإعادة الترتيب</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold",
              activeCat === null ? "bg-brand-light text-brand" : "text-text-secondary hover:bg-bg-surface-2"
            )}
          >
            كل الأصناف <span className="text-xs">{items.length}</span>
          </button>
          <DndContext id="dnd-categories" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoriesDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <ul className="mt-1 space-y-0.5">
                {categories.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    count={countFor(c.id)}
                    active={activeCat === c.id}
                    onSelect={() => setActiveCat(c.id)}
                    onRename={(n) => renameCategory(c.id, n)}
                    onDelete={() => setConfirmDelete({ kind: "category", id: c.id, name: c.name })}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <NewCategoryInput onAdd={addCategory} />
        </div>
      </aside>

      {/* ------- الأصناف ------- */}
      <section className="min-w-0 space-y-5">
        <div className="flex flex-wrap gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-bg-surface px-3">
            <SearchIcon className="size-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن صنف…"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setEditor({ item: null, categoryId: activeCat && activeCat !== UNCATEGORIZED ? activeCat : categories[0]?.id ?? null })}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark"
          >
            <PlusIcon className="size-4" /> صنف جديد
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border-strong p-10 text-center">
            <UtensilsCrossedIcon className="mx-auto size-10 text-text-muted" />
            <p className="mt-3 font-bold">{query ? "لا نتائج" : "لا أصناف بعد"}</p>
            <p className="mt-1 text-sm text-text-secondary">
              {query ? "جرّب كلمة أخرى." : "ابدأ بإنشاء تصنيف ثم أضف أصنافك مع صورها."}
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-[20px] border border-border bg-bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="font-display font-bold">
                  {g.name} <span className="text-sm font-normal text-text-muted">· {g.items.length}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditor({ item: null, categoryId: g.id === UNCATEGORIZED ? null : g.id })}
                  className="flex items-center gap-1 text-sm font-semibold text-brand"
                >
                  <PlusIcon className="size-4" /> إضافة
                </button>
              </div>
              {g.items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-text-muted">لا أصناف في هذا التصنيف بعد.</p>
              ) : (
                <DndContext id={`dnd-items-${g.id}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onItemsDragEnd(g.id, e)}>
                  <SortableContext items={g.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <ul className="divide-y divide-border">
                      {g.items.map((it) => (
                        <ItemRow
                          key={it.id}
                          item={it}
                          currencyCode={currencyCode}
                          dragDisabled={!!query}
                          onEdit={() => setEditor({ item: it, categoryId: it.category_id ?? null })}
                          onToggle={() => toggleAvailable(it)}
                          onDelete={() => setConfirmDelete({ kind: "item", id: it.id, name: it.name })}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          ))
        )}
      </section>

      <ItemEditor
        open={editor !== null}
        item={editor?.item ?? null}
        defaultCategoryId={editor?.categoryId ?? null}
        categories={categories}
        currency={currency}
        onClose={() => setEditor(null)}
        onSaved={(saved, isNew) => {
          setItems((all) => (isNew ? [...all, saved] : all.map((i) => (i.id === saved.id ? saved : i))));
          setEditor(null);
          toast.success(isNew ? `أُضيف «${saved.name}»` : "حُفظت التعديلات");
        }}
      />

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal>
          <div className="w-full max-w-sm rounded-[22px] bg-bg-surface p-5 shadow-lg" dir="rtl">
            <p className="font-display text-lg font-bold">حذف «{confirmDelete.name}»؟</p>
            <p className="mt-1 text-sm text-text-secondary">
              {confirmDelete.kind === "category"
                ? "أصناف هذا التصنيف لن تُحذف — ستنتقل إلى «بدون تصنيف»."
                : "لا يمكن التراجع عن الحذف. يمكنك بدلاً من ذلك إيقاف الصنف مؤقتاً."}
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={runDelete} className="h-11 flex-1 rounded-xl bg-danger text-sm font-bold text-white">
                حذف
              </button>
              <button type="button" onClick={() => setConfirmDelete(null)} className="h-11 flex-1 rounded-xl border border-border text-sm font-semibold">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DragHandle({ listeners, attributes, disabled }: { listeners: object | undefined; attributes: object; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label="اسحب لإعادة الترتيب"
      disabled={disabled}
      className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface-2 active:cursor-grabbing disabled:opacity-30"
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
}

function CategoryRow({
  category,
  count,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  category: Category;
  count: number;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-center gap-1 rounded-xl", isDragging && "relative z-10 bg-bg-surface shadow-lg", active && "bg-brand-light")}
    >
      <DragHandle listeners={listeners} attributes={attributes} />
      {editing ? (
        <form
          className="flex flex-1 items-center gap-1 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && name.trim() !== category.name) onRename(name.trim());
            setEditing(false);
          }}
        >
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-8 min-w-0 flex-1 rounded-lg border border-brand bg-bg-base px-2 text-sm outline-none" />
          <button type="submit" aria-label="حفظ" className="flex size-8 items-center justify-center rounded-lg text-success">
            <CheckIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="إلغاء"
            onClick={() => {
              setName(category.name);
              setEditing(false);
            }}
            className="flex size-8 items-center justify-center rounded-lg text-text-muted"
          >
            <XIcon className="size-4" />
          </button>
        </form>
      ) : (
        <>
          <button type="button" onClick={onSelect} className={cn("flex h-10 min-w-0 flex-1 items-center justify-between text-sm", active ? "font-semibold text-brand" : "text-text-secondary")}>
            <span className="truncate">{category.name}</span>
            <span className="px-1 text-xs">{count}</span>
          </button>
          <span className="flex opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
            <button type="button" aria-label="إعادة تسمية" onClick={() => setEditing(true)} className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface-2">
              <PencilIcon className="size-3.5" />
            </button>
            <button type="button" aria-label="حذف التصنيف" onClick={onDelete} className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface-2 hover:text-danger">
              <Trash2Icon className="size-3.5" />
            </button>
          </span>
        </>
      )}
    </li>
  );
}

function NewCategoryInput({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-2 flex gap-2 border-t border-border pt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        await onAdd(name.trim());
        setBusy(false);
        setName("");
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="تصنيف جديد…"
        className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-bg-base px-3 text-sm outline-none focus:border-brand"
      />
      <button type="submit" disabled={busy || !name.trim()} aria-label="إضافة تصنيف" className="flex size-10 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-40">
        <PlusIcon className="size-4" />
      </button>
    </form>
  );
}

function ItemRow({
  item,
  currencyCode,
  dragDisabled,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: MenuItem;
  currencyCode: string;
  dragDisabled: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: dragDisabled });
  const available = item.is_available !== false;
  const opts = item.price_options ?? [];

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-3 bg-bg-surface px-3 py-3 sm:px-4", isDragging && "relative z-10 shadow-lg")}
    >
      <DragHandle listeners={listeners} attributes={attributes} disabled={dragDisabled} />
      <button type="button" onClick={onEdit} className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-bg-surface-2">
        {item.image_url ? (
          <Image src={item.image_url} alt="" fill className={cn("object-cover", !available && "grayscale")} sizes="56px" />
        ) : (
          <UtensilsCrossedIcon className="m-auto size-5 text-text-muted" />
        )}
      </button>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-start">
        <p className={cn("truncate font-semibold", !available && "text-text-muted")}>{item.name}</p>
        <p className="truncate text-sm text-text-muted">
          {opts.length > 1 ? (
            opts.map((o) => `${o.label} ${formatMenuPrice(o.price_cents, currencyCode)}`).join(" · ")
          ) : (
            <span dir="ltr">{formatMenuPrice(opts[0]?.price_cents ?? item.price, currencyCode)}</span>
          )}
        </p>
      </button>
      <label className="flex shrink-0 cursor-pointer items-center gap-2" title={available ? "متاح — اضغط لإيقافه" : "نفد — اضغط لإتاحته"}>
        <span className={cn("hidden text-xs font-semibold sm:inline", available ? "text-success" : "text-text-muted")}>{available ? "متاح" : "نفد"}</span>
        <span className={cn("relative h-6 w-11 rounded-full transition", available ? "bg-success" : "bg-border-strong")}>
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", available ? "start-[22px]" : "start-0.5")} />
        </span>
        <input type="checkbox" className="sr-only" checked={available} onChange={onToggle} aria-label={`إتاحة ${item.name}`} />
      </label>
      <button type="button" aria-label="حذف" onClick={onDelete} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface-2 hover:text-danger">
        <Trash2Icon className="size-4" />
      </button>
    </li>
  );
}
