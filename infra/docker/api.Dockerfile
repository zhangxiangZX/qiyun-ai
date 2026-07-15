FROM node:20-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
COPY packages/config ./packages/config
COPY migration ./migration

RUN pnpm install --no-frozen-lockfile --ignore-scripts

EXPOSE 3001

CMD ["pnpm", "--filter", "qiyun-api", "dev"]
