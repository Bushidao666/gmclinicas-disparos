# syntax=docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app/web

# Instalar dependências apenas com os manifests para melhor cache
COPY web/package.json web/package-lock.json ./
RUN npm ci

# Copiar código e construir
COPY web ./
RUN npm run build

# Runtime
EXPOSE 3000
CMD ["npm", "start"]

