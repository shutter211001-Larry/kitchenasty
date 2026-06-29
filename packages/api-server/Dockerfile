FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api-server/package.json packages/api-server/
COPY packages/adminfront/package.json packages/adminfront/
COPY packages/storefront/package.json packages/storefront/
COPY packages/erpfront/package.json packages/erpfront/
COPY prisma/ prisma/
COPY tsconfig.json ./

RUN npm install

COPY packages/shared/ packages/shared/
RUN npm run build -w packages/shared

COPY packages/api-server/ packages/api-server/
RUN npx -w packages/api-server prisma generate --schema ../../prisma/schema.prisma
RUN npx -w packages/api-server prisma generate --schema ../../prisma/erp/shutter-erp.prisma
RUN npm run build -w packages/api-server

FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api-server/package.json packages/api-server/
COPY packages/adminfront/package.json packages/adminfront/
COPY packages/storefront/package.json packages/storefront/
COPY packages/erpfront/package.json packages/erpfront/

RUN npm install --omit=dev --no-audit --no-fund

COPY prisma/ prisma/
RUN npx -w packages/api-server prisma generate --schema ../../prisma/schema.prisma
RUN npx -w packages/api-server prisma generate --schema ../../prisma/erp/shutter-erp.prisma

COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/packages/api-server/dist/ packages/api-server/dist/

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && npx prisma migrate deploy --schema prisma/erp/shutter-erp.prisma && node packages/api-server/dist/index.js"]


