#!/bin/bash

set -e

if [ "$USE_THIRD_PARTY_SSL" = "true" ]; then
  exec haproxy -f /usr/local/etc/haproxy/global.cfg -f /usr/local/etc/haproxy/thirdpartyssl.cfg
else
  install-certs.sh
  watch-certs.sh &

  if [ -f "/certs/letsencrypt0.pem" ]; then
    cat /certs/letsencrypt0.pem > /certs/main.pem
  elif [ -f "/certs/letsencrypt0-staging.pem" ]; then
    cat /certs/letsencrypt0-staging.pem > /certs/main.pem
  elif [ -f "/certs/temp-cert.pem" ]; then
    cat /certs/temp-cert.pem > /certs/main.pem

    # Use the default created self signed SSL certificate until
    # we receive letsencrypt certificates
    LETSENCRYPT_CERT="$(cat /certs/temp-cert.pem)"
    export DEFAULT_SSL_CERT="${DEFAULT_SSL_CERT:-$LETSENCRYPT_CERT}"
  fi

  EXTRA_CONFIG=""

  if [ "$USE_LETS_ENCRYPT" = "true" ]; then
    exec haproxy -f /usr/local/etc/haproxy/global.cfg -f /usr/local/etc/haproxy/letsencrypt.cfg
  else
    exec haproxy -f /usr/local/etc/haproxy/global.cfg -f /usr/local/etc/haproxy/noencrypt.cfg
  fi
fi