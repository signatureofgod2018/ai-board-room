FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/openclaw/package.json ./packages/openclaw/
COPY packages/nemoclaw/package.json ./packages/nemoclaw/
COPY packages/storage/package.json ./packages/storage/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/core ./packages/core
COPY packages/openclaw ./packages/openclaw
COPY packages/nemoclaw ./packages/nemoclaw
COPY packages/storage ./packages/storage
RUN npm run build -w @basilica/core -w @basilica/nemoclaw -w @basilica/storage -w @basilica/openclaw

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/nemoclaw/dist ./packages/nemoclaw/dist
COPY --from=builder /app/packages/nemoclaw/package.json ./packages/nemoclaw/
COPY --from=builder /app/packages/storage/dist ./packages/storage/dist
COPY --from=builder /app/packages/storage/package.json ./packages/storage/
COPY --from=builder /app/packages/openclaw/dist ./packages/openclaw/dist
COPY --from=builder /app/packages/openclaw/package.json ./packages/openclaw/
COPY package.json ./
RUN npm ci --omit=dev
EXPOSE 4000
CMD ["node", "packages/openclaw/dist/index.js"]
