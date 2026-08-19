FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl openssl-dev libc6-compat

COPY package.json yarn.lock ./
COPY prisma ./prisma/

ENV YARN_NETWORK_TIMEOUT=600000
RUN yarn install --frozen-lockfile --network-timeout 600000 \
  || yarn install --frozen-lockfile --network-timeout 600000

RUN yarn prisma generate

COPY index.html ./
COPY public ./public
COPY src ./src
COPY server ./server
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./

RUN yarn build

# Instalar só dependências de produção em pasta separada
RUN mkdir /prod_deps && cp package.json yarn.lock /prod_deps/ && \
    cd /prod_deps && yarn install --frozen-lockfile --production --network-timeout 600000
# Copiar o Prisma Client gerado para as prod deps
RUN cp -r /app/node_modules/.prisma /prod_deps/node_modules/.prisma && \
    cp -r /app/node_modules/@prisma /prod_deps/node_modules/@prisma

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY --from=builder /app/dist ./dist
COPY --from=builder /prod_deps/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma
COPY docker/app-entrypoint.sh /app/docker-entrypoint.sh

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3000

RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"] 