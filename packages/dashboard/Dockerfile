FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/dashboard/package.json ./packages/dashboard/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/core ./packages/core
COPY packages/dashboard ./packages/dashboard
RUN npm run build -w @basilica/core -w @basilica/dashboard

FROM nginx:alpine
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html
COPY packages/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
