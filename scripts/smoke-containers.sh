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
saved_state=$(python3 - "http://$(compose port frontend 8080)" <<'PY'
import json
import re
import sys
from datetime import datetime
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
request = Request(base + '/api/scores/', data=json.dumps({
    'player': 'Docker smoke', 'points': 1250,
}).encode(), headers={'Content-Type': 'application/json'}, method='POST')
with urlopen(request, timeout=10) as response:
    assert response.status == 201
    saved = json.load(response)
assert set(saved) == {'id', 'player', 'player_id', 'points', 'created_at'}
assert type(saved['id']) is int and saved['id'] > 0
assert type(saved['player_id']) is int and saved['player_id'] > 0
assert saved['player'] == 'Docker smoke' and saved['points'] == 1250
assert datetime.fromisoformat(saved['created_at']).tzinfo is not None
try:
    urlopen(Request(base + '/api/scores/', data=json.dumps({
        'player': 'Invalid', 'points': -1,
    }).encode(), headers={'Content-Type': 'application/json'}, method='POST'), timeout=10)
    raise AssertionError("Un score invalide doit être refusé")
except HTTPError as error:
    assert error.code == 422
with urlopen(base + '/api/scores/', timeout=10) as response:
    assert json.load(response) == [saved], "Le score valide manque ou le score invalide a été enregistré"
with urlopen(base + '/api/players/', timeout=10) as response:
    players = json.load(response)
assert players == [{
    'id': saved['player_id'],
    'player': 'Docker smoke',
    'total_points': 1250,
    'games_played': 1,
    'average_points': 1250.0,
}], "Le joueur associé au score ou ses statistiques sont incorrects"
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
print(json.dumps({'score': saved, 'players': players}))
PY
)

compose exec -T backend /app/.venv/bin/python - <<'PY'
import os

assert os.getuid() != 0, "Le backend doit fonctionner sans root"
PY

# Recreate containers while retaining this test's isolated database volume.
compose down
compose up -d --wait --wait-timeout 60 --no-build --pull never
python3 - "http://$(compose port frontend 8080)" "$saved_state" <<'PY'
import json
import sys
from urllib.request import urlopen

base = sys.argv[1]
saved = json.loads(sys.argv[2])
with urlopen(base + '/api/scores/', timeout=10) as response:
    rows = json.load(response)
assert rows == [saved['score']], "Le score HTTP n’a pas survécu à la recréation des conteneurs"
with urlopen(base + '/api/players/', timeout=10) as response:
    players = json.load(response)
assert players == saved['players'], "Le joueur ou ses statistiques n’ont pas survécu à la recréation des conteneurs"
print('Containers OK: React, scores, player statistics, validation, HTTPS redirects and persistent SQLite.')
PY
