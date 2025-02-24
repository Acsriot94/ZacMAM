FROM alpine:3.11

RUN apk add --update --no-cache bash certbot tini python \
	&& rm -rf /var/cache/apk/*

EXPOSE 80
VOLUME /etc/letsencrypt

# Sets the HAProxy parameters to ensure this container
# handles letsencrypt traffic
ENV VIRTUAL_HOST="*/.well-known/acme-challenge/*"
ENV VIRTUAL_HOST_WEIGHT="999"
ENV PATH="/opt/letsencrypt/bin:$PATH"

COPY . /opt/letsencrypt/
RUN chmod +x /opt/letsencrypt/bin/entrypoint.sh
RUN chmod +x /opt/letsencrypt/bin/update-certs.sh

# make sure we update certificates daily
RUN ln -fs /opt/letsencrypt/bin/update-certs.sh /etc/periodic/daily/

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/opt/letsencrypt/bin/entrypoint.sh", "crond", "-f"]
