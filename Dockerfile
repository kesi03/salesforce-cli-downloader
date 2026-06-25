FROM node:22-alpine AS builder

RUN apk add --no-cache git python3 make g++

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/

RUN pnpm exec tsx src/index.ts offline pack \
    -c all \
    -d /opt/sf-cli \
    -s ./offline-cache

RUN pnpm exec tsx src/index.ts offline setup \
    -d /opt/sf-cli \
    -s ./offline-cache

FROM node:22-alpine

RUN apk add --no-cache git

COPY --from=builder /opt/sf-cli /opt/sf-cli

ENV PATH="/opt/sf-cli/node_modules/.bin:${PATH}"

RUN sf --version && sf plugins --core

CMD ["sf", "--version"]
