#!/usr/bin/env bash
# Local deploy: build monopoly:local and recreate the container.
# Cloudflared proxies mono.dvachini.cc -> 127.0.0.1:3500, so no tunnel refresh is needed.
# Usage: scripts/deploy-local.sh   (DEPLOY_PULL=1 to git pull --ff-only first)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HOST_PORT="${HOST_PORT:-3500}"
COMPOSE=(docker compose -f deploy/compose.yml)

if [ "${DEPLOY_PULL:-0}" = "1" ]; then
  git pull --ff-only
fi

# Keep the running image as the rollback target.
if docker image inspect monopoly:local >/dev/null 2>&1; then
  docker tag monopoly:local monopoly:previous
fi

docker build -t monopoly:local .
"${COMPOSE[@]}" up -d --no-build

ok=0
for _ in $(seq 1 40); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${HOST_PORT}/health" || true)"
  if [ "$code" = "200" ]; then ok=1; break; fi
  sleep 1
done

if [ "$ok" = 1 ]; then
  echo "image: $(docker image inspect -f '{{.Id}}' monopoly:local)"
  echo "uid:   $(docker exec monopoly id -u)"
  echo "DEPLOY OK"
  exit 0
fi

echo "health check failed" >&2
docker logs --tail 50 monopoly || true
if docker image inspect monopoly:previous >/dev/null 2>&1; then
  docker tag monopoly:previous monopoly:local
  "${COMPOSE[@]}" up -d --no-build --force-recreate
  echo "ROLLED BACK"
else
  echo "no monopoly:previous image to roll back to" >&2
fi
exit 1
