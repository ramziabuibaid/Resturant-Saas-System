import { getProfile } from "@/app/actions/auth";

export const UNAUTHORIZED = "غير مصرح لك بهذه العملية";

/**
 * كل دالة في ملف "use server" هي endpoint عام يمكن لأي زائر استدعاؤه مباشرة —
 * التحقق في الـ layout لا يحميها. استدعِ هذا في أول كل action خاصة بمالك النظام.
 */
export async function isSuperAdminRequest(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "super_admin";
}
