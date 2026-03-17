import { redirect } from "next/navigation";
import { getSession, getProfile } from "@/app/actions/auth";
import { CompleteProfileForm } from "./complete-profile-form";

export const metadata = {
  title: "إعداد مطعمك | منيو",
  description: "إنشاء مطعم جديد والحصول على أول شهر مجاناً",
};

export default async function CompleteProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await getProfile();
  if (profile?.role === "super_admin") redirect("/admin");
  if (profile?.restaurant_id) redirect("/owner");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4" dir="rtl">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">إنشاء مطعمك</h1>
          <p className="text-sm text-muted-foreground">
            أنشئ مطعمك جديداً واحصل على أول شهر مجاناً — دون إدخال بطاقة بنكية.
          </p>
        </div>
        <CompleteProfileForm />
      </div>
    </div>
  );
}
