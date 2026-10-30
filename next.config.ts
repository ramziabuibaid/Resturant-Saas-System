import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // نسخة قائمة بذاتها للنشر في Docker على السيرفر (M7)
  output: "standalone",
  // رفع الصور يقرأ مساراً متغيراً من القرص، فيظن التتبّع أنه يحتاج كل المشروع.
  // نستبعد صراحةً كل ما لا يلزم التشغيل — وأهمها ملفات الأسرار و .git.
  outputFileTracingExcludes: {
    "*": [
      ".env*",
      ".git/**",
      ".pgdata/**",
      ".seed-credentials.local",
      "uploads/**",
      "nanobanana/**",
      "docs/**",
      "scripts/**",
      "drizzle/**",
      "*.md",
      "src/**",
      ".claude/**",
      "**/.DS_Store",
      "tsconfig.tsbuildinfo",
    ],
  },
  // مسارات قديمة دُمجت في /admin (المرحلة 0)
  async redirects() {
    return [
      { source: "/owner/items", destination: "/admin/menu", permanent: true },
      { source: "/owner/:path*", destination: "/admin/:path*", permanent: true },
      { source: "/super-admin/:path*", destination: "/admin/:path*", permanent: true },
      { source: "/super_admin/:path*", destination: "/admin/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
