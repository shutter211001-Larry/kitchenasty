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
    
    logger.info(`Unused images cleanup completed. Deleted ${deletedCount} files.`);
    
  } catch (error) {
    logger.error({ err: error }, 'Error during unused images cleanup');
  }
}

// 建立排程任務 (每天凌晨 3:00 執行)
export function scheduleImageCleanup() {
  cron.schedule('0 3 * * *', () => {
    cleanupUnusedImages();
  });
  logger.info('Image cleanup cron job scheduled at 03:00 AM daily.');
}
