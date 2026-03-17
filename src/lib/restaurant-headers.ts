import { headers } from "next/headers";

/** Must match the header names set in src/middleware.ts */
const RESTAURANT_HEADERS = {
  ID: "x-restaurant-id",
  SUBDOMAIN: "x-restaurant-subdomain",
} as const;

/**
 * Reads the restaurant identified by middleware from the request headers.
 * Only available when the request was rewritten from a restaurant subdomain.
 */
export async function getIdentifiedRestaurant(): Promise<{
  id: string;
  subdomain: string;
} | null> {
  const h = await headers();
  const id = h.get(RESTAURANT_HEADERS.ID);
  const subdomain = h.get(RESTAURANT_HEADERS.SUBDOMAIN);
  if (id && subdomain) return { id, subdomain };
  return null;
}
