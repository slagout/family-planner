#!/bin/sh
set -e

# Inject API_URL into nginx config at container startup.
# Only substitutes ${API_URL} — leaves nginx's own $variables untouched.
API_URL="${API_URL:-http://localhost:4000}"

envsubst '${API_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[frontend] API proxy -> ${API_URL}"
exec nginx -g "daemon off;"
