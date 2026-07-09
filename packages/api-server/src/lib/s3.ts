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
 * Uploads a file buffer to S3 or falls back to local disk
 * @returns The final URL or path of the uploaded image
 */
export async function uploadImage(
  file: Express.Multer.File,
  s3Settings: S3Settings | null
): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${randomUUID()}${ext}`;

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

      const command = new PutObjectCommand({
        Bucket: s3Settings.bucket,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3Client.send(command);

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
  await fs.writeFile(filePath, file.buffer);
  
  return `/uploads/${filename}`;
}
