import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import logger from './logger.js';

export interface S3Settings {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  publicUrl: string; // e.g. https://pub-xxx.r2.dev
}

import prisma from './db.js';

/**
 * Parses and validates S3 settings from JSON object
 */
export function parseS3Settings(settings: any): S3Settings | null {
  if (!settings || typeof settings !== 'object') return null;
  
  const { endpoint, bucket, accessKey, secretKey, publicUrl } = settings;
  if (!endpoint || !bucket || !accessKey || !secretKey || !publicUrl) {
    return null;
  }

  return { endpoint, bucket, accessKey, secretKey, publicUrl };
}

/**
 * Resolves S3 settings by checking tenant-specific settings first.
 * If tenantId is not provided, it fetches the global SaaS platform settings.
 * It strictly avoids falling back to SaaS global settings for tenant uploads.
 */
export async function getResolvedS3Settings(tenantId?: string | null, locationId?: string | null): Promise<S3Settings | null> {
  let s3Settings = null;

  if (tenantId) {
    const tenantSettings = await (prisma as any).siteSettings.findUnique({
      where: { tenantId }
    });
    let advanced = tenantSettings?.advancedSettings;
    if (typeof advanced === 'string') {
      try { advanced = JSON.parse(advanced); } catch {}
    }
    s3Settings = parseS3Settings(advanced?.s3Settings);
  } else {
    const globalSettings = await (prisma as any).siteSettings.findUnique({
      where: { id: 'default' }
    });
    let globalAdvanced = globalSettings?.advancedSettings;
    if (typeof globalAdvanced === 'string') {
      try { globalAdvanced = JSON.parse(globalAdvanced); } catch {}
    }
    s3Settings = parseS3Settings(globalAdvanced?.s3Settings);
  }

  if (locationId) {
    const location = await (prisma as any).location.findUnique({
      where: { id: locationId }
    });

    if (location?.integrationSettings) {
      const ints = location.integrationSettings as any;
      if (ints.s3Mode === 'CUSTOM') {
        const customS3Settings = {
          endpoint: ints.s3Endpoint || '',
          bucket: ints.s3Bucket || '',
          accessKey: ints.s3AccessKeyId || '',
          secretKey: ints.s3SecretAccessKey || '',
          publicUrl: ints.s3Endpoint || '' 
        };
        const parsed = parseS3Settings(customS3Settings);
        if (!parsed) {
          throw new Error('HARD_FAIL: 門市設定為獨立 S3 (CUSTOM)，但缺乏完整的 S3 金鑰設定，為了保護檔案正確性，已強制阻斷上傳。');
        }
        s3Settings = parsed;
      }
    }
  }

  return s3Settings;
}

import sharp from 'sharp';

/**
 * Uploads a file buffer to S3 or falls back to local disk
 * @returns The final URL or path of the uploaded image
 */
export async function uploadImage(
  file: Express.Multer.File,
  s3Settings: S3Settings | null
): Promise<string> {
  const filename = `${randomUUID()}.webp`;
  const thumbFilename = filename.replace('.webp', '_thumb.webp');
  
  // Compress and convert to WebP (Original)
  const optimizedBuffer = await sharp(file.buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Compress and convert to WebP (Thumbnail)
  const thumbBuffer = await sharp(file.buffer)
    .resize({ width: 120, withoutEnlargement: true })
    .blur(1) // add slight blur to reduce file size further
    .webp({ quality: 30 })
    .toBuffer();
  
  const mimetype = 'image/webp';

  if (s3Settings) {
    try {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: s3Settings.endpoint,
        credentials: {
          accessKeyId: s3Settings.accessKey,
          secretAccessKey: s3Settings.secretKey,
        },
      });

      const commandOriginal = new PutObjectCommand({
        Bucket: s3Settings.bucket,
        Key: filename,
        Body: optimizedBuffer,
        ContentType: mimetype,
      });

      const commandThumb = new PutObjectCommand({
        Bucket: s3Settings.bucket,
        Key: thumbFilename,
        Body: thumbBuffer,
        ContentType: mimetype,
      });

      await Promise.all([
        s3Client.send(commandOriginal),
        s3Client.send(commandThumb)
      ]);

      // Construct public URL
      const baseUrl = s3Settings.publicUrl.endsWith('/')
        ? s3Settings.publicUrl.slice(0, -1)
        : s3Settings.publicUrl;
        
      return `${baseUrl}/${filename}`;
    } catch (error) {
      logger.error({ err: error, tenantS3: s3Settings.bucket }, 'Failed to upload image to S3, falling back to local storage');
      // Fall through to local storage
    }
  }

  // Local fallback
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  // Ensure dir exists
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  const thumbFilePath = path.join(uploadDir, thumbFilename);
  
  await Promise.all([
    fs.writeFile(filePath, optimizedBuffer),
    fs.writeFile(thumbFilePath, thumbBuffer)
  ]);
  
  return `/uploads/${filename}`;
}
