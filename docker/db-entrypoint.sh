#!/bin/sh
# Se o .env só tiver DATABASE_URL (ex.: dev local), deriva credenciais do Postgres.
set -e

if [ -z "${POSTGRES_PASSWORD:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  POSTGRES_USER="${POSTGRES_USER:-$(echo "$DATABASE_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')}"
  POSTGRES_PASSWORD="$(echo "$DATABASE_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')"
  POSTGRES_DB="${POSTGRES_DB:-$(echo "$DATABASE_URL" | sed -E 's|.*/([^/?]+)(\?.*)?$|\1|')}"
  export POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB
  echo "[db] Credenciais derivadas de DATABASE_URL (user=${POSTGRES_USER}, db=${POSTGRES_DB})"
fi

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "[db] Erro: defina POSTGRES_PASSWORD ou DATABASE_URL no .env" >&2
  exit 1
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
