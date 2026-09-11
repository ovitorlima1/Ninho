#!/bin/sh
# Runs the full stack locally: Postgres (Docker), API with reload, and Vite.
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env — run: cp .env.example .env (and set SESSION_SECRET)" >&2
  exit 1
fi

set -a
. ./.env
set +a

API_PORT="${API_PORT:-8787}"
WEB_PORT="${WEB_PORT:-5180}"

docker compose -f docker-compose.dev.yml up -d --wait

pnpm --filter @workspace/db run push-force

trap 'kill 0' INT TERM EXIT

PORT="$API_PORT" pnpm --filter @workspace/api-server run dev:watch &

PORT="$WEB_PORT" BASE_PATH=/ API_PROXY_TARGET="http://localhost:$API_PORT" \
  pnpm --filter @workspace/ninho run dev &

wait
