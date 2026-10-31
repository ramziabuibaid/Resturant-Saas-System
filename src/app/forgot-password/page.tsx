import { AuthShell } from "@/components/auth/auth-shell";
import { supportWhatsAppUrl } from "@/lib/app-url";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "استعادة كلمة المرور | منيو",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="نسيت كلمة المرور؟" subtitle="أدخل بريدك ونرسل لك رابطاً لاختيار كلمة مرور جديدة.">
      <ForgotPasswordForm supportUrl={supportWhatsAppUrl("مرحباً، نسيت كلمة مرور حسابي في منيو")} />
    </AuthShell>
  );
}
