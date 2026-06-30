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

export const getMailBranding = async (req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'mailBranding' }
    });
    
    if (!setting || !setting.value) {
      return res.json({
        senderName: '夏特 ERP 系統',
        senderEmail: 'noreply@shutterorder.com',
        emailBrandName: '夏特 ERP 系統',
        emailHeaderColor: '#3b82f6', // blue for ERP by default
        emailBgColor: '#f3f4f6'
      });
    }

    res.json(setting.value);
  } catch (error) {
    console.error('Failed to get mail branding:', error);
    res.status(500).json({ error: 'Failed to fetch mail branding' });
  }
};

export const updateMailBranding = async (req: Request, res: Response) => {
  try {
    const { senderName, senderEmail, emailBrandName, emailHeaderColor, emailBgColor } = req.body;
    
    const prefs = {
      senderName: senderName || '夏特 ERP 系統',
      senderEmail: senderEmail || 'noreply@shutterorder.com',
      emailBrandName: emailBrandName || '夏特 ERP 系統',
      emailHeaderColor: emailHeaderColor || '#3b82f6',
      emailBgColor: emailBgColor || '#f3f4f6'
    };

    const setting = await prisma.systemSetting.upsert({
      where: { key: 'mailBranding' },
      update: { value: prefs as any },
      create: { key: 'mailBranding', value: prefs as any }
    });

    res.json({ success: true, message: 'Mail branding updated successfully', data: setting.value });
  } catch (error) {
    console.error('Failed to update mail branding:', error);
    res.status(500).json({ error: 'Failed to update mail branding' });
  }
};

export const testMailBranding = async (req: Request, res: Response) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }

    const { sendEmail } = await import('../../lib/email.js');

    await sendEmail({
      to,
      subject: '夏特 ERP 系統 — 測試信件',
      html: '<div style="font-family:sans-serif;padding:20px"><h2>ERP Test Email</h2><p>This email was sent to verify your ERP email branding settings.</p><p>If the colors and sender name are correct, your configuration is successful.</p></div>',
      system: 'ERP'
    });

    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (error: any) {
    console.error('Failed to send test email:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send test email' });
  }
};

export const createErpTables = async (req: Request, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InviteToken" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'STAFF',
        "invitedBy" TEXT NOT NULL,
        "usedAt" TIMESTAMP(3),
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_token_key" ON "InviteToken"("token");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
    `);
    
    res.json({ success: true, message: 'ERP tables created successfully on the database' });
  } catch (error: any) {
    console.error('Failed to create ERP tables:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create tables' });
  }
};
