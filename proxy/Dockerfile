FROM haproxy:2.1-alpine

RUN apk add --update --no-cache bash inotify-tools openssl \
	&& rm -rf /var/cache/apk/*

ENV LIVE_CERT_FOLDER="/etc/letsencrypt/live"
ENV PATH="/opt/haproxy/bin:$PATH"

COPY . /opt/haproxy
RUN chmod +x /opt/haproxy/bin/entrypoint.sh
RUN chmod +x /opt/haproxy/bin/install-certs.sh
RUN chmod +x /opt/haproxy/bin/watch-certs.sh
RUN chmod +x /opt/haproxy/bin/reload.sh

COPY ./config /usr/local/etc/haproxy

CMD ["/opt/haproxy/bin/entrypoint.sh"]
