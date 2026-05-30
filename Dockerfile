FROM node:20-alpine as builder

WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache python3 make g++ openssl openssl-dev libc6-compat

# Copiar arquivos de configuração primeiro
COPY package.json yarn.lock ./
COPY prisma ./prisma/

# Instalar todas as dependências (incluindo devDependencies)
RUN yarn install

# Gerar cliente Prisma
RUN yarn prisma generate

# Copiar arquivos necessários para o build
COPY index.html ./
COPY public ./public
COPY src ./src
COPY server ./server
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./

# Construir a aplicação frontend
RUN yarn build

# Segunda etapa - imagem de produção
FROM node:20-alpine

WORKDIR /app

# Instalar dependências necessárias para produção
RUN apk add --no-cache openssl libc6-compat

# Copiar apenas os arquivos necessários da etapa de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma
COPY docker/app-entrypoint.sh /app/docker-entrypoint.sh

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3000

RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"] 