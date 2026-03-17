import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Debug endpoint: GET /api/debug-menu?subdomain=albaraka
 * Returns raw Supabase response for the given subdomain so you can verify
 * connection, column name, and RLS. Remove or restrict in production.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subdomain = searchParams.get("subdomain")?.trim().toLowerCase();
  if (!subdomain) {
    return NextResponse.json(
      { error: "Missing subdomain", usage: "/api/debug-menu?subdomain=albaraka" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .ilike("subdomain", subdomain)
    .maybeSingle();

  return NextResponse.json({
    subdomain,
    restaurant: restaurant ?? null,
    restaurantError: restaurantError
      ? { message: restaurantError.message }
      : null,
    hint: restaurantError
      ? "If restaurant exists, check RLS policies (see supabase/rls-public-menu.sql) and that the column is named 'subdomain'."
      : restaurant
        ? "Restaurant found."
        : "No row returned. Check subdomain value and RLS.",
  });
}
