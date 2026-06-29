FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api-server/package.json packages/api-server/
COPY packages/adminfront/package.json packages/adminfront/
COPY packages/storefront/package.json packages/storefront/
COPY packages/erpfront/package.json packages/erpfront/
COPY tsconfig.json ./

RUN npm install

COPY packages/shared/ packages/shared/
RUN npm run build -w packages/shared

COPY packages/erpfront/ packages/erpfront/
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ARG VITE_API_URL_PUBLIC
ENV VITE_API_URL_PUBLIC=${VITE_API_URL_PUBLIC}

RUN npm run build -w packages/erpfront

FROM nginx:alpine

COPY --from=builder /app/packages/erpfront/dist/ /usr/share/nginx/html/
COPY packages/erpfront/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["/bin/sh", "-c", "RESOLVER=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf); if echo \"$RESOLVER\" | grep -q \":\"; then RESOLVER=\"[$RESOLVER]\"; fi; echo \"resolver $RESOLVER valid=10s;\" > /etc/nginx/conf.d/resolver.conf && nginx -g 'daemon off;'"]

