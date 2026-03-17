"use client";

import { useEffect } from "react";

/**
 * إذا كانت الصفحة الحالية هي الرئيسية والـ host يشبه نطاق فرعي (مثل almankal.localhost)،
 * نتحقق من API ونوجّه إلى صفحة المنيو لضمان عرض منيو المطعم.
 */
export function SubdomainRedirect() {
  useEffect(() => {
    const hostname = window.location.hostname;
    const parts = hostname.trim().toLowerCase().split(".");
    const first = parts[0];
    if (
      parts.length < 2 ||
      !first ||
      first === "www" ||
      first === "app" ||
      first === "localhost"
    )
      return;
    if (window.location.pathname !== "/") return;
    const url = `/api/resolve-tenant?hostname=${encodeURIComponent(hostname)}`;
    fetch(url)
      .then((res) => res.json())
      .then((body: { tenant: { id: string; subdomain: string } | null }) => {
        if (body.tenant?.subdomain) {
          const menuPath = `/menu/${encodeURIComponent(body.tenant.subdomain)}`;
          window.location.href = menuPath;
        }
      })
      .catch(() => {});
  }, []);
  return null;
}
