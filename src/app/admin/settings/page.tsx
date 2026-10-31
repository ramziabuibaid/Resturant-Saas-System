import { requireRestaurantAdmin } from "@/lib/admin-context";
import { getRestaurantForProfile } from "@/lib/data/restaurants";
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
import { headers } from "next/headers";
import { buildTenantPublicSiteUrl } from "@/lib/tenant-public-url";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";

const SECTIONS = [
  { id: "brand", label: "الشعار" },
  { id: "orders", label: "الطلبات والجوال" },
  { id: "content", label: "صفحة المنيو والتواصل" },
  { id: "staff", label: "الويترز" },
  { id: "loyalty", label: "الولاء والنقاط" },
];

export const metadata = {
  title: "الإعدادات | لوحة المطعم",
  description: "إعدادات المطعم",
};

/** صفحة لوحة المطعم فقط — عند الدخول بدون subdomain نوجّه إلى /admin */
export default async function AdminSettingsPage() {
  const { profile } = await requireRestaurantAdmin();
  const restaurant = await getRestaurantForProfile(profile);
  const { waiters: restaurantWaiters } = await listRestaurantWaiters();
  const h = await headers();
  const menuUrl = restaurant
    ? buildTenantPublicSiteUrl(restaurant.subdomain, h.get("host") ?? "", h.get("x-forwarded-proto") ?? "http")
    : "";

  return (
    <div className="space-y-6">
      {restaurant ? (
        <div className="flex flex-wrap items-center gap-4 rounded-[20px] border border-border bg-bg-surface p-5">
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold">{restaurant.name}</p>
            <p className="mt-1 truncate text-sm text-text-muted" dir="ltr">
              {menuUrl.replace(/^https?:\/\//, "")}
            </p>
          </div>
          <CopyLinkButton url={menuUrl} />
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark"
          >
            فتح المنيو
          </a>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 text-sm">
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <a href={`#${sec.id}`} className="block rounded-xl px-3 py-2 font-medium text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary">
                  {sec.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
      <Card id="brand" className="scroll-mt-24 rounded-[20px] border-border bg-bg-surface shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold">شعار المطعم</CardTitle>
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

      <Card id="orders" className="scroll-mt-24 rounded-[20px] border-border bg-bg-surface shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold">الجوال والواتساب (الطلبات)</CardTitle>
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

      <Card id="content" className="scroll-mt-24 rounded-[20px] border-border bg-bg-surface shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold">محتوى صفحة المنيو العامة</CardTitle>
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

      <Card id="staff" className="scroll-mt-24 rounded-[20px] border-border bg-bg-surface shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold">الويترز والطاولات</CardTitle>
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

      <Card id="loyalty" className="scroll-mt-24 rounded-[20px] border-border bg-bg-surface shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold">الولاء والنقاط</CardTitle>
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
      </div>
    </div>
  );
}
