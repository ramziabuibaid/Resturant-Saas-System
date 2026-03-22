const BUCKET = "menu-images";

/**
 * Uploads a file to the menu-images bucket and returns the public URL.
 * Call from client only (uses createClient from client).
 */
export async function uploadMenuImage(
  restaurantId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { error: error.message };
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: publicUrl };
}

/**
 * رفع شعار المطعم إلى نفس الـ bucket (مسار restaurantId/logo.ext).
 * يُستخدم من صفحة إعدادات المطعم.
 */
export async function uploadRestaurantLogo(
  restaurantId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (!/^(jpe?g|png|webp|gif|svg)$/i.test(ext)) return { error: "نوع الملف غير مدعوم. استخدم صورة (jpg, png, webp, gif)." };
  const path = `${restaurantId}/logo.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) return { error: error.message };
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: publicUrl };
}

/**
 * رفع صورة الخلفية العريضة للهيرو (صفحة المنيو).
 * المسار: restaurantId/hero-bg.ext
 */
export async function uploadRestaurantHeroBackground(
  restaurantId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (!/^(jpe?g|png|webp|gif)$/i.test(ext))
    return { error: "نوع الملف غير مدعوم. استخدم صورة (jpg, png, webp, gif)." };
  const path = `${restaurantId}/hero-bg.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) return { error: error.message };
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: publicUrl };
}

/**
 * رفع بانر ترويجي للمنيو (صورة أو فيديو قصير).
 * المسار: restaurantId/menu-banner.ext
 */
export async function uploadRestaurantMenuBanner(
  restaurantId: string,
  file: File
): Promise<
  { url: string; kind: "image" | "video" } | { error: string }
> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  let kind: "image" | "video";
  if (/^(mp4|webm)$/i.test(ext)) kind = "video";
  else if (/^(jpe?g|png|webp|gif)$/i.test(ext)) kind = "image";
  else {
    return {
      error:
        "نوع الملف غير مدعوم. استخدم صورة (jpg, png, webp, gif) أو فيديو (mp4, webm).",
    };
  }
  const path = `${restaurantId}/menu-banner.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) return { error: error.message };
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: publicUrl, kind };
}
