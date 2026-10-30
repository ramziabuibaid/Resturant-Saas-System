import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";

export const metadata = {
  title: "لا تملك صلاحية الوصول",
};

/** يُعرض عندما يفتح مستخدم مسجّل لوحة مطعم لا يملكه (بدل حلقة إعادة توجيه). */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4" dir="rtl">
      <div className="w-full max-w-sm space-y-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center shadow-sm">
        <ShieldAlertIcon className="mx-auto size-10 text-[var(--danger)]" />
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">لا تملك صلاحية الوصول</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            الحساب الذي سجّلت به لا يملك هذا المطعم. سجّل الخروج ثم ادخل بحساب صاحب المطعم.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
            >
              تسجيل الخروج
            </button>
          </form>
          <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
