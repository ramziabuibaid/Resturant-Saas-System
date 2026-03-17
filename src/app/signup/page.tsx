import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Create account | Admin",
  description: "Create an owner account",
};

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/admin");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-muted-foreground">
            After signing up, sign in once. You will then choose your restaurant to complete setup (no need to run SQL manually).
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
