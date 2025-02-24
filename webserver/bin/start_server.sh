#!/bin/bash

nohup supercronic -split-logs /var/spool/cron/crontabs/root 1>/dev/null &
sed -i -E "s/ServerName default.host/ServerName ${DOMAIN}/g" /etc/apache2/sites-available/kollab-default.conf

# Make sure permissions are set correctly
chown www-data /var/www/config
chown www-data /var/www/custom
chown www-data /var/www/html
chown www-data /kollabserver/storage

# Set environment vars
export kollab_twig_cache_path="/kollabserver/twig-cache"

# Start apache
/usr/sbin/apache2ctl -D FOREGROUND
