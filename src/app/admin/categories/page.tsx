import { redirect } from "next/navigation";

/** التصنيفات صارت جزءاً من صفحة المنيو */
export default function AdminCategoriesPage() {
  redirect("/admin/menu");
}
