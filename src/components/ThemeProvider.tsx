"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export { useTheme } from "next-themes";

/**
 * الثيم عبر next-themes: يحقن سكربتاً قبل الرسم فلا يحدث وميض،
 * ويضع data-theme="light|dark" على <html> (انظر @custom-variant dark في globals.css).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}
