import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../lib/db.js';
import logger from '../lib/logger.js';

/**
 * 掃描所有圖片儲存欄位並比對實體檔案，清除未被參照的圖片
 */
export async function cleanupUnusedImages() {
  logger.info('Starting unused images cleanup...');
  
  try {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    
    // 檢查 uploads 資料夾是否存在
    try {
      await fs.access(uploadDir);
    } catch {
      logger.info('Uploads directory does not exist, skipping cleanup.');
      return;
    }

    // 1. 取得所有資料庫中有被引用的圖片路徑清單
    const referencedImages = new Set<string>();

    // 收集 User.avatar
    const users = await prisma.user.findMany({ select: { avatar: true } });
    users.forEach(u => u.avatar && referencedImages.add(path.basename(u.avatar)));

    // 收集 Location.image
    const locations = await prisma.location.findMany({ select: { image: true } });
    locations.forEach(l => l.image && referencedImages.add(path.basename(l.image)));

    // 收集 Category.image
    const categories = await prisma.category.findMany({ select: { image: true } });
    categories.forEach(c => c.image && referencedImages.add(path.basename(c.image)));

    // 收集 MenuItem.image 與 imageVariants
    const menuItems = await prisma.menuItem.findMany({ select: { image: true, imageVariants: true } });
    menuItems.forEach(m => {
      if (m.image) referencedImages.add(path.basename(m.image));
      if (m.imageVariants && typeof m.imageVariants === 'object' && m.imageVariants !== null) {
        Object.values(m.imageVariants as Record<string, string>).forEach(variantPath => {
          if (typeof variantPath === 'string') {
            referencedImages.add(path.basename(variantPath));
          }
        });
      }
    });

    // 收集 SiteSettings (favicon, logo, heroSection.backgroundImage)
    const settingsList = await prisma.siteSettings.findMany();
    settingsList.forEach(s => {
      if (s.favicon) referencedImages.add(path.basename(s.favicon));
      if (s.logo) referencedImages.add(path.basename(s.logo));
      
      if (s.heroSection && typeof s.heroSection === 'object' && s.heroSection !== null) {
        const hero = s.heroSection as any;
        if (typeof hero.backgroundImage === 'string') {
          referencedImages.add(path.basename(hero.backgroundImage));
        }
      }
    });

    // 2. 讀取實體資料夾
    const physicalFiles = await fs.readdir(uploadDir);
    
    let deletedCount = 0;
    
    // 3. 找出孤兒檔案並刪除
    for (const file of physicalFiles) {
      if (!referencedImages.has(file)) {
        const filePath = path.join(uploadDir, file);
        try {
          await fs.unlink(filePath);
          deletedCount++;
          logger.debug(`Deleted unused image: ${file}`);
        } catch (err) {
          logger.error({ err }, `Failed to delete file ${file}`);
        }
      }
    }
    
    logger.info(`Unused local images cleanup completed. Deleted ${deletedCount} files.`);
    
  } catch (error) {
    logger.error({ err: error }, 'Error during unused local images cleanup');
  }
}

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { parseS3Settings } from '../lib/s3.js';

export async function cleanupS3Images(referencedImages: Set<string>) {
  logger.info('Starting unused S3 images cleanup...');
  const settingsList = await prisma.siteSettings.findMany();
  
  for (const settings of settingsList) {
    const s3Settings = parseS3Settings((settings.advancedSettings as any)?.s3Settings);
    if (!s3Settings) continue;

    try {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: s3Settings.endpoint,
        credentials: {
          accessKeyId: s3Settings.accessKey,
          secretAccessKey: s3Settings.secretKey,
        },
      });

      let continuationToken: string | undefined = undefined;
      let deletedCount = 0;

      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: s3Settings.bucket,
          ContinuationToken: continuationToken,
        });

        const listResponse = await s3Client.send(listCommand);
        const objects = listResponse.Contents || [];

        const objectsToDelete = objects
          .filter(obj => obj.Key && !referencedImages.has(obj.Key))
          .map(obj => ({ Key: obj.Key as string }));

        if (objectsToDelete.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: s3Settings.bucket,
            Delete: { Objects: objectsToDelete },
          });
          await s3Client.send(deleteCommand);
          deletedCount += objectsToDelete.length;
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);

      logger.info(`S3 cleanup completed for bucket ${s3Settings.bucket}. Deleted ${deletedCount} files.`);
    } catch (error) {
      logger.error({ err: error, bucket: s3Settings.bucket }, 'Error during S3 cleanup');
    }
  }
}

export async function cleanupAllImages() {
  const referencedImages = new Set<string>();

  // Collect all references
  const users = await prisma.user.findMany({ select: { avatar: true } });
  users.forEach(u => u.avatar && referencedImages.add(path.basename(u.avatar)));

  const locations = await prisma.location.findMany({ select: { image: true } });
  locations.forEach(l => l.image && referencedImages.add(path.basename(l.image)));

  const categories = await prisma.category.findMany({ select: { image: true } });
  categories.forEach(c => c.image && referencedImages.add(path.basename(c.image)));

  const menuItems = await prisma.menuItem.findMany({ select: { image: true, imageVariants: true } });
  menuItems.forEach(m => {
    if (m.image) referencedImages.add(path.basename(m.image));
    if (m.imageVariants && typeof m.imageVariants === 'object' && m.imageVariants !== null) {
      Object.values(m.imageVariants as Record<string, string>).forEach(variantPath => {
        if (typeof variantPath === 'string') {
          referencedImages.add(path.basename(variantPath));
        }
      });
    }
  });

  const settingsList = await prisma.siteSettings.findMany();
  settingsList.forEach(s => {
    if (s.favicon) referencedImages.add(path.basename(s.favicon));
    if (s.logo) referencedImages.add(path.basename(s.logo));
    
    if (s.heroSection && typeof s.heroSection === 'object' && s.heroSection !== null) {
      const hero = s.heroSection as any;
      if (typeof hero.backgroundImage === 'string') {
        referencedImages.add(path.basename(hero.backgroundImage));
      }
    }
  });

  await cleanupUnusedImages();
  await cleanupS3Images(referencedImages);
}

// 建立排程任務 (每月月底或每週執行一次，目前設為每週日凌晨 3 點執行，以節省 API)
export function scheduleImageCleanup() {
  cron.schedule('0 3 * * 0', () => {
    cleanupAllImages();
  });
  logger.info('Image cleanup cron job scheduled at 03:00 AM every Sunday.');
}
