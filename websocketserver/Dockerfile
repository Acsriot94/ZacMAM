FROM ubuntu:18.04
MAINTAINER Digital Rebellion
LABEL vendor="Digital Rebellion"

# Replace sh with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

ENV DEBIAN_FRONTEND noninteractive

# Install packages
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install \
    software-properties-common unattended-upgrades curl \
    && rm -rf /var/lib/apt/lists/*

# Switch on auto security updates
RUN dpkg-reconfigure --priority=low unattended-upgrades

# Remove www folder
RUN rm -Rf /var/www

# nvm environment variables
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 6.14.4

# Install 6.x version of NodeJS for script compatibility via Node Version Manager
RUN mkdir /usr/local/nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.2/install.sh | bash

# Setup environment
RUN source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# Add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH
#ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
#ENV PATH=$PATH:/home/node/.npm-global/bin

# Install nodejs modules
RUN npm install websocket.io

# Expose ports and volumes
VOLUME ["/var/www"]

# Start server
EXPOSE 8000

ENTRYPOINT ["node","/var/www/web/websocket/socket_server.js"]
