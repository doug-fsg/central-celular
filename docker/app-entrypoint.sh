#!/bin/sh
set -e

# .env de dev costuma usar localhost; na rede Docker o host é "db".
if [ -n "${DATABASE_URL:-}" ]; then
  export DATABASE_URL=$(echo "$DATABASE_URL" | sed -e 's/@localhost:/@db:/' -e 's/@127.0.0.1:/@db:/')
  echo "[app] DATABASE_URL ajustada para rede Docker (host=db)"
fi

echo "[app] Aguardando PostgreSQL em db:5432..."
until node -e "
  const net = require('net');
  const socket = net.createConnection({ host: 'db', port: 5432 });
  socket.on('connect', () => { socket.end(); process.exit(0); });
  socket.on('error', () => process.exit(1));
" 2>/dev/null; do
  sleep 2
done

echo "[app] Aplicando migrações Prisma..."
yarn prisma migrate deploy

echo "[app] Iniciando API..."
exec yarn start
