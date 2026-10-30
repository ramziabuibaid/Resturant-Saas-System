"use client";

import { useTheme } from "@/components/ThemeProvider";
import { SunIcon, MoonIcon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="theme-toggle-btn"
      aria-label="تبديل السمة"
    >
      {/* الأيقونتان معاً وCSS يختار — يتجنب اختلاف الرسم بين الخادم والمتصفح */}
      <SunIcon className="size-[18px] hidden dark:block" />
      <MoonIcon className="size-[18px] block dark:hidden" />
    </button>
  );
}
