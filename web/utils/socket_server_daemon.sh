#!/bin/sh
# Starts and stops the websocket server
#

/sbin/start-stop-daemon --quiet --background --start --exec /usr/bin/node "/var/www/websocket/socket_server.js"