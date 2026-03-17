import { getSuperAdminProfileOrRedirect } from "@/app/actions/auth";
import { SuperAdminShell } from "./super-admin-shell";

export const metadata = {
  title: "Super Admin",
  description: "System owner dashboard",
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getSuperAdminProfileOrRedirect();

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
