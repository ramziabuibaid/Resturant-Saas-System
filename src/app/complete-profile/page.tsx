import { redirect } from "next/navigation";
import { getSession, getProfile } from "@/app/actions/auth";
import { getRestaurants } from "@/app/actions/admin-items";
import { CompleteProfileForm } from "./complete-profile-form";

export const metadata = {
  title: "Choose restaurant | Setup",
  description: "Link your account to a restaurant",
};

export default async function CompleteProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await getProfile();
  if (profile?.role === "super_admin") redirect("/admin");
  if (profile?.restaurant_id) redirect("/owner");

  const restaurants = await getRestaurants();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Choose your restaurant</h1>
          <p className="text-sm text-muted-foreground">
            Link your account to a restaurant to access the dashboard.
          </p>
        </div>
        <CompleteProfileForm restaurants={restaurants} />
      </div>
    </div>
  );
}
