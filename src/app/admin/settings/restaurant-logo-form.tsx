"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadRestaurantLogo } from "@/lib/supabase/storage";
import { updateRestaurantLogo } from "@/app/actions/admin-restaurant";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  restaurantId: string;
  currentLogoUrl: string | null;
};

export function RestaurantLogoForm({ restaurantId, currentLogoUrl }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!file) {
      setError("اختر صورة للشعار.");
      return;
    }
    setLoading(true);
    const uploadResult = await uploadRestaurantLogo(restaurantId, file);
    if ("error" in uploadResult) {
      setError(uploadResult.error);
      setLoading(false);
      return;
    }
    const updateResult = await updateRestaurantLogo(restaurantId, uploadResult.url);
    setLoading(false);
    if (updateResult.error) {
      setError(updateResult.error);
      return;
    }
    setLogoUrl(uploadResult.url);
    setFile(null);
    setSuccess(true);
  }

  function handleRemove() {
    setError(null);
    setSuccess(false);
    setFile(null);
    setLogoUrl(null);
    updateRestaurantLogo(restaurantId, null).then((r) => {
      if (r.error) setError(r.error);
      else setSuccess(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-2">
          {logoUrl ? (
            <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-border bg-muted">
              <Image
                src={logoUrl}
                alt="شعار المطعم"
                fill
                className="object-contain"
                sizes="160px"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 text-muted-foreground">
              <span className="text-xs">لا يوجد شعار</span>
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            يظهر الشعار في ترويسة صفحة المنيو للعملاء
          </p>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <Label htmlFor="logo-file">صورة الشعار (JPG, PNG, WebP)</Label>
            <input
              id="logo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground file:transition-colors"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">تم حفظ الشعار.</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading || !file}>
              {loading ? "جاري الرفع…" : "رفع الشعار"}
            </Button>
            {logoUrl && (
              <Button type="button" variant="outline" onClick={handleRemove} disabled={loading}>
                إزالة الشعار
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
