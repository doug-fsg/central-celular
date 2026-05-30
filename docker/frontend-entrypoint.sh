#!/bin/sh
set -e

QUEPASA_UPSTREAM="${QUEPASA_UPSTREAM:-http://173.249.22.227:31000}"

sed "s|__QUEPASA_UPSTREAM__|${QUEPASA_UPSTREAM}|g" \
  /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[frontend] Proxy WhatsApp -> ${QUEPASA_UPSTREAM}"

exec nginx -g 'daemon off;'
