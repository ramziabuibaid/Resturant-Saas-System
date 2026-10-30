/*
 * رفع الملفات من المتصفح إلى /api/uploads (بديل Supabase Storage).
 * معامل restaurantId باقٍ للتوافق مع الواجهة فقط — الخادم يحدد المطعم من الجلسة.
 */

type Kind = "menu-item" | "logo" | "hero" | "banner";

async function upload(
  kind: Kind,
  file: File
): Promise<{ url: string; media: "image" | "video" } | { error: string }> {
  const body = new FormData();
  body.set("kind", kind);
  body.set("file", file);
  try {
    const res = await fetch("/api/uploads", { method: "POST", body });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? "فشل الرفع" };
    return json;
  } catch {
    return { error: "تعذر الاتصال بالخادم أثناء الرفع" };
  }
}

export async function uploadMenuImage(_restaurantId: string, file: File) {
  const r = await upload("menu-item", file);
  return "error" in r ? r : { url: r.url };
}

export async function uploadRestaurantLogo(_restaurantId: string, file: File) {
  const r = await upload("logo", file);
  return "error" in r ? r : { url: r.url };
}

export async function uploadRestaurantHeroBackground(_restaurantId: string, file: File) {
  const r = await upload("hero", file);
  return "error" in r ? r : { url: r.url };
}

export async function uploadRestaurantMenuBanner(
  _restaurantId: string,
  file: File
): Promise<{ url: string; kind: "image" | "video" } | { error: string }> {
  const r = await upload("banner", file);
  return "error" in r ? r : { url: r.url, kind: r.media };
}
