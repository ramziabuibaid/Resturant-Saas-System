import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "إنشاء حساب مطعم | منيو",
  description: "إنشاء حساب مطعم والحصول على أول شهر مجاناً",
};

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/complete-profile");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4" dir="rtl">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">إنشاء حساب مطعم</h1>
          <p className="text-sm text-muted-foreground">
            أنشئ حسابك ثم أنشئ مطعمك من نفس الصفحة — أول شهر مجاناً دون إدخال بطاقة بنكية.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
