import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth/current-user";
import { saveUpload, UPLOAD_KINDS, type UploadKind } from "@/lib/uploads/server";

/**
 * رفع صورة/فيديو لمطعم المستخدم الحالي.
 * POST multipart: kind = menu-item | logo | hero | banner، file = الملف.
 * المطعم يُؤخذ من الجلسة فقط.
 */
export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile?.restaurant_id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const kind = form?.get("kind");
  const file = form?.get("file");
  if (typeof kind !== "string" || !(kind in UPLOAD_KINDS) || !(file instanceof File)) {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const result = await saveUpload(profile.restaurant_id, kind as UploadKind, file);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
