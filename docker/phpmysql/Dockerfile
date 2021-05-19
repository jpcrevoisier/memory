FROM alpine:latest
RUN apk update && \
 apk upgrade && \
 apk add php7-cli php7-json php7-mysqli mysql mysql-client && \
 rm -rf /var/cache/apk/*
WORKDIR /memory
RUN mkdir /run/mysqld
RUN mariadb-install-db --datadir /var/lib/mysql
COPY ./root /memory
CMD [ "/bin/ash","/memory/init.sh" ]
