FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/admin/package.json packages/admin/
COPY packages/storefront/package.json packages/storefront/
COPY packages/shutter-erp-frontend/package.json packages/shutter-erp-frontend/
COPY prisma/ prisma/
COPY tsconfig.json ./

RUN npm ci

COPY packages/shared/ packages/shared/
RUN npm run build -w packages/shared

COPY packages/server/ packages/server/
RUN npx -w packages/server prisma generate --schema ../../prisma/schema.prisma
RUN npx -w packages/server prisma generate --schema ../../prisma/shutter-erp.prisma
RUN npm run build -w packages/server

FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/admin/package.json packages/admin/
COPY packages/storefront/package.json packages/storefront/
COPY packages/shutter-erp-frontend/package.json packages/shutter-erp-frontend/

RUN npm ci --omit=dev

COPY prisma/ prisma/
RUN npx -w packages/server prisma generate --schema ../../prisma/schema.prisma
RUN npx -w packages/server prisma generate --schema ../../prisma/shutter-erp.prisma

COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/packages/server/dist/ packages/server/dist/

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && npx prisma migrate deploy --schema prisma/shutter-erp.prisma && node packages/server/dist/index.js"]
