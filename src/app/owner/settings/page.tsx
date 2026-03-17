import { getProfileOrRedirect, getRestaurantForProfile } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RestaurantLogoForm } from "@/app/admin/settings/restaurant-logo-form";
import { RestaurantPublicContentForm } from "@/app/admin/settings/restaurant-public-content-form";

export const metadata = {
  title: "الإعدادات | لوحة المطعم",
  description: "إعدادات المطعم",
};

export default async function OwnerSettingsPage() {
  const profile = await getProfileOrRedirect();
  const restaurant = await getRestaurantForProfile(profile);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground">
          إعدادات المطعم والحساب.
        </p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>المطعم</CardTitle>
          <CardDescription>المطعم المرتبط بحسابك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">{restaurant?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            النطاق الفرعي: <code className="rounded bg-muted px-1">{restaurant?.subdomain ?? "—"}</code>
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>شعار المطعم</CardTitle>
          <CardDescription>
            يظهر الشعار في ترويسة صفحة المنيو للعملاء عند زيارة نطاق مطعمك.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restaurant && (
            <RestaurantLogoForm
              restaurantId={restaurant.id}
              currentLogoUrl={restaurant.logo_url ?? null}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>محتوى صفحة المنيو العامة</CardTitle>
          <CardDescription>
            تحكم في نصوص الهيرو والفوتر التي تظهر لعملائك في صفحة المنيو الرئيسية.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restaurant && (
            <RestaurantPublicContentForm
              restaurantId={restaurant.id}
              initialHeadline={restaurant.headline ?? null}
              initialSubheadline={restaurant.subheadline ?? null}
              initialHeroBackgroundUrl={restaurant.hero_background_url ?? null}
              initialFooterNote={restaurant.footer_note ?? null}
              initialCurrencyCode={restaurant.currency_code ?? null}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
