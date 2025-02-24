#!/bin/bash

set -e

# Certificates are separated by semi-colon (;). Domains on each certificate are
# separated by comma (,).
CERTS=(${DOMAIN//;/ })
OPTIONS=""

if [ "$LETS_ENCRYPT_STAGING" = "true" ]; then
  OPTIONS="--staging"
fi

# Create or renew certificates. Don't exit on error. It's likely that certbot
# will fail on first run, if HAproxy is not running.
for DOMAINS in "${CERTS[@]}"; do
	certbot certonly \
		--agree-tos \
		--domains "$DOMAIN" \
		--email "$LETS_ENCRYPT_EMAIL" \
		--expand \
		--noninteractive \
		--webroot \
		--webroot-path /opt/www \
		$OPTIONS || true
done
