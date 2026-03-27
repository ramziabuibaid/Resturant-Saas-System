import { redirect } from "next/navigation";
import { resolveAdminTenant } from "@/lib/admin-resolve-tenant";
import {
  getProfileForRestaurantAdminOrRedirect,
  getRestaurantForProfile,
} from "@/app/actions/auth";
import { listRestaurantWaiters } from "@/app/actions/waiters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RestaurantLogoForm } from "./restaurant-logo-form";
import { RestaurantPublicContentForm } from "./restaurant-public-content-form";
import { RestaurantLoyaltySettingsForm } from "./restaurant-loyalty-settings-form";
import { RestaurantPhoneCountryForm } from "./restaurant-phone-country-form";
import { RestaurantWaitersSettingsForm } from "./restaurant-waiters-settings-form";

export const metadata = {
  title: "الإعدادات | لوحة المطعم",
  description: "إعدادات المطعم",
};

/** صفحة لوحة المطعم فقط — عند الدخول بدون subdomain نوجّه إلى /admin */
export default async function AdminSettingsPage() {
  const tenant = await resolveAdminTenant();
  if (!tenant) redirect("/admin");

  const profile = await getProfileForRestaurantAdminOrRedirect(tenant.id);
  const restaurant = await getRestaurantForProfile(profile);
  const { waiters: restaurantWaiters } = await listRestaurantWaiters();

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
          <CardTitle>الجوال والواتساب (الطلبات)</CardTitle>
          <CardDescription>
            حدّد مقدمة الدولة لدمجها مع أرقام الزبائن في قائمة الطلبات — اتصال وواتساب برسالة جاهزة ورابط التتبع.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restaurant && (
            <RestaurantPhoneCountryForm
              restaurantId={restaurant.id}
              initialPrefix={restaurant.phone_country_prefix ?? null}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>محتوى صفحة المنيو العامة</CardTitle>
          <CardDescription>
            تحكم في نصوص الهيرو والفوتر التي تظهر لعملائك في صفحة المنيو.
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
              initialSecondaryCurrencyEnabled={
                restaurant.secondary_currency_enabled === true
              }
              initialSecondaryCurrencyCode={
                restaurant.secondary_currency_code ?? null
              }
              initialSecondaryExchangeRate={
                restaurant.secondary_currency_exchange_rate != null
                  ? Number(restaurant.secondary_currency_exchange_rate)
                  : null
              }
              initialMenuTitleAnimationEnabled={
                restaurant.menu_title_animation_enabled === true
              }
              initialMenuBannerUrl={restaurant.menu_banner_url ?? null}
              initialMenuBannerKind={
                restaurant.menu_banner_kind === "video" ||
                restaurant.menu_banner_kind === "image"
                  ? restaurant.menu_banner_kind
                  : null
              }
              initialMenuBannerCaption={restaurant.menu_banner_caption ?? null}
              initialPublicAddress={restaurant.public_address ?? null}
              initialPublicMapsUrl={restaurant.public_maps_url ?? null}
              initialPublicPhone1={restaurant.public_phone_1 ?? null}
              initialPublicPhone2={restaurant.public_phone_2 ?? null}
              initialPublicPhone3={restaurant.public_phone_3 ?? null}
              initialSocialFacebookUrl={restaurant.social_facebook_url ?? null}
              initialSocialInstagramUrl={restaurant.social_instagram_url ?? null}
              initialSocialTiktokUrl={restaurant.social_tiktok_url ?? null}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>الويترز والطاولات</CardTitle>
          <CardDescription>
            فعّل نظام الويترز لإضافة أسماء الموظفين المسؤولين عن خدمة الطاولات، ثم اربط كل طاولة بويتر
            من صفحة الطاولات. يظهر اسم الويتر في الطلبات وتتوفر فلاتر حسب الطاولة والويتر.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restaurant && (
            <RestaurantWaitersSettingsForm
              restaurantId={restaurant.id}
              initialEnabled={restaurant.waiters_system_enabled === true}
              initialWaiters={restaurantWaiters}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>الولاء والنقاط</CardTitle>
          <CardDescription>
            حدّد كم يدفع الزبون لكسب نقطة واحدة، وما قيمة النقطة عند الخصم. يُطبَّق على الطلبات
            الجديدة عند تفعيل البرنامج.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restaurant && (
            <RestaurantLoyaltySettingsForm
              restaurantId={restaurant.id}
              currencyCode={restaurant.currency_code ?? null}
              initialEnabled={restaurant.loyalty_program_enabled === true}
              initialSpendCentsPerPoint={Number(
                restaurant.loyalty_spend_cents_per_point ?? 100
              )}
              initialPointValueCents={Number(restaurant.loyalty_point_value_cents ?? 10)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
