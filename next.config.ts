import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;
// Fallback so images work on Vercel even if env isn't available at build time (استبدله بـ host مشروعك إن لزم)
const supabaseStorageHost = supabaseHost ?? "zhucpdyylouircudctct.supabase.co";

const nextConfig: NextConfig = {
  // مسارات قديمة دُمجت في /admin (المرحلة 0)
  async redirects() {
    return [
      { source: "/owner/items", destination: "/admin/menu", permanent: true },
      { source: "/owner/:path*", destination: "/admin/:path*", permanent: true },
      { source: "/super-admin/:path*", destination: "/admin/:path*", permanent: true },
      { source: "/super_admin/:path*", destination: "/admin/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseStorageHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
