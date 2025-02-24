FROM ubuntu:24.04
LABEL vendor="Digital Rebellion"
ARG PHP_VERSION="8.1"

ENV DEBIAN_FRONTEND noninteractive

# Setup folders
RUN mkdir /kollabserver
RUN mkdir /kollabserver/storage
RUN mkdir /kollabserver/backups
RUN mkdir /kollabserver/cache && chown www-data /kollabserver/cache
RUN mkdir /kollabserver/twig-cache && chown www-data /kollabserver/twig-cache

# Install packages
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y upgrade && DEBIAN_FRONTEND=noninteractive apt-get -y install software-properties-common

RUN add-apt-repository ppa:ondrej/php && apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install \
    autoconf automake build-essential \
    software-properties-common curl libcurl4 wget supervisor cron unattended-upgrades apache2 php${PHP_VERSION} php${PHP_VERSION}-dev \
    libapache2-mod-php${PHP_VERSION} php${PHP_VERSION}-mysql php${PHP_VERSION}-gd php${PHP_VERSION}-curl php${PHP_VERSION}-mbstring php${PHP_VERSION}-xml \
    ffmpeg imagemagick libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Compile ImageMagick 7
#ARG IMAGICK_VERSION="7.1.1-30"
#RUN apt-get update && apt-get -y install libx11-dev libxext-dev zlib1g-dev libpng-dev libjpeg-dev libfreetype6-dev libxml2-dev libaom-dev libheif-dev
#RUN wget https://github.com/ImageMagick/ImageMagick/archive/refs/tags/${IMAGICK_VERSION}.tar.gz
#RUN tar -xvf ${IMAGICK_VERSION}.tar.gz
#WORKDIR ImageMagick-${IMAGICK_VERSION}
#RUN ./configure PREFIX="/usr" --prefix="/usr" --with-modules && make -j4 && make install
#RUN ldconfig /usr/local/lib

# Configure ImageMagick
RUN mkdir -p /usr/etc/ImageMagick-7
COPY policy.xml /usr/etc/ImageMagick-7/policy.xml

# Switch on auto security updates
RUN dpkg-reconfigure --priority=low unattended-upgrades

# Manually set up the apache environment variables
ENV APACHE_RUN_USER www-data
ENV APACHE_RUN_GROUP www-data
ENV APACHE_LOG_DIR /var/log/apache2

# Copy php.ini
RUN mkdir -p /kollabserver/storage/uploads
COPY php.ini /etc/php/${PHP_VERSION}/apache2/php.ini
COPY php.ini /etc/php/${PHP_VERSION}/cli/php.ini

# Setup Ioncube loader
WORKDIR /kollabserver
RUN wget https://downloads.ioncube.com/loader_downloads/ioncube_loaders_lin_x86-64.tar.gz
RUN tar xvzf ioncube_loaders_lin_x86-64.tar.gz
RUN bash -c "cp ioncube/ioncube_loader_lin_${PHP_VERSION}.so $(php-config --extension-dir)"

# Prepend extension to php.ini
RUN bash -c "(echo 'zend_extension=$(php-config --extension-dir)/ioncube_loader_lin_${PHP_VERSION}.so;'; cat /etc/php/${PHP_VERSION}/apache2/php.ini) > /etc/php/${PHP_VERSION}/apache2/php.ini-temp";
RUN rm /etc/php/${PHP_VERSION}/apache2/php.ini; mv /etc/php/${PHP_VERSION}/apache2/php.ini-temp /etc/php/${PHP_VERSION}/apache2/php.ini
RUN bash -c "(echo 'zend_extension=$(php-config --extension-dir)/ioncube_loader_lin_${PHP_VERSION}.so;'; cat /etc/php/${PHP_VERSION}/cli/php.ini) > /etc/php/${PHP_VERSION}/cli/php.ini-temp";
RUN rm /etc/php/${PHP_VERSION}/cli/php.ini; mv /etc/php/${PHP_VERSION}/cli/php.ini-temp /etc/php/${PHP_VERSION}/cli/php.ini

# Enable Apache mods
RUN a2enmod php${PHP_VERSION}
RUN a2enmod rewrite
RUN a2enmod ssl
RUN a2enmod headers

# Enable custom Apache config
RUN rm /etc/apache2/sites-available/000-default.conf
RUN rm /etc/apache2/sites-enabled/000-default.conf

COPY kollab-default.conf /etc/apache2/sites-available/kollab-default.conf

RUN a2ensite kollab-default
COPY ports.conf /etc/apache2

# Remove www folder
RUN rm -Rf /var/www

# Install cron jobs
RUN bash -c "(crontab -l ; echo '*/2 * * * * /usr/bin/php -c /etc/php/${PHP_VERSION}/apache2/php.ini /var/www/utils/mail_queue.php') | crontab"
RUN bash -c "(crontab -l ; echo '*/3 * * * * /usr/bin/php -c /etc/php/${PHP_VERSION}/apache2/php.ini /var/www/utils/webhook_process.php') | crontab"
RUN bash -c "(crontab -l ; echo '0 0 * * * /usr/bin/php -c /etc/php/${PHP_VERSION}/apache2/php.ini /var/www/utils/daily.php') | crontab"
RUN bash -c "(crontab -l ; echo '*/10 * * * * /usr/bin/php -c /etc/php/${PHP_VERSION}/apache2/php.ini /var/www/utils/permanent_delete.php') | crontab"

# Install supercronic
ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v0.1.9/supercronic-linux-amd64 \
    SUPERCRONIC=supercronic-linux-amd64 \
    SUPERCRONIC_SHA1SUM=5ddf8ea26b56d4a7ff6faecdd8966610d5cb9d85

RUN curl -fsSLO "$SUPERCRONIC_URL" \
 && echo "${SUPERCRONIC_SHA1SUM}  ${SUPERCRONIC}" | sha1sum -c - \
 && chmod +x "$SUPERCRONIC" \
 && mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" \
 && ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic

# Add Docker flag
RUN bash -c "echo -e '' > /kollabserver/docker"

# Expose ports and volumes
VOLUME ["/var/www"]
VOLUME ["/kollabserver/storage"]

# Start server
EXPOSE 8080

COPY bin/start_server.sh /kollabserver/start_server.sh
RUN chmod +x /kollabserver/start_server.sh

ENTRYPOINT ["/kollabserver/start_server.sh"]
