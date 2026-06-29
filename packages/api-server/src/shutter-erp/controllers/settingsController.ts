import { Request, Response } from 'express';
import { PrismaClient } from '@shutter-erp/client';

const prisma = new PrismaClient();

export const getSettings = async (req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'GLOBAL_PREFS' }
    });
    
    // Default values if not set
    if (!setting) {
      return res.json({
        decimalPrecision: 1,
        autoUnitConversionThreshold: 1000
      });
    }

    res.json(setting.value);
  } catch (error) {
    console.error('Failed to get settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { decimalPrecision, autoUnitConversionThreshold } = req.body;
    
    // Validate or sanitize if needed
    const prefs = {
      decimalPrecision: typeof decimalPrecision === 'number' ? decimalPrecision : 1,
      autoUnitConversionThreshold: typeof autoUnitConversionThreshold === 'number' ? autoUnitConversionThreshold : 1000
    };

    const setting = await prisma.systemSetting.upsert({
      where: { key: 'GLOBAL_PREFS' },
      update: { value: prefs as any },
      create: { key: 'GLOBAL_PREFS', value: prefs as any }
    });

    res.json(setting.value);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
