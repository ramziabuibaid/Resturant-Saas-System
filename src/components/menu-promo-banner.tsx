"use client";

import Image from "next/image";

type Props = {
  url: string;
  kind: "image" | "video";
  caption?: string | null;
  alt: string;
};

export function MenuPromoBanner({ url, kind, caption, alt }: Props) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  return (
    <div className="mt-6 space-y-2">
      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-900 shadow-sm dark:border-white/10">
        {kind === "video" ? (
          <video
            src={trimmed}
            controls
            playsInline
            className="max-h-[min(70vh,520px)] w-full object-contain"
            preload="metadata"
          />
        ) : (
          <div className="relative aspect-[16/9] w-full max-h-[min(70vh,520px)] min-h-[140px]">
            <Image
              src={trimmed}
              alt={alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 640px"
              unoptimized
            />
          </div>
        )}
      </div>
      {caption?.trim() ? (
        <p className="text-center text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          {caption.trim()}
        </p>
      ) : null}
    </div>
  );
}
