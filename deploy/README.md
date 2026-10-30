# التشغيل على storeserver

المنصة تعمل في Docker على `storeserver` في المجلد `~/restaurant-saas`، مستقلة عن Supabase الخاص بـ bazarko.

| الحاوية | الدور |
|---|---|
| `db` | PostgreSQL 17 — بلا منفذ خارج Docker |
| `tools` | يطبّق migrations عند كل نشر ثم يتوقف؛ يُستخدم أيضاً للبذرة وتغيير كلمات المرور |
| `app` | التطبيق على `127.0.0.1:3100` (محلي على السيرفر فقط) |
| `backup` | نسخة يومية من القاعدة والصور في `~/restaurant-saas/backups` (تُحفظ 14 يوماً) |

## النشر

من جهاز التطوير:

```bash
deploy/deploy.sh
```

يزامن الكود (بدون الأسرار)، يبني، يطبّق migrations، يعيد التشغيل، ثم يفحص `/api/health`.

## الأسرار

`~/restaurant-saas/.env` على السيرفر فقط (صلاحيات 600، لا يُرفع إلى git):

```
POSTGRES_PASSWORD=...        # مولّدة عشوائياً عند الإعداد الأول
ROOT_DOMAIN=resturant.app
SEED_ADMIN_EMAIL=admin@resturant.app
```

كلمات المرور التي تولّدها البذرة في `~/restaurant-saas/secrets/seed-credentials.txt` (600).

## أوامر مفيدة (على السيرفر داخل `~/restaurant-saas`)

```bash
docker compose ps                                   # الحالة
docker compose logs -f app                          # سجلات التطبيق
docker compose exec db psql -U restaurant restaurant_saas            # SQL
docker compose run --rm tools npx tsx scripts/seed.ts                # البذرة (آمنة للتكرار)
docker compose run --rm tools npx tsx scripts/set-password.ts admin@resturant.app   # تغيير كلمة مرور
```

## الاستعادة من نسخة احتياطية

```bash
cd ~/restaurant-saas
docker compose stop app
gunzip -c backups/db_YYYY-MM-DD_HHMM.sql.gz | docker compose exec -T db psql -U restaurant restaurant_saas
docker compose start app
```

الصور: `docker compose cp` أو فك `uploads_*.tar.gz` داخل volume `restaurant-saas_uploads`.

## معاينة من جهاز التطوير (قبل ربط الدومين)

```bash
ssh -N -L 3100:127.0.0.1:3100 storeserver
```

ثم افتح `http://demo.localhost:3100`.

---

## تجديد رمز الـ Tunnel

بعد Refresh token في Cloudflare، شغّل من جهازك (يطلب الرمز دون أن يظهر):

```bash
ssh -t storeserver 'read -rsp "Token: " t; echo; cd ~/restaurant-saas && sed -i "/^CLOUDFLARE_TUNNEL_TOKEN=/d" .env && echo "CLOUDFLARE_TUNNEL_TOKEN=$t" >> .env && docker compose --profile tunnel up -d --force-recreate tunnel'
```

## M8 — ربط الدومين `resturant.app` ✅ (تم 2026-10-30 — للمرجع)

حالياً `resturant.app` يشير إلى Vercel، و DNS عند Vercel. الـ Tunnel يحتاج الدومين في Cloudflare.

### 1) نقل DNS إلى Cloudflare (من حسابك — نفس حساب bazarko.app)

1. Cloudflare Dashboard ← **Add a domain** ← `resturant.app` ← الخطة المجانية.
2. Cloudflare يعطيك عنوانَي nameservers (مثل `xxx.ns.cloudflare.com`).
3. عند **مسجّل الدومين** (حيث اشتريت resturant.app) ← غيّر الـ nameservers إلى عنوانَي Cloudflare.
4. انتظر حتى تظهر «Active» في Cloudflare (من دقائق إلى ساعات).

> لا تحذف سجلات Vercel في Cloudflare الآن — الموقع القديم يبقى يعمل حتى نحوّل في الخطوة 3.

### 2) Tunnel للمنصة

الخيار الأسهل: **Tunnel جديد من لوحة Cloudflare** (لا يحتاج sudo ولا يمس tunnel bazarko):

1. Cloudflare ← **Zero Trust** ← Networks ← **Tunnels** ← Create ← Cloudflared ← الاسم `restaurant-saas`.
2. انسخ الـ **token** (سلسلة طويلة تبدأ بـ `eyJ`).
3. ضعه في `~/restaurant-saas/.env` على السيرفر بنفسك:
   ```
   CLOUDFLARE_TUNNEL_TOKEN=eyJ...
   ```
4. في صفحة الـ Tunnel ← **Public Hostnames** أضف:
   | Subdomain | Domain | Service |
   |---|---|---|
   | *(فارغ)* | resturant.app | `http://app:3000` |
   | `*` | resturant.app | `http://app:3000` |

ثم أخبرني، وأضيف حاوية `cloudflared` إلى `docker-compose.yml` وأشغّلها.

### 3) التحويل النهائي

بعد أن يعمل الـ Tunnel: حذف سجلات Vercel القديمة من DNS، إيقاف مشروع Vercel، ثم Supabase.
