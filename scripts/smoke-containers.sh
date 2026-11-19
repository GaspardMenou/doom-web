#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

project="doom-web-smoke-$$"
export FRONTEND_HOST=127.0.0.1 FRONTEND_PORT=0
compose() { docker compose -p "$project" "$@"; }
cleanup() {
    result=$?
    if [ "$result" -ne 0 ]; then compose logs --no-color || true; fi
    compose down --volumes --remove-orphans >/dev/null 2>&1 || true
    exit "$result"
}
trap cleanup 0
trap 'exit 130' INT
trap 'exit 143' TERM

compose up -d --wait --wait-timeout 60 --no-build --pull never
python3 - "http://$(compose port frontend 8080)" <<'PY'
import json
import re
import sys
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen

base = sys.argv[1]
with urlopen(base, timeout=10) as response:
    html = response.read().decode()
assert '<div id="root">' in html, "Le front ne sert pas l'application React"
asset = re.search(r'src="([^\"]+\.js)"', html).group(1)
with urlopen(base + asset, timeout=10) as response:
    bundle = response.read().decode()
assert 'localhost:8001' not in bundle, "Le build utilise encore l'API locale"
with urlopen(base + '/api/scores/', timeout=10) as response:
    assert json.load(response) == [], "Le proxy /api ne renvoie pas le classement JSON"
try:
    urlopen(base + '/api/absent', timeout=10)
    raise AssertionError("Une route API inexistante doit renvoyer 404")
except HTTPError as error:
    assert error.code == 404
    assert json.load(error) == {'detail': 'Not Found'}

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None

request = Request(base + '/api/scores', headers={
    'Host': 'game.example.test', 'X-Forwarded-Proto': 'https',
})
try:
    build_opener(NoRedirect).open(request, timeout=10)
    raise AssertionError("La route sans slash doit rediriger")
except HTTPError as error:
    assert error.code == 307
    assert error.headers['Location'] == 'https://game.example.test/api/scores/'
PY

compose exec -T backend /app/.venv/bin/python - <<'PY'
import os
import sqlite3
from datetime import datetime, timezone

assert os.getuid() != 0, "Le backend doit fonctionner sans root"
with sqlite3.connect('/app/instance/scores.sqlite') as database:
    database.execute(
        'INSERT INTO score (player, points, created_at) VALUES (?, ?, ?)',
        ('Docker smoke', 42, datetime.now(timezone.utc).isoformat()),
    )
PY

# Recreate containers while retaining this test's isolated database volume.
compose down
compose up -d --wait --wait-timeout 60 --no-build --pull never
python3 - "http://$(compose port frontend 8080)/api/scores/" <<'PY'
import json
import sys
from urllib.request import urlopen

with urlopen(sys.argv[1], timeout=10) as response:
    rows = json.load(response)
assert len(rows) == 1 and rows[0]['player'] == 'Docker smoke' and rows[0]['points'] == 42
print('Containers OK: React, /api, HTTPS redirects and persistent SQLite.')
PY
