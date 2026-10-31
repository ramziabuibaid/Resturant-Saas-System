"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

export function CopyLinkButton({ url, label = "نسخ الرابط" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-text-secondary hover:bg-bg-surface-2"
    >
      {copied ? <CheckIcon className="size-4 text-success" /> : <CopyIcon className="size-4" />}
      {copied ? "تم النسخ" : label}
    </button>
  );
}
