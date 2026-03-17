import { config } from "dotenv";
import { existsSync } from "fs";
import { join } from "path";

/**
 * تحميل .env.local (أو .env) إلى process.env (للسيرفر فقط).
 * Next.js يحمّل .env تلقائياً، لكن في بعض السياقات قد لا تكون المتغيرات متوفرة؛
 * dotenv يضمن القراءة من الملف.
 */
let loaded = false;
export function ensureEnvLoaded(): void {
  if (loaded) return;
  const cwd = process.cwd();
  const envLocal = join(cwd, ".env.local");
  const envFile = join(cwd, ".env");
  if (existsSync(envLocal)) {
    config({ path: envLocal });
  } else if (existsSync(envFile)) {
    config({ path: envFile });
  }
  loaded = true;
}
