import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/current-user";
import { getSessionUser } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { CompleteProfileForm } from "./complete-profile-form";

export const metadata = {
  title: "إعداد مطعمك | منيو",
  description: "إنشاء مطعم جديد والحصول على أول شهر مجاناً",
};

export default async function CompleteProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const profile = await getProfile();
  if (profile?.role === "super_admin") redirect("/admin");
  if (profile?.restaurant_id) redirect("/admin");

  return (
    <AuthShell title="بيانات مطعمك" subtitle="الاسم والرابط وطريقة التسعير — تستطيع تغييرها لاحقاً." step={2}>
      <CompleteProfileForm />
    </AuthShell>
  );
}
