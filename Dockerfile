FROM node:14-alpine

RUN apk --update add git && \
    rm -rf /var/lib/apt/lists/* && \
    rm /var/cache/apk/*

COPY . /app
WORKDIR /app

RUN npm install && npm link

ENTRYPOINT ["/usr/local/bin/sfpackage"]
