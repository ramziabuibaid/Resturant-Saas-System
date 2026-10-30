#!/usr/bin/env bash
# قاعدة بيانات محلية للتطوير: PostgreSQL 17 في مجلد .pgdata داخل المشروع (منفذ 5442).
# الاستعمال: scripts/db-dev.sh start | stop | status | psql
set -euo pipefail
export LC_ALL=C
cd "$(dirname "$0")/.."

PG_BIN="${PG_BIN:-$(brew --prefix postgresql@17 2>/dev/null)/bin}"
DATA=".pgdata"
PORT=5442
DB=restaurant_saas

case "${1:-}" in
  start)
    if [ ! -d "$DATA" ]; then
      "$PG_BIN/initdb" -D "$DATA" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null
      echo "تم إنشاء مجلد القاعدة $DATA"
    fi
    if ! "$PG_BIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
      "$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/server.log" -w start >/dev/null
    fi
    "$PG_BIN/psql" -h localhost -p $PORT -U postgres -tc "select 1 from pg_database where datname='$DB'" | grep -q 1 \
      || "$PG_BIN/createdb" -h localhost -p $PORT -U postgres "$DB"
    echo "Postgres يعمل: postgres://postgres@localhost:$PORT/$DB"
    ;;
  stop)   "$PG_BIN/pg_ctl" -D "$DATA" -w stop ;;
  status) "$PG_BIN/pg_ctl" -D "$DATA" status ;;
  psql)   shift; exec "$PG_BIN/psql" -h localhost -p $PORT -U postgres "$DB" "$@" ;;
  *) echo "usage: $0 start|stop|status|psql"; exit 1 ;;
esac
