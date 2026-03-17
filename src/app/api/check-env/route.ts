import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ensureEnvLoaded } from "@/lib/load-env";

/**
 * للتشخيص فقط: يوضح هل متغيرات البيئة مُحمّلة.
 * احذف هذا الملف أو عطّل المسار في الإنتاج.
 */
export async function GET() {
  ensureEnvLoaded();
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  };

  let fileKeys: string[] = [];
  try {
    const cwd = process.cwd();
    const envLocalPath = join(cwd, ".env.local");
    if (existsSync(envLocalPath)) {
      const content = readFileSync(envLocalPath, "utf-8");
      fileKeys = content
        .split(/\r?\n/)
        .map((line) => line.replace(/#.*/, "").trim())
        .filter(Boolean)
        .map((line) => {
          const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
          return match ? match[1] : "";
        })
        .filter(Boolean);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    processEnv: env,
    keysInEnvLocalFile: fileKeys,
    cwd: process.cwd(),
  });
}
