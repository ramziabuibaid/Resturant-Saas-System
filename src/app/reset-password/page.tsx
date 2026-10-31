import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "كلمة مرور جديدة | منيو",
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="كلمة مرور جديدة" subtitle="اختر كلمة مرور جديدة لحسابك.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-text-secondary">
          الرابط غير مكتمل.{" "}
          <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
            اطلب رابطاً جديداً
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
