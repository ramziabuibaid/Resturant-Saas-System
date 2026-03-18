import { redirect } from "next/navigation";

export default function SuperAdminPage() {
  // The dashboard is under /admin (same UI).
  redirect("/admin");
}

