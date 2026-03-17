"use client";

import { useState } from "react";
import { setProfileRestaurant } from "@/app/actions/auth";
import type { Restaurant } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = { restaurants: Restaurant[] };

export function CompleteProfileForm({ restaurants }: Props) {
  const [restaurantId, setRestaurantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    setError(null);
    setLoading(true);
    const { error: err } = await setProfileRestaurant(restaurantId);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setLoading(false);
    // Full navigation so the server sees the new profile
    window.location.href = "/owner";
  }

  if (restaurants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No restaurants found. Create a restaurant in Supabase (Table Editor → restaurants) first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="restaurant">Restaurant</Label>
        <select
          id="restaurant"
          value={restaurantId}
          onChange={(e) => setRestaurantId(e.target.value)}
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          disabled={loading}
        >
          <option value="">— Select —</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.subdomain})
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving…" : "Continue to dashboard"}
      </Button>
    </form>
  );
}
