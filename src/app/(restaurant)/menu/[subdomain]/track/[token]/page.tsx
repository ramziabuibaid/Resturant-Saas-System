import { getRestaurantBySubdomain } from "@/app/actions/menu";
import { getOrderTrackingByToken } from "@/app/actions/orders";
import { notFound } from "next/navigation";
import { OrderTrackClient } from "./order-track-client";

type Props = {
  params: Promise<{ subdomain: string; token: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { subdomain } = await params;
  const decoded = decodeURIComponent(subdomain);
  const { data: restaurant } = await getRestaurantBySubdomain(decoded);
  const logoUrl = restaurant?.logo_url?.trim();
  return {
    title: restaurant
      ? `تتبّع الطلب — ${restaurant.name}`
      : `تتبّع الطلب — ${decoded}`,
    ...(logoUrl
      ? {
          icons: {
            icon: logoUrl,
            apple: logoUrl,
          },
        }
      : {}),
  };
}

export default async function OrderTrackPage({ params }: Props) {
  const { subdomain, token } = await params;
  const decoded = decodeURIComponent(subdomain);
  const data = await getOrderTrackingByToken(decoded, token);
  if (!data) notFound();

  return <OrderTrackClient subdomain={decoded} token={token} initialData={data} />;
}
