FROM node:22-alpine AS build

RUN npm install -g pnpm@11.21.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build


FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

RUN npm install -g pnpm@11.21.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/main"]