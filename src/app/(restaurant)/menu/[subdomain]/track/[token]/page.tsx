import { getOrderTrackingByToken } from "@/app/actions/orders";
import { notFound } from "next/navigation";
import { OrderTrackClient } from "./order-track-client";

type Props = {
  params: Promise<{ subdomain: string; token: string }>;
};

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

  return <OrderTrackClient subdomain={decoded} token={token} initialData={data} />;
}
