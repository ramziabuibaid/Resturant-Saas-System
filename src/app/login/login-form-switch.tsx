"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "./login-form";
import { OwnerLoginForm } from "./owner-login-form";
import { SuperAdminUsernameLoginForm } from "./super-admin-username-form";
import { useSearchParams } from "next/navigation";

type Props = {
  serverTenant: { id: string; subdomain: string } | null;
  loginMode: "username" | "email";
};

/**
 * عندما لا يصل المطعم من السيرفر، نطلب المطعم عبر API باستخدام host المتصفح.
 */
export function LoginFormSwitch({ serverTenant, loginMode }: Props) {
  const [clientTenant, setClientTenant] = useState<{ id: string; subdomain: string } | null>(null);
  const [checking, setChecking] = useState(!serverTenant);
  const sp = useSearchParams();
  const modeParam = sp.get("mode");
  const effectiveLoginMode: "username" | "email" = modeParam === "username" ? "username" : loginMode;

  useEffect(() => {
    if (serverTenant) {
      setClientTenant(serverTenant);
      setChecking(false);
      return;
    }
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    if (!hostname) {
      setChecking(false);
      return;
    }
    const url = `/api/resolve-tenant?hostname=${encodeURIComponent(hostname)}`;
    fetch(url)
      .then((res) => res.json())
      .then((body: { tenant: { id: string; subdomain: string } | null }) => {
        setClientTenant(body.tenant ?? null);
        setChecking(false);
      })
      .catch(() => {
        setClientTenant(null);
        setChecking(false);
      });
  }, [serverTenant]);

  if (checking) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
        <span className="text-sm">جاري التحقق من النطاق…</span>
      </div>
    );
  }

  const tenant = serverTenant ?? clientTenant;
  if (tenant) {
    return (
      <>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">لوحة تحكم المطعم</h1>
          <p className="text-sm text-muted-foreground">
            أدخل اسم المستخدم وكلمة المرور للدخول إلى لوحة تحكم مطعمك.
          </p>
        </div>
        <OwnerLoginForm restaurantId={tenant.id} subdomain={tenant.subdomain} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">لوحة إدارة النظام</h1>
        <p className="text-sm text-muted-foreground">
          {effectiveLoginMode === "username"
            ? "تسجيل دخول مالك النظام (باسم المستخدم وكلمة المرور)."
            : "تسجيل دخول مالك النظام (بالبريد الإلكتروني وكلمة المرور)."}
        </p>
      </div>
      {effectiveLoginMode === "username" ? <SuperAdminUsernameLoginForm /> : <LoginForm />}
    </>
  );
}
