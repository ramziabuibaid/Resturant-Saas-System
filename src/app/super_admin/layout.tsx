import { getSuperAdminProfileOrRedirectWithLoginMode } from "@/app/actions/auth";
import { AdminShell } from "@/app/admin/admin-shell";

export const metadata = {
  title: "Super Admin",
  description: "System owner dashboard",
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getSuperAdminProfileOrRedirectWithLoginMode("email");
  return <AdminShell>{children}</AdminShell>;
}

