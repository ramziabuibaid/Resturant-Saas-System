#!/usr/bin/env bash
# نشر التطبيق على storeserver من جهاز التطوير.
#   deploy/deploy.sh            # مزامنة الكود ثم بناء وإعادة تشغيل
#
# على السيرفر: ~/restaurant-saas  (الأسرار في .env هناك، لا تُرفع من هنا أبداً)
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${DEPLOY_HOST:-storeserver}"
DIR="${DEPLOY_DIR:-restaurant-saas}"

echo "→ مزامنة الكود إلى $HOST:~/$DIR"
rsync -az --delete \
  --exclude /node_modules --exclude /.next --exclude /.git \
  --exclude '/.env*' --exclude /.pgdata --exclude /uploads --exclude /nanobanana \
  --exclude /backups --exclude /secrets --exclude /.seed-credentials.local --exclude /.claude \
  --exclude '.DS_Store' --exclude /tsconfig.tsbuildinfo \
  ./ "$HOST:$DIR/"

echo "→ بناء وتشغيل"
ssh "$HOST" "set -e; cd $DIR && test -f .env || { echo 'ملف .env غير موجود على السيرفر — انظر deploy/README.md'; exit 1; }
  profiles=''; grep -q '^CLOUDFLARE_TUNNEL_TOKEN=.' .env && profiles='--profile tunnel'
  docker compose \$profiles up -d --build --remove-orphans
  docker compose \$profiles ps"

echo "→ فحص الصحة"
ssh "$HOST" "for i in \$(seq 1 30); do curl -fsS http://127.0.0.1:3100/api/health && exit 0; sleep 2; done; echo 'فشل فحص الصحة'; exit 1"
echo
echo "✓ تم النشر"
