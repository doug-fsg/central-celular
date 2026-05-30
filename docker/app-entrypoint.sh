#!/bin/sh
set -e

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
