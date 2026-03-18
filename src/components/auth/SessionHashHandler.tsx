"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function parseHashParams(hash: string): Record<string, string> {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return {};

  // URLSearchParams يتعامل مع قيم مشفّرة بشكل تلقائي
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

export function SessionHashHandler() {
  const router = useRouter();
  const didRunRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const params = parseHashParams(hash);
    const accessToken = params["access_token"];
    const refreshToken = params["refresh_token"];
    const type = params["type"];

    // عند وجود error في الـ hash بدون tokens، نرجع المستخدم للـ login.
    const hashError = params["error"];
    if (hashError && !accessToken) {
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      const errorDescription = params["error_description"];
      router.replace(
        `/login?error=${encodeURIComponent(hashError)}${
          errorDescription ? `&error_description=${encodeURIComponent(errorDescription)}` : ""
        }`
      );
      return;
    }

    if (!accessToken || !refreshToken) return;

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        // إزالة التوكنات من الـ URL بعد ضبط الجلسة
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message || "auth_error")}`);
          return;
        }

        if (type === "recovery") {
          router.replace("/auth/reset-password");
          return;
        }

        // أي تدفق آخر: فقط للـ login
        router.replace("/login");
      })
      .catch((e) => {
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
        router.replace(`/login?error=${encodeURIComponent(e?.message || "auth_error")}`);
      });
  }, [router]);

  return null;
}

