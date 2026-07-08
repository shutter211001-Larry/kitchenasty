import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const setting = await prisma.erpSetting.findFirst({
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

    let setting = await prisma.erpSetting.findFirst({
      where: { key: 'GLOBAL_PREFS' }
    });

    if (setting) {
      setting = await prisma.erpSetting.update({
        where: { id: setting.id },
        data: { value: prefs as any }
      });
    } else {
      setting = await prisma.erpSetting.create({
        data: { key: 'GLOBAL_PREFS', value: prefs as any }
      });
    }

    res.json(setting.value);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const getMailBranding = async (req: Request, res: Response) => {
  try {
    const setting = await prisma.erpSetting.findFirst({
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

    let setting = await prisma.erpSetting.findFirst({
      where: { key: 'mailBranding' }
    });

    if (setting) {
      setting = await prisma.erpSetting.update({
        where: { id: setting.id },
        data: { value: prefs as any }
      });
    } else {
      setting = await prisma.erpSetting.create({
        data: { key: 'mailBranding', value: prefs as any }
      });
    }

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
  res.json({ success: true, message: 'No longer needed, tables are merged.' });
};
