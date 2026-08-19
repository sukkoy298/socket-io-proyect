FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
COPY frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html ./frontend/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3111

CMD ["pnpm", "start"]