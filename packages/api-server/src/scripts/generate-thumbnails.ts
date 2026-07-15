import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import sharp from 'sharp';
import { getResolvedS3Settings, S3Settings } from '../lib/s3.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function processImage(url: string, s3Settings: S3Settings | null): Promise<boolean> {
  if (!url || !url.includes('.webp')) return false; // Only process .webp images

  const thumbUrl = url.replace('.webp', '_thumb.webp');
  
  // 1. Check if thumbnail already exists
  try {
    await axios.head(thumbUrl);
    console.log(`[SKIPPED] Thumbnail already exists for ${url}`);
    return true; // Already processed
  } catch (err: any) {
    if (err.response?.status !== 404 && err.response?.status !== 403) {
      console.warn(`[WARNING] Failed to check ${thumbUrl}: ${err.message}`);
      // Continue anyway
    }
  }

  try {
    // 2. Download original image
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // 3. Generate thumbnail
    const thumbBuffer = await sharp(buffer)
      .resize({ width: 120, withoutEnlargement: true })
      .blur(1)
      .webp({ quality: 30 })
      .toBuffer();

    // 4. Upload thumbnail
    if (s3Settings && url.includes(s3Settings.publicUrl)) {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: s3Settings.endpoint,
        credentials: {
          accessKeyId: s3Settings.accessKey,
          secretAccessKey: s3Settings.secretKey,
        },
      });

      const parsedUrl = new URL(url);
      const filename = path.basename(parsedUrl.pathname);
      const thumbFilename = filename.replace('.webp', '_thumb.webp');

      const command = new PutObjectCommand({
        Bucket: s3Settings.bucket,
        Key: thumbFilename,
        Body: thumbBuffer,
        ContentType: 'image/webp',
      });

      await s3Client.send(command);
      console.log(`[SUCCESS] Uploaded S3 thumbnail for ${url}`);
    } else if (url.startsWith('/uploads/')) {
      // Local file
      const filename = path.basename(url);
      const thumbFilename = filename.replace('.webp', '_thumb.webp');
      const uploadDir = path.resolve(process.cwd(), 'uploads');
      const thumbFilePath = path.join(uploadDir, thumbFilename);
      await fs.writeFile(thumbFilePath, thumbBuffer);
      console.log(`[SUCCESS] Generated local thumbnail for ${url}`);
    } else {
      console.log(`[SKIPPED] URL ${url} does not match S3 settings or local uploads`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`[ERROR] Failed to process ${url}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('Starting thumbnail generation script...');
  
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  const tenantIds = [null, ...tenants.map(t => t.id)]; // null for global settings
  
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const tenantId of tenantIds) {
    const s3Settings = await getResolvedS3Settings(tenantId);

    // 1. Menu Items
    const menuItems = await prisma.menuItem.findMany({
      where: { image: { not: null }, tenantId },
      select: { id: true, image: true, name: true }
    });

    for (const item of menuItems) {
      if (item.image) {
        console.log(`Processing MenuItem: ${item.name}`);
        const success = await processImage(item.image, s3Settings);
        if (success) totalProcessed++;
        else totalFailed++;
      }
    }

    // 2. Categories
    const categories = await prisma.category.findMany({
      where: { image: { not: null }, tenantId },
      select: { id: true, image: true, name: true }
    });

    for (const cat of categories) {
      if (cat.image) {
        console.log(`Processing Category: ${cat.name}`);
        const success = await processImage(cat.image, s3Settings);
        if (success) totalProcessed++;
        else totalFailed++;
      }
    }

    // 3. Locations
    const locations = await prisma.location.findMany({
      where: { image: { not: null }, tenantId },
      select: { id: true, image: true, name: true }
    });

    for (const loc of locations) {
      if (loc.image) {
        console.log(`Processing Location: ${loc.name}`);
        const success = await processImage(loc.image, s3Settings);
        if (success) totalProcessed++;
        else totalFailed++;
      }
    }
  }

  // 4. Site Settings (Logo/Favicon)
  const allSettings = await prisma.siteSettings.findMany({
    select: { id: true, logo: true, favicon: true, tenantId: true }
  });

  for (const setting of allSettings) {
    const s3Settings = await getResolvedS3Settings(setting.tenantId);
    if (setting.logo) {
      console.log(`Processing Settings Logo: ${setting.id}`);
      await processImage(setting.logo, s3Settings);
    }
    if (setting.favicon) {
      console.log(`Processing Settings Favicon: ${setting.id}`);
      await processImage(setting.favicon, s3Settings);
    }
  }

  console.log('--- Done ---');
  console.log(`Processed/Skipped correctly: ${totalProcessed}`);
  console.log(`Failed: ${totalFailed}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
