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

COPY packages/storefront/ packages/storefront/
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build -w packages/storefront

FROM node:22-alpine

WORKDIR /app

# Copy all package files to preserve workspace structure
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/admin/package.json packages/admin/
COPY packages/storefront/package.json packages/storefront/
COPY packages/shutter-erp-frontend/package.json packages/shutter-erp-frontend/

# Install production dependencies at the root workspace
RUN npm install --omit=dev --no-audit --no-fund

# Copy built assets and server script
COPY --from=builder /app/packages/storefront/dist packages/storefront/dist
COPY packages/storefront/server.js packages/storefront/

CMD ["node", "packages/storefront/server.js"]
