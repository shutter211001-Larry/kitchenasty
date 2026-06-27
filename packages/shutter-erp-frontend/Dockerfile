FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/admin/package.json packages/admin/
COPY packages/storefront/package.json packages/storefront/
COPY packages/shutter-erp-frontend/package.json packages/shutter-erp-frontend/
COPY tsconfig.json ./

RUN npm install

COPY packages/shared/ packages/shared/
RUN npm run build -w packages/shared

COPY packages/shutter-erp-frontend/ packages/shutter-erp-frontend/
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ARG VITE_API_URL_PUBLIC
ENV VITE_API_URL_PUBLIC=${VITE_API_URL_PUBLIC}

RUN npm run build -w packages/shutter-erp-frontend

FROM nginx:alpine

COPY --from=builder /app/packages/shutter-erp-frontend/dist/ /usr/share/nginx/html/
COPY packages/shutter-erp-frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["/bin/sh", "-c", "RESOLVER=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf); if echo \"$RESOLVER\" | grep -q \":\"; then RESOLVER=\"[$RESOLVER]\"; fi; echo \"resolver $RESOLVER valid=10s;\" > /etc/nginx/conf.d/resolver.conf && nginx -g 'daemon off;'"]
