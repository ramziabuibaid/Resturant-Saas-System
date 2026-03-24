"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Category } from "@/lib/types/database";
import { createCategory } from "@/app/actions/admin-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronsUpDownIcon, Loader2Icon, PlusCircleIcon } from "lucide-react";

type CategoryPickerFieldProps = {
  id: string;
  restaurantId: string;
  categories: Category[];
  onCategoriesChange: React.Dispatch<React.SetStateAction<Category[]>>;
  value: string;
  onValueChange: (categoryId: string) => void;
  disabled?: boolean;
  onNotify: (type: "ok" | "err", text: string) => void;
};

function sortCategories(list: Category[]): Category[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export function CategoryPickerField({
  id,
  restaurantId,
  categories,
  onCategoriesChange,
  value,
  onValueChange,
  disabled = false,
  onNotify,
}: CategoryPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({ visibility: "hidden" });

  const selectedName = useMemo(() => {
    if (!value) return null;
    return categories.find((c) => c.id === value)?.name ?? null;
  }, [categories, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  const exactMatch = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return true;
    return categories.some((c) => c.name.trim().toLowerCase() === t);
  }, [categories, query]);

  const trimmedQuery = query.trim();
  const showCreateRow = trimmedQuery.length > 0 && !exactMatch;

  const updatePanelPosition = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const maxH = Math.min(280, window.innerHeight - r.bottom - 16);
    setPanelStyle({
      position: "fixed",
      top: r.bottom + 6,
      left: r.left,
      width: r.width,
      maxHeight: maxH,
      zIndex: 9999,
      visibility: "visible",
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, filtered.length, showCreateRow, query]);

  useLayoutEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onWin = () => updatePanelPosition();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleCreate() {
    if (!trimmedQuery || creating) return;
    setCreating(true);
    const { data, error } = await createCategory(restaurantId, trimmedQuery);
    setCreating(false);
    if (error) {
      onNotify("err", error);
      return;
    }
    if (data) {
      onCategoriesChange((prev) => sortCategories([...prev.filter((c) => c.id !== data.id), data]));
      onValueChange(data.id);
      setOpen(false);
      onNotify("ok", "تم إنشاء التصنيف.");
    }
  }

  function selectCategory(cat: Category) {
    onValueChange(cat.id);
    setOpen(false);
  }

  const panel =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={panelRef}
        role="listbox"
        style={panelStyle}
        className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg"
      >
        <div className="shrink-0 border-b border-[var(--border)] p-2">
          <Input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث أو اكتب اسم تصنيف جديد…"
            className="h-10 rounded-lg border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            autoComplete="off"
          />
        </div>
        {showCreateRow ? (
          <div className="shrink-0 border-b border-[var(--border)] p-1">
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreate()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm text-[var(--brand)] hover:bg-[var(--brand)]/10 disabled:opacity-60"
            >
              {creating ? (
                <Loader2Icon className="size-4 shrink-0 animate-spin" />
              ) : (
                <PlusCircleIcon className="size-4 shrink-0" />
              )}
              <span className="truncate">
                {creating ? "جاري الإنشاء…" : `إنشاء تصنيف «${trimmedQuery}»`}
              </span>
            </button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
          {filtered.length === 0 && !showCreateRow ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              {categories.length === 0
                ? "لا توجد تصنيفات بعد. اكتب اسماً في الحقل أعلاه لإنشاء تصنيف."
                : "لا توجد نتائج"}
            </p>
          ) : null}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={value === c.id}
              onClick={() => selectCategory(c)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm text-[var(--text-primary)] hover:bg-[var(--bg-base)]",
                value === c.id && "bg-[var(--brand)]/10 font-medium"
              )}
            >
              {value === c.id ? (
                <CheckIcon className="size-4 shrink-0 text-[var(--brand)]" />
              ) : (
                <span className="size-4 shrink-0" aria-hidden />
              )}
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className="relative w-full">
      <div ref={triggerRef} className="w-full">
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => {
              const next = !o;
              if (next) queueMicrotask(() => setQuery(""));
              return next;
            });
          }}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            "mt-1.5 flex h-11 w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-start text-sm font-normal text-[var(--text-primary)] hover:bg-[var(--bg-surface)]",
            !selectedName && "text-[var(--text-muted)]"
          )}
        >
          <span className="truncate">{selectedName ?? "اختر تصنيفاً"}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </div>
      {panel}
    </div>
  );
}
