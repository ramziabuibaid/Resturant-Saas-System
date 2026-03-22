"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateRestaurantLoyaltySettings } from "@/app/actions/admin-restaurant";
import { MENU_CURRENCIES } from "@/lib/currencies";

type Props = {
  restaurantId: string;
  currencyCode: string | null;
  initialEnabled: boolean;
  initialSpendCentsPerPoint: number;
  initialPointValueCents: number;
};

function parseMajorToCents(raw: string): number | null {
  const n = parseFloat(raw.replace(",", ".").trim());
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function RestaurantLoyaltySettingsForm({
  restaurantId,
  currencyCode,
  initialEnabled,
  initialSpendCentsPerPoint,
  initialPointValueCents,
}: Props) {
  const code =
    currencyCode && MENU_CURRENCIES.some((c) => c.code === currencyCode)
      ? currencyCode
      : "SAR";
  const symbol = MENU_CURRENCIES.find((c) => c.code === code)?.symbol ?? "﷼";

  const [enabled, setEnabled] = useState(initialEnabled);
  const [spendMajor, setSpendMajor] = useState(
    String((initialSpendCentsPerPoint || 100) / 100)
  );
  const [pointValueMajor, setPointValueMajor] = useState(
    String((initialPointValueCents || 10) / 100)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const preview = useMemo(() => {
    const spendC = parseMajorToCents(spendMajor);
    const valC = parseMajorToCents(pointValueMajor);
    if (spendC == null || valC == null || spendC < 1 || valC < 1) return null;
    // لكل 100 وحدة إنفاق (بالسنت) كم «قيمة مستردة» بالسنت إذا حُوِّلت النقاط؟
    const pointsPer100CentsSpent = 100 / spendC;
    const rewardCentsPer100Spent = pointsPer100CentsSpent * valC;
    const pct = (rewardCentsPer100Spent / 100) * 100;
    return { rewardCentsPer100Spent, pct };
  }, [spendMajor, pointValueMajor]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const spendCents = parseMajorToCents(spendMajor);
    const valCents = parseMajorToCents(pointValueMajor);
    if (spendCents == null || valCents == null) {
      setLoading(false);
      setError("أدخل أرقاماً صحيحة للمبالغ");
      return;
    }

    const result = await updateRestaurantLoyaltySettings(restaurantId, {
      loyalty_program_enabled: enabled,
      loyalty_spend_cents_per_point: spendCents,
      loyalty_point_value_cents: valCents,
    });

    setLoading(false);
    if (result.error) setError(result.error);
    else setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border/60 p-4">
        <div className="space-y-1">
          <Label htmlFor="loyalty-enabled">تفعيل برنامج النقاط</Label>
          <p className="text-xs text-muted-foreground">
            عند التعطيل: يُسجَّل إجمالي المشتريات للتقارير دون منح نقاط جديدة.
          </p>
        </div>
        <Switch
          id="loyalty-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      <div className="space-y-4 rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
        <p className="text-sm font-medium">احتساب النقاط</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong>القاعدة:</strong> عدد النقاط = قيمة الطلب (بالسنت) ÷ مبلغ الإنفاق لكسب نقطة واحدة
          (يُقص الجزء الكسري). مثال: إنفاق 350 سنت وشرط 100 سنت لكل نقطة → 3 نقاط.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="spend-per-point">
            مبلغ الإنفاق لكسب نقطة واحدة ({symbol} — الوحدة الرئيسية للعملة)
          </Label>
          <Input
            id="spend-per-point"
            type="text"
            inputMode="decimal"
            dir="ltr"
            className="font-mono tabular-nums"
            value={spendMajor}
            onChange={(e) => setSpendMajor(e.target.value)}
            placeholder="1.00"
          />
          <p className="text-[11px] text-muted-foreground">
            مثال: 1 يعني أن كل 1.00 من عملتك يمنح نقطة واحدة (إذا كانت أصغر وحدة 0.01).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="point-value">
            قيمة نقطة واحدة عند الخصم لاحقاً ({symbol})
          </Label>
          <Input
            id="point-value"
            type="text"
            inputMode="decimal"
            dir="ltr"
            className="font-mono tabular-nums"
            value={pointValueMajor}
            onChange={(e) => setPointValueMajor(e.target.value)}
            placeholder="0.10"
          />
          <p className="text-[11px] text-muted-foreground">
            عند تفعيل الاستبدال في المستقبل: كل نقطة تخصم من الفاتورة بهذا المبلغ من عملتك.
          </p>
        </div>

        {preview ? (
          <p className="rounded-md bg-background/80 px-3 py-2 text-xs text-muted-foreground">
            تقدير تقريبي: عن كل 100 {symbol} من الإنفاق المؤهل، قيمة النقاط المكتسبة تساوي حوالي{" "}
            <span dir="ltr" className="font-medium text-foreground tabular-nums">
              {(preview.rewardCentsPer100Spent / 100).toFixed(2)}
            </span>{" "}
            {symbol} عند الاستبدال (أي ~{preview.pct.toFixed(1)}% من قيمة الإنفاق كرصيد مسترد).
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">تم حفظ الإعدادات.</p>
      ) : null}

      <Button type="submit" disabled={loading}>
        {loading ? "جاري الحفظ..." : "حفظ إعدادات الولاء"}
      </Button>
    </form>
  );
}
