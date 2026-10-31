import { createHash, randomBytes } from "node:crypto";

/*
 * دخول Google (OAuth 2.0 / OpenID Connect) مع PKCE — بلا مكتبات.
 * المسار يعمل على الدومين الرئيسي فقط (redirect URI واحد مسجّل في Google)،
 * ولذلك تكون جلسة Google على الدومين الرئيسي، ولوحة المطعم تعمل منه أيضاً.
 */

export const GOOGLE_STATE_COOKIE = "rs_google_oauth";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function newOAuthState() {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function googleAuthUrl(p: { redirectUri: string; state: string; challenge: string }): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: p.state,
    code_challenge: p.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export type GoogleIdentity = { sub: string; email: string; name: string | null };

/**
 * تبادل الرمز مع Google مباشرة عبر TLS، ثم قراءة id_token.
 * لأن الـ token وصل من Google نفسها (وليس من المتصفح) يكفي التحقق من الحقول دون التوقيع.
 */
export async function exchangeGoogleCode(p: { code: string; verifier: string; redirectUri: string }): Promise<GoogleIdentity | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: p.code,
      client_id: clientId,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: p.redirectUri,
      grant_type: "authorization_code",
      code_verifier: p.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error("[google] token exchange failed", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  const { id_token } = (await res.json()) as { id_token?: string };
  const part = id_token?.split(".")[1];
  if (!part) return null;

  const claims = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
    iss?: string;
    aud?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  const okIssuer = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!okIssuer || claims.aud !== clientId || !claims.exp || claims.exp * 1000 < Date.now()) return null;
  if (!claims.sub || !claims.email || claims.email_verified !== true) return null;
  return { sub: claims.sub, email: claims.email.toLowerCase(), name: claims.name?.trim() || null };
}
