import { getLoyaltyPortalByToken } from "@/app/actions/customers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata = {
  title: "نقاطي وسجل الولاء",
  description: "رصيد النقاط وسجل عمليات الولاء",
};

function txLabel(type: string): string {
  switch (type) {
    case "earn":
      return "كسب نقاط";
    case "redeem_cash":
      return "استبدال نقدي";
    case "redeem_reward":
      return "استبدال مكافأة";
    case "adjustment":
      return "تعديل إداري";
    case "expiry":
      return "انتهاء صلاحية";
    case "bonus":
      return "نقاط إضافية";
    default:
      return type;
  }
}

export default async function LoyaltyPublicPage({ params }: Props) {
  const { token } = await params;
  const { customer, transactions, rewards, error } = await getLoyaltyPortalByToken(token);

  if (error || !customer) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>تعذر فتح صفحة النقاط</CardTitle>
            <CardDescription>{error ?? "الرابط غير صالح"}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>برنامج الولاء</CardTitle>
          <CardDescription>
            {customer.name ? `مرحبًا ${customer.name}` : "مرحبًا بك"} - رقم الجوال:{" "}
            <span dir="ltr" className="font-mono">
              {customer.phone}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">{customer.points_balance} نقطة</p>
          <p className="mt-2 text-xs text-muted-foreground">
            هذا الرابط خاص بك، لا تشاركه مع الآخرين.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل العمليات</CardTitle>
          <CardDescription>آخر عمليات الكسب والاستبدال</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد عمليات حتى الآن.</p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <div className="space-y-0.5">
                  <p className="font-medium">{txLabel(tx.tx_type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString("en-GB", {
                      dateStyle: "short",
                      timeStyle: "short",
                      hour12: false,
                    })}
                  </p>
                </div>
                <p
                  className={`font-mono tabular-nums ${
                    tx.points_delta >= 0 ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {tx.points_delta > 0 ? `+${tx.points_delta}` : tx.points_delta}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المكافآت المتاحة</CardTitle>
          <CardDescription>يمكنك طلب الاستبدال عند التواصل مع المطعم.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مكافآت متاحة حالياً.</p>
          ) : (
            rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-start justify-between rounded-md border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{reward.title}</p>
                  {reward.description ? (
                    <p className="text-xs text-muted-foreground">{reward.description}</p>
                  ) : null}
                </div>
                <p className="font-mono text-sm tabular-nums">{reward.points_cost} نقطة</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
