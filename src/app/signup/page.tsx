import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "إنشاء حساب مطعم | منيو",
  description: "إنشاء حساب مطعم والحصول على أول شهر مجاناً",
};

export default async function SignupPage() {
  const session = await getSessionUser();
  if (session) redirect("/complete-profile");

  return (
    <AuthShell title="أنشئ حساب مطعمك" subtitle="أول شهر مجاناً — بدون بطاقة بنكية." step={1}>
      <SignupForm />
    </AuthShell>
  );
}
