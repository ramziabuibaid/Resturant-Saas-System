import Link from "next/link";

export default function MenuNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100 px-4">
      <h1 className="text-xl font-semibold text-stone-900">
        Restaurant not found
      </h1>
      <p className="max-w-sm text-center text-stone-600">
        This menu is not available. Please check the link or subdomain.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-stone-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
      >
        Go home
      </Link>
    </div>
  );
}
