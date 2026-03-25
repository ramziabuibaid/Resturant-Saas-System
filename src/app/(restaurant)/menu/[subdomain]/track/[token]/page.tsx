import { getOrderTrackingByToken } from "@/app/actions/orders";
import type { OrderStatus } from "@/lib/types/database";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-ui";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ subdomain: string; token: string }>;
};

const TRACK_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: ORDER_STATUS_LABELS.pending },
  { status: "accepted", label: ORDER_STATUS_LABELS.accepted },
  { status: "preparing", label: ORDER_STATUS_LABELS.preparing },
  { status: "ready", label: ORDER_STATUS_LABELS.ready },
  { status: "completed", label: ORDER_STATUS_LABELS.completed },
];

function stepIndex(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  const i = TRACK_STEPS.findIndex((s) => s.status === status);
  return i >= 0 ? i : 0;
}

export async function generateMetadata({ params }: Props) {
  const { subdomain } = await params;
  return {
    title: `تتبّع الطلب — ${decodeURIComponent(subdomain)}`,
  };
}

export default async function OrderTrackPage({ params }: Props) {
  const { subdomain, token } = await params;
  const decoded = decodeURIComponent(subdomain);
  const data = await getOrderTrackingByToken(decoded, token);
  if (!data) notFound();

  const activeIdx = stepIndex(data.status);
  const cancelled = data.status === "cancelled";

  return (
    <div className="min-h-svh bg-stone-950 px-4 py-10 text-stone-50">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <p className="text-sm text-stone-400">{data.restaurant_name}</p>
          <h1 className="mt-2 font-mono text-3xl font-bold tabular-nums" dir="ltr">
            طلب #{data.display_number}
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            تم الإنشاء{" "}
            {new Date(data.created_at).toLocaleString("ar-SA", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </header>

        {cancelled ? (
          <div className="rounded-2xl border border-red-500/45 bg-red-950/30 px-4 py-6 text-center">
            <p className="text-lg font-semibold text-red-100">{ORDER_STATUS_LABELS.cancelled}</p>
            <p className="mt-2 text-sm text-red-200/90">لم يعد هذا الطلب نشطاً.</p>
          </div>
        ) : (
          <ol className="relative me-2 space-y-0 border-s-2 border-stone-700 ps-6">
            {TRACK_STEPS.map((step, i) => {
              const done = i < activeIdx;
              const current = i === activeIdx;
              return (
                <li key={step.status} className="relative pb-8 last:pb-0">
                  <span
                    className={cn(
                      "absolute -start-[21px] top-0 flex size-4 shrink-0 rounded-full border-2 border-stone-800",
                      done && "bg-emerald-500",
                      current && !done && "scale-110 bg-amber-400 ring-4 ring-amber-400/30",
                      !done && !current && "bg-stone-700"
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "rounded-xl border px-4 py-3",
                      current
                        ? "border-amber-500/60 bg-amber-950/40"
                        : done
                          ? "border-emerald-600/40 bg-emerald-950/20"
                          : "border-stone-800 bg-stone-900/50 opacity-70"
                    )}
                  >
                    <p className="font-semibold">{step.label}</p>
                    {current ? (
                      <p className="mt-1 text-xs text-stone-400">الحالة الحالية لطلبك</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-10 text-center text-xs text-stone-500">
          هذه الصفحة للاطلاع فقط. للاستفسار تواصل مع المطعم مباشرة.
        </p>
      </div>
    </div>
  );
}
