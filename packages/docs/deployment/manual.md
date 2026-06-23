# 🖥️ Manual Deployment

For deployments without Docker.

## 📦 Build All Packages

```bash
npm ci
npx -w packages/server prisma generate --schema ../../prisma/schema.prisma
npm run build
```

This builds shared, server, admin, and storefront packages.

## 🚀 Run the API Server

### 🟢 PM2 (recommended)

```bash
npm install -g pm2

pm2 start packages/server/dist/index.js --name shutter-api \
  --env PORT=3000 \
  --env NODE_ENV=production \
  --env DATABASE_URL=postgresql://... \
  --env JWT_SECRET=...
```

### ⚙️ systemd

Create `/etc/systemd/system/shutter-api.service`:

```ini
[Unit]
Description=Shutter API Server
After=network.target postgresql.service

[Service]
Type=simple
User=shutter
WorkingDirectory=/opt/shutter
ExecStart=/usr/bin/node packages/server/dist/index.js
EnvironmentFile=/opt/shutter/.env
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable shutter-api
sudo systemctl start shutter-api
```

## 🌐 Serve Frontend with nginx

The admin and storefront build outputs are static files in `packages/admin/dist/` and `packages/storefront/dist/`.

```nginx
# Admin dashboard
server {
    listen 80;
    server_name admin.yourdomain.com;
    root /opt/shutter/packages/admin/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Storefront
server {
    listen 80;
    server_name order.yourdomain.com;
    root /opt/shutter/packages/storefront/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🗄️ Database Migrations

Run migrations before starting the server:

```bash
npx -w packages/server prisma migrate deploy --schema ../../prisma/schema.prisma
```
