import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, JetBrains_Mono, Readex_Pro } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import "./globals.css";

/** نص الواجهة — عربي واضح ومريح للقراءة الطويلة */
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** العناوين الكبيرة */
const readex = Readex_Pro({
  variable: "--font-display",
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

/** DESIGN_SYSTEM: JetBrains Mono — أرقام، كود، IDs */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "منيو — منيو رقمي وطلب من الطاولة لمطعمك",
  description: "منيو رقمي بكود QR، طلب من الطاولة، نقاط ولاء، ولوحة تحكم لمطعمك.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" suppressHydrationWarning className="transition-colors duration-300">
      <body
        className={`${plexArabic.variable} ${readex.variable} ${jetbrainsMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
