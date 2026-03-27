"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { MenuItemImagePlaceholder } from "@/components/menu-item-image-placeholder";
import type { MenuItem } from "@/lib/types/database";
import { formatMenuPrice } from "@/lib/currencies";
import { resolveSecondaryUnitCents } from "@/lib/secondary-currency";
import {
  AddItemButton,
  type CartLine,
} from "@/components/menu-ordering";

function getDisplayPrice(item: MenuItem): number {
  const opts = item.price_options;
  if (opts && Array.isArray(opts) && opts.length > 0) return opts[0].price_cents;
  return item.price;
}

const AUTO_ADVANCE_MS = 6500;
const SWIPE_THRESHOLD_PX = 48;

type MenuFeaturedStoriesBannerProps = {
  items: MenuItem[];
  currencyCode: string;
  secondaryCurrencyEnabled: boolean;
  secondaryCurrencyCode: string | null;
  exchangeRate: number | null;
  onAdd: (line: CartLine) => void;
  orderContext: "table_qr" | "remote";
};

export function MenuFeaturedStoriesBanner({
  items,
  currencyCode,
  secondaryCurrencyEnabled,
  secondaryCurrencyCode,
  exchangeRate,
  onAdd,
  orderContext,
}: MenuFeaturedStoriesBannerProps) {
  const [index, setIndex] = useState(0);
  const [manualTick, setManualTick] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setReduceMotion(
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  const n = items.length;
  const safeIndex = n === 0 ? 0 : Math.min(index, n - 1);

  const go = useCallback(
    (delta: number) => {
      if (n <= 1) return;
      setIndex((i) => {
        const next = i + delta;
        if (next < 0) return n - 1;
        if (next >= n) return 0;
        return next;
      });
      setManualTick((t) => t + 1);
    },
    [n]
  );

  useEffect(() => {
    setIndex(0);
    setManualTick((t) => t + 1);
  }, [items]);

  useEffect(() => {
    if (n <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1 >= n ? 0 : i + 1));
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(t);
  }, [n, safeIndex]);

  if (n === 0) return null;

  const item = items[safeIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-5 overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-950 shadow-xl shadow-stone-900/20 dark:border-white/10 dark:shadow-black/50"
    >
      <div
        className="absolute start-0 end-0 top-0 z-20 flex gap-1 px-2 pt-2"
        dir="ltr"
      >
        {items.map((it, i) => (
          <div
            key={it.id}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            {i < safeIndex ? (
              <div className="h-full w-full bg-white" />
            ) : i === safeIndex ? (
              n <= 1 || reduceMotion ? (
                <div className="h-full w-full bg-white" />
              ) : (
                <motion.div
                  key={`${safeIndex}-${manualTick}`}
                  className="h-full origin-left bg-white"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: AUTO_ADVANCE_MS / 1000,
                    ease: "linear",
                  }}
                />
              )
            ) : (
              <div className="h-full w-0 bg-white" />
            )}
          </div>
        ))}
      </div>

      <div
        className="relative aspect-[16/10] w-full sm:aspect-video"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX;
          if (end == null) return;
          const dx = end - start;
          if (dx > SWIPE_THRESHOLD_PX) go(-1);
          else if (dx < -SWIPE_THRESHOLD_PX) go(1);
        }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={item.id}
            className="absolute inset-0"
            initial={{ opacity: 0.35, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.2 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 896px"
                priority={safeIndex === 0}
                unoptimized
              />
            ) : (
              <MenuItemImagePlaceholder className="h-full w-full" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
          </motion.div>
        </AnimatePresence>

        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="السابق"
              className="absolute start-0 top-0 z-10 h-[55%] w-1/3 border-0 bg-transparent"
              onClick={() => go(-1)}
            />
            <button
              type="button"
              aria-label="التالي"
              className="absolute end-0 top-0 z-10 h-[55%] w-1/3 border-0 bg-transparent"
              onClick={() => go(1)}
            />
          </>
        )}

        <div
          className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-12 sm:px-6 sm:pb-5"
          dir="rtl"
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
            أطباق مقترحة
          </p>
          <h3 className="text-balance text-lg font-bold leading-tight text-white sm:text-xl">
            {item.name}
          </h3>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/85">
              {item.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="text-xl font-bold tabular-nums text-[var(--success)]"
                dir="ltr"
                style={{ unicodeBidi: "isolate" }}
              >
                {formatMenuPrice(getDisplayPrice(item), currencyCode)}
              </span>
              {secondaryCurrencyEnabled && secondaryCurrencyCode ? (
                (() => {
                  const opts = item.price_options;
                  let sec: number | null = null;
                  if (opts && opts.length > 0) {
                    const o = opts[0];
                    sec = resolveSecondaryUnitCents(
                      item,
                      o.price_cents,
                      o.label,
                      exchangeRate
                    );
                  } else {
                    sec = resolveSecondaryUnitCents(
                      item,
                      item.price,
                      null,
                      exchangeRate
                    );
                  }
                  if (sec == null) return null;
                  return (
                    <span
                      className="text-xs font-semibold tabular-nums text-white/80"
                      dir="ltr"
                      style={{ unicodeBidi: "isolate" }}
                    >
                      {formatMenuPrice(sec, secondaryCurrencyCode)}
                    </span>
                  );
                })()
              ) : null}
            </div>
            {item.is_available === false ? (
              <span className="rounded-full border border-red-400/50 bg-red-950/80 px-3 py-1.5 text-xs font-medium text-red-200">
                غير متاح حالياً
              </span>
            ) : (
              <AddItemButton
                item={item}
                unavailable={false}
                onAdd={onAdd}
                orderContext={orderContext}
              />
            )}
          </div>
        </div>
      </div>

      {n > 1 ? (
        <p
          dir="rtl"
          className="border-t border-white/10 bg-black/40 px-3 py-2 text-center text-[11px] text-white/75"
        >
          اسحب للتنقل، أو اضغط يمين ويسار الصورة — الشريط العلوي يملأ تلقائياً ثم ينتقل للطبق التالي
        </p>
      ) : null}
    </motion.div>
  );
}
