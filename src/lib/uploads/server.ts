import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * تخزين الملفات المرفوعة على قرص السيرفر (بديل Supabase Storage).
 * المسار: {UPLOAD_DIR}/{restaurantId}/{uuid}.{ext}  ←  يُقدَّم على /uploads/{restaurantId}/{uuid}.{ext}
 */

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export const UPLOAD_KINDS = {
  "menu-item": { media: ["image"], maxBytes: 5 * 1024 * 1024 },
  logo: { media: ["image"], maxBytes: 2 * 1024 * 1024 },
  hero: { media: ["image"], maxBytes: 5 * 1024 * 1024 },
  banner: { media: ["image", "video"], maxBytes: 30 * 1024 * 1024 },
} as const;
export type UploadKind = keyof typeof UPLOAD_KINDS;

type Detected = { ext: string; media: "image" | "video"; mime: string };

/** نوع الملف من محتواه الفعلي (magic bytes) وليس من اسمه — SVG مرفوض عمداً (قد يحمل سكربت) */
export function detectFileType(buf: Buffer): Detected | null {
  const hex = (start: number, end: number) => buf.subarray(start, end).toString("hex");
  const ascii = (start: number, end: number) => buf.subarray(start, end).toString("latin1");
  if (hex(0, 3) === "ffd8ff") return { ext: "jpg", media: "image", mime: "image/jpeg" };
  if (hex(0, 8) === "89504e470d0a1a0a") return { ext: "png", media: "image", mime: "image/png" };
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return { ext: "gif", media: "image", mime: "image/gif" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", media: "image", mime: "image/webp" };
  if (ascii(4, 8) === "ftyp") return { ext: "mp4", media: "video", mime: "video/mp4" };
  if (hex(0, 4) === "1a45dfa3") return { ext: "webm", media: "video", mime: "video/webm" };
  return null;
}

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
};

export async function saveUpload(
  restaurantId: string,
  kind: UploadKind,
  file: File
): Promise<{ url: string; media: "image" | "video" } | { error: string }> {
  const rule = UPLOAD_KINDS[kind];
  if (file.size === 0) return { error: "الملف فارغ" };
  if (file.size > rule.maxBytes)
    return { error: `حجم الملف أكبر من المسموح (${Math.round(rule.maxBytes / 1024 / 1024)}MB)` };

  const buf = Buffer.from(await file.arrayBuffer());
  const type = detectFileType(buf);
  if (!type || !(rule.media as readonly string[]).includes(type.media)) {
    return {
      error:
        kind === "banner"
          ? "نوع الملف غير مدعوم. استخدم صورة (jpg, png, webp, gif) أو فيديو (mp4, webm)."
          : "نوع الملف غير مدعوم. استخدم صورة (jpg, png, webp, gif).",
    };
  }

  const name = `${randomUUID()}.${type.ext}`;
  const dir = path.join(UPLOAD_DIR, restaurantId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return { url: `/uploads/${restaurantId}/${name}`, media: type.media };
}
