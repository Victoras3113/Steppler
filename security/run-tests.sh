#!/usr/bin/env bash
# Runs the database security tests on a throw-away local PostgreSQL 16:
# base schema + photos + all migrations, then simulated owner / admin / driver / attacker / visitor checks.
# Usage: bash security/run-tests.sh   (needs PostgreSQL 16 server binaries and python3; run as root or the postgres user)
set -euo pipefail
cd "$(dirname "$0")/.."
B=${PG_BIN:-/usr/lib/postgresql/16/bin}; D=$(mktemp -d); PORT=5499
chown postgres "$D" 2>/dev/null || true
as_pg() { if [ "$(id -un)" = postgres ]; then bash -c "$1"; else su postgres -c "$1"; fi; }
as_pg "$B/initdb -D $D/data -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log start >/dev/null"; sleep 2
trap 'as_pg "$B/pg_ctl -D $D/data stop -m fast >/dev/null"; rm -rf "$D"' EXIT
python3 - "$D" <<'PY'
import re, sys
src = open("supabase/functions/_shared/migrations.ts").read()
sqls = [m.replace("\\\\", "\\") for m in re.findall(r"sql: `(.*?)`,\n  \}", src, re.S)]
open(sys.argv[1] + "/migrations.sql", "w").write("\n".join(sqls))
PY
cp supabase/schema.sql supabase/photos.sql security/supabase-mock.sql security/rls-tests.sql "$D"/; chmod a+r "$D"/*.sql
P="psql -h $D -p $PORT -U postgres -X -q -A -t"
as_pg "$P -v ON_ERROR_STOP=1 -f $D/supabase-mock.sql -f $D/schema.sql -f $D/photos.sql -f $D/migrations.sql" 2>&1 | grep -iv "wal_level\|HINT\|NOTICE" || true
as_pg "$P -v ON_ERROR_STOP=1 -f $D/migrations.sql" 2>&1 | grep -i "error" && { echo "MIGRATIONS NOT IDEMPOTENT"; exit 1; } || true
as_pg "$P -f $D/rls-tests.sql" 2>&1 | grep -v '^$' | sed -E 's/^psql:[^:]+:[0-9]+: //' > "$D/actual.txt"
if diff -u security/expected.txt "$D/actual.txt"; then echo "ALL SECURITY TESTS PASSED"; else echo "SECURITY TESTS DIFFER FROM EXPECTED (see diff above)"; exit 1; fi
