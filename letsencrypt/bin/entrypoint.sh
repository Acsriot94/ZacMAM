#!/bin/bash

set -e

if [ "$USE_LETS_ENCRYPT" = "true" ]
then

  # Validate required environment variables.
  [[ -z "$DOMAIN" ]] && MISSING="$MISSING DOMAIN"
  [[ -z "$LETS_ENCRYPT_EMAIL" ]] && MISSING="$MISSING LETS_ENCRYPT_EMAIL"

  if [[ -n "$MISSING" ]]; then
    echo "Missing required environment variables: $MISSING" >&2
    exit 1
  fi

  # Create a web server right away, otherwise HAProxy might not see that
  # the server is listening and you won't be able to authenticate
  echo "Creating http server on port 80"
  mkdir -p /opt/www
  (pushd /opt/www && python -m SimpleHTTPServer 80) &

  # Wait for the local server to be listening
  while ! nc -zv 127.0.0.1:80;
  do
    echo "SimpleHTTPServer not up yet, waiting 1 second";
    sleep 1;
  done

  echo "waiting for service \"proxy\""

  # Wait for HAproxy to start before updating certificates on startup.
  while ! nc -z proxy 80;
  do
    echo "Loadbalancer service \"proxy\" is not up yet, waiting 5 seconds";
    sleep 5;
  done

  echo "Loadbalancer service \"proxy\" is online, updating certificates..."
  (update-certs.sh) &

  exec "$@"
else
  # Remove certs
  LIVE_CERT_FOLDER="/etc/letsencrypt/live"

  if [ -d "$LIVE_CERT_FOLDER" ]; then
    rm -Rf "${LIVE_CERT_FOLDER}"
  fi

  while true;
  do
    sleep 30;
  done
fi