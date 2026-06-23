# 💾 Backups

Losing your database means losing all orders, customers, menu items, and settings. This page shows how to set up automatic backups so you never lose data.

## 📋 What to Back Up

| Data | Location | Priority |
|------|----------|----------|
| 🗄️ PostgreSQL database | `pgdata` Docker volume | **Critical** |
| 🖼️ Uploaded images | `uploads` Docker volume | Important |
| 🔑 Environment file | `/home/shutter/shutter/.env` | Important |
| 🐳 Docker Compose file | `docker-compose.prod.yml` | Nice to have (in git) |

## 🔄 Automatic Database Backups

### 📝 Create the Backup Script

```bash
sudo mkdir -p /opt/backups/shutter
sudo chown shutter:shutter /opt/backups/shutter

nano /home/shutter/backup.sh
```

Paste:

```bash
#!/bin/bash
# Shutter Database Backup Script
set -euo pipefail

BACKUP_DIR="/opt/backups/shutter"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=30

echo "[$(date)] Starting backup..."

# Dump the database from the running PostgreSQL container
docker compose -f /home/shutter/shutter/docker-compose.prod.yml \
  exec -T postgres pg_dump -U shutter -Fc shutter \
  > "${BACKUP_DIR}/db_${TIMESTAMP}.dump"

# Back up uploaded images
tar -czf "${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz" \
  -C /var/lib/docker/volumes/ shutter_uploads 2>/dev/null || true

# Back up environment file
cp /home/shutter/shutter/.env \
  "${BACKUP_DIR}/env_${TIMESTAMP}.bak"

# Delete backups older than KEEP_DAYS
find "${BACKUP_DIR}" -type f -mtime +${KEEP_DAYS} -delete

echo "[$(date)] Backup complete: db_${TIMESTAMP}.dump"
echo "Backup size: $(du -sh ${BACKUP_DIR}/db_${TIMESTAMP}.dump | cut -f1)"
```

Make it executable:

```bash
chmod +x /home/shutter/backup.sh
```

### 🧪 Test the Script

```bash
/home/shutter/backup.sh
```

Verify the backup was created:

```bash
ls -lh /opt/backups/shutter/
```

### ⏰ Schedule Automatic Backups

Run the backup daily at 3:00 AM using cron:

```bash
crontab -e
```

Add this line:

```
0 3 * * * /home/shutter/backup.sh >> /opt/backups/shutter/backup.log 2>&1
```

## 🔄 Restoring from a Backup

If you ever need to restore:

```bash
# Stop the server (to prevent writes during restore)
docker compose -f docker-compose.prod.yml stop server admin storefront

# Restore the database
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U shutter -d shutter --clean --if-exists \
  < /opt/backups/shutter/db_20260220_030000.dump

# Start everything again
docker compose -f docker-compose.prod.yml up -d
```

Replace the filename with your actual backup file.

## ☁️ Off-Site Backups

Local backups protect against accidental deletion, but not against server failure. Copy backups to an external location.

### 🔁 Option 1: Rsync to Another Server

```bash
# Add to the backup script or as a separate cron job
rsync -az /opt/backups/shutter/ user@backup-server:/backups/shutter/
```

### ☁️ Option 2: Upload to S3 or Backblaze B2

Install the AWS CLI or B2 CLI:

```bash
# For AWS S3
sudo apt install -y awscli
aws configure  # Enter your access keys

# Add to backup script:
aws s3 sync /opt/backups/shutter/ s3://your-bucket/shutter-backups/
```

```bash
# For Backblaze B2 (cheaper alternative)
pip install b2-sdk
b2 authorize-account YOUR_KEY_ID YOUR_APP_KEY

# Add to backup script:
b2 sync /opt/backups/shutter/ b2://your-bucket/shutter-backups/
```

### 📧 Option 3: Email Notification on Failure

Add this to the end of your backup script to get notified on failures:

```bash
# At the top of the script, add a trap
trap 'echo "Backup FAILED at $(date)" | mail -s "Shutter Backup Failed" admin@yourdomain.com' ERR
```

This requires a mail utility (`sudo apt install -y mailutils`) and working SMTP configuration.

## ✅ Backup Verification

Periodically verify that your backups are restorable. You can test on a separate server or locally:

```bash
# Create a temporary test database
docker exec shutter-db createdb -U shutter shutter_test

# Restore into the test database
docker exec -i shutter-db \
  pg_restore -U shutter -d shutter_test --clean --if-exists \
  < /opt/backups/shutter/db_latest.dump

# Verify
docker exec shutter-db psql -U shutter -d shutter_test \
  -c "SELECT count(*) FROM orders;"

# Clean up
docker exec shutter-db dropdb -U shutter shutter_test
```

## ➡️ Next Step

Continue to **[Maintenance](/self-hosting/maintenance)** for update procedures, monitoring, and troubleshooting.
