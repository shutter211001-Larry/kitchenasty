import cron from 'node-cron';
import logger from '../lib/logger.js';
import { autoResumeAllMenuTranslations } from '../controllers/menu-ai.controller.js';

/**
 * 掃描所有租戶，自動續傳未完成的 AI 菜單翻譯
 */
export function scheduleMenuTranslationResume() {
  // 每 15 分鐘執行一次
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running scheduled task: Auto resume menu translation');
    try {
      await autoResumeAllMenuTranslations();
    } catch (error) {
      logger.error(error as any, 'Scheduled menu translation resume failed');
    }
  });
}
