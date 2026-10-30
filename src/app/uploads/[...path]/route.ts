import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { MIME_BY_EXT, UPLOAD_DIR } from "@/lib/uploads/server";

/*
 * يقدّم الملفات المرفوعة: /uploads/{restaurantId}/{uuid}.{ext}
 * الأسماء عشوائية وغير قابلة للتغيير، فالتخزين المؤقت سنة كاملة آمن.
 * يدعم Range (ضروري لتشغيل الفيديو في Safari).
 */

const DIR_RE = /^[0-9a-f-]{36}$/;
const FILE_RE = /^[0-9a-f-]{36}\.(jpg|png|gif|webp|mp4|webm)$/;

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path;
  if (segments.length !== 2 || !DIR_RE.test(segments[0]) || !FILE_RE.test(segments[1])) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, segments[0], segments[1]);
  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) return new Response("Not found", { status: 404 });

  const ext = segments[1].split(".").pop()!;
  const headers = new Headers({
    "Content-Type": MIME_BY_EXT[ext],
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  });

  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }

  headers.set("Content-Length", String(info.size));
  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, { headers });
}
