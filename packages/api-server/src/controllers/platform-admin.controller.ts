import { Request, Response } from 'express';
import prisma from '../lib/db.js';
import logger from '../lib/logger.js';
import { Prisma } from '@prisma/client';

export const listTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await (prisma as any).tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, locations: true, orders: true }
        },
        users: {
          where: { role: 'SUPER_ADMIN' },
          take: 1,
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.json({ success: true, data: tenants });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list tenants');
    res.status(500).json({ success: false, error: 'Failed to list tenants' });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  try {
    const { name, domain, adminEmail, adminName, adminPassword, subscriptionEndsAt, sendWelcomeEmail } = req.body;

    if (!name || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Hash password (we assume bcrypt is used elsewhere in auth controller)
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(adminPassword, 10);

    const trimmedDomain = domain?.trim() || null;
    let endsAtDate = null;
    if (subscriptionEndsAt) {
      endsAtDate = new Date(subscriptionEndsAt);
    }

    const newTenant = await (prisma as any).tenant.create({
      data: {
        name,
        domain: trimmedDomain,
        subscriptionEndsAt: endsAtDate,
        users: {
          create: {
            email: adminEmail,
            name: adminName || 'Admin',
            password: hashedPassword,
            role: 'SUPER_ADMIN', // The boss of the tenant
          }
        },
        siteSettings: {
          create: {
            id: require('crypto').randomUUID(),
            siteName: name,
            siteTitle: `${name} - Order Online`,
            colorPrimary: '#ea580c'
          }
        }
      }
    });

    if (sendWelcomeEmail) {
      sendWelcomeEmailCore(newTenant);
    }

    res.status(201).json({ success: true, data: newTenant });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create tenant');
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({ success: false, error: `${target === 'email' ? '信箱' : '網域'}已存在，請使用其他名稱 (${target})` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create tenant' });
    }
  }
};

export const updateTenant = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, domain, isActive, hasErpAccess, subscriptionEndsAt } = req.body;

    const tenant = await (prisma as any).tenant.update({
      where: { id },
      data: {
        name,
        domain,
        isActive,
        hasErpAccess,
        subscriptionEndsAt: subscriptionEndsAt ? new Date(subscriptionEndsAt) : null
      }
    });

    res.json({ success: true, data: tenant });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update tenant');
    res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Manually delete blocking records to prevent Foreign Key Constraint errors 
    // due to missing onDelete: Cascade on some cross-relations (like Order -> Location)
    await (prisma as any).order.deleteMany({ where: { tenantId: id } });
    await (prisma as any).reservation.deleteMany({ where: { tenantId: id } });
    await (prisma as any).review.deleteMany({ where: { tenantId: id } });
    await (prisma as any).loyaltyTransaction.deleteMany({ where: { tenantId: id } });
    await (prisma as any).chatMessage.deleteMany({ where: { tenantId: id } });
    await (prisma as any).shift.deleteMany({ where: { tenantId: id } });
    await (prisma as any).attendanceCorrectionRequest.deleteMany({ where: { tenantId: id } });
    await (prisma as any).leaveRequest.deleteMany({ where: { tenantId: id } });
    await (prisma as any).staffAttendance.deleteMany({ where: { tenantId: id } });
    
    // Now delete the tenant itself (Prisma will cascade the rest like MenuItem, Location, User)
    await (prisma as any).tenant.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete tenant');
    res.status(500).json({ success: false, error: 'Failed to delete tenant' });
  }
};

import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = util.promisify(exec);

export const resetDemoTenant = async (req: Request, res: Response) => {
  try {
    const id = 'demo-tenant-id';
    
    // Manually delete blocking records to prevent Foreign Key Constraint errors
    await (prisma as any).order.deleteMany({ where: { tenantId: id } });
    await (prisma as any).reservation.deleteMany({ where: { tenantId: id } });
    await (prisma as any).review.deleteMany({ where: { tenantId: id } });
    await (prisma as any).loyaltyTransaction.deleteMany({ where: { tenantId: id } });
    await (prisma as any).chatMessage.deleteMany({ where: { tenantId: id } });
    await (prisma as any).shift.deleteMany({ where: { tenantId: id } });
    await (prisma as any).attendanceCorrectionRequest.deleteMany({ where: { tenantId: id } });
    await (prisma as any).leaveRequest.deleteMany({ where: { tenantId: id } });
    await (prisma as any).staffAttendance.deleteMany({ where: { tenantId: id } });

    // Delete the demo tenant to cascade wipe everything
    await (prisma as any).tenant.deleteMany({
      where: { id }
    });

    res.json({ success: true, message: 'Reset started' });

    // Run seed scripts in the background
    (async () => {
      try {
        logger.info('Starting demo tenant seed...');
        const apiServerDir = path.join(__dirname, '../../');
        
        await execAsync('npm run db:seed', { cwd: apiServerDir });
        await execAsync('npx tsx scripts/shutter-erp/seedFoodData.ts', { cwd: apiServerDir });
        
        logger.info('Demo tenant reset complete!');
      } catch (e) {
        logger.error({ err: e }, 'Error seeding demo tenant');
      }
    })();
  } catch (error) {
    logger.error({ err: error }, 'Failed to reset demo tenant');
    // Only send error if we haven't sent a response yet
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to reset demo tenant' });
    }
  }
};

const maskSecret = (secret?: string | null) => secret ? '********' : '';
const parseJson = (val: any) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return {}; }
  }
  return val || {};
};

export const getTenantIntegrations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const settings = await (prisma as any).siteSettings.findFirst({
      where: { tenantId: id }
    });

    const line = parseJson(settings?.lineSettings);
    const google = parseJson(settings?.googleSettings);
    const mail = parseJson(settings?.mailSettings);
    const payment = parseJson(settings?.paymentSettings);
    const invoice = parseJson(settings?.invoiceSettings);
    const order = parseJson(settings?.orderSettings);

    const data = {
      line: {
        liffId: line.liffId || '',
        channelAccessToken: maskSecret(line.channelAccessToken),
        channelSecret: maskSecret(line.channelSecret),
        lineLoginChannelId: line.lineLoginChannelId || '',
        lineLoginChannelSecret: maskSecret(line.lineLoginChannelSecret),
        linePayChannelId: line.linePayChannelId || '',
        linePayChannelSecret: maskSecret(line.linePayChannelSecret),
        linePayApiUrl: line.linePayApiUrl || '',
        linePayProxyUrl: line.linePayProxyUrl || '',
        linePayReturnUrl: line.linePayReturnUrl || ''
      },
      google: {
        googleLoginClientId: google.googleLoginClientId || '',
        googleLoginClientSecret: maskSecret(google.googleLoginClientSecret),
        gmailClientId: google.gmailClientId || '',
        gmailClientSecret: maskSecret(google.gmailClientSecret),
        gmailRefreshToken: maskSecret(google.gmailRefreshToken),
        googleMapsApiKey: maskSecret(google.googleMapsApiKey),
        geminiApiKey: maskSecret(google.geminiApiKey)
      },
      mail: {
        smtpHost: mail.smtpHost || '',
        smtpPort: mail.smtpPort || '',
        smtpUser: mail.smtpUser || '',
        smtpPass: maskSecret(mail.smtpPass),
        senderEmail: mail.senderEmail || '',
        senderName: mail.senderName || '',
        mailServiceType: mail.mailServiceType || 'SMTP',
      },
      payment: {
        stripePublicKey: payment.stripePublicKey || '',
        stripeSecretKey: maskSecret(payment.stripeSecretKey),
        stripeWebhookSecret: maskSecret(payment.stripeWebhookSecret),
        paypalClientId: payment.paypalClientId || '',
        paypalClientSecret: maskSecret(payment.paypalClientSecret)
      },
      invoice: {
        merchantId: invoice.merchantId || '',
        hashKey: maskSecret(invoice.hashKey),
        hashIv: maskSecret(invoice.hashIv),
      },
      logistics: {
        ecpayMerchantId: order.ecpayMerchantId || '',
        ecpayHashKey: maskSecret(order.ecpayHashKey),
        ecpayHashIv: maskSecret(order.ecpayHashIv),
        tcatCustomerId: order.tcatCustomerId || '',
        tcatApiKey: maskSecret(order.tcatApiKey),
        pelicanMerchantId: order.pelicanMerchantId || '',
        pelicanApiKey: maskSecret(order.pelicanApiKey),
      }
    };

    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get tenant integrations');
    res.status(500).json({ success: false, error: 'Failed to get tenant integrations' });
  }
};

export const updateTenantIntegrations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { line, google, mail, payment, invoice, logistics } = req.body;

    let currentSettings = await (prisma as any).siteSettings.findFirst({
      where: { tenantId: id }
    });

    if (!currentSettings) {
      currentSettings = await (prisma as any).siteSettings.create({
        data: {
          id: require('crypto').randomUUID(),
          tenantId: id,
          siteName: 'Shutter',
          siteTitle: 'Shutter - Order Online',
          colorPrimary: '#ea580c'
        }
      });
    }

    const currentLine = parseJson(currentSettings.lineSettings);
    const currentGoogle = parseJson(currentSettings.googleSettings);
    const currentMail = parseJson(currentSettings.mailSettings);
    const currentPayment = parseJson(currentSettings.paymentSettings);
    const currentInvoice = parseJson(currentSettings.invoiceSettings);
    const currentOrder = parseJson(currentSettings.orderSettings);

    const applyUpdate = (current: any, update: any, keys: string[]) => {
      const result = { ...current };
      for (const key of keys) {
        if (update && update[key] !== undefined) {
          if (update[key] !== '********') {
            result[key] = update[key];
          }
        }
      }
      return result;
    };

    const newLine = applyUpdate(currentLine, line, [
      'liffId', 'channelAccessToken', 'channelSecret', 
      'lineLoginChannelId', 'lineLoginChannelSecret', 
      'linePayChannelId', 'linePayChannelSecret',
      'linePayApiUrl', 'linePayProxyUrl', 'linePayReturnUrl'
    ]);

    const newGoogle = applyUpdate(currentGoogle, google, [
      'googleLoginClientId', 'googleLoginClientSecret',
      'gmailClientId', 'gmailClientSecret', 'gmailRefreshToken', 
      'googleMapsApiKey', 'geminiApiKey'
    ]);

    const newMail = applyUpdate(currentMail, mail, [
      'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'senderEmail', 'senderName', 'mailServiceType'
    ]);

    const newPayment = applyUpdate(currentPayment, payment, [
      'stripePublicKey', 'stripeSecretKey', 'stripeWebhookSecret',
      'paypalClientId', 'paypalClientSecret'
    ]);

    const newInvoice = applyUpdate(currentInvoice, invoice, [
      'merchantId', 'hashKey', 'hashIv'
    ]);

    const newOrder = applyUpdate(currentOrder, logistics, [
      'ecpayMerchantId', 'ecpayHashKey', 'ecpayHashIv',
      'tcatCustomerId', 'tcatApiKey',
      'pelicanMerchantId', 'pelicanApiKey'
    ]);

    const pendingPayload = {
      lineSettings: newLine,
      googleSettings: newGoogle,
      mailSettings: newMail,
      paymentSettings: newPayment,
      invoiceSettings: newInvoice,
      orderSettings: newOrder
    };

    const token = require('crypto').randomBytes(32).toString('hex');

    await (prisma as any).siteSettings.update({
      where: { id: currentSettings.id },
      data: {
        pendingIntegrations: pendingPayload,
        pendingIntegrationsToken: token
      }
    });

    res.json({ success: true, message: '已發送確認信給該店超級管理員' });

    // Send email notification to tenant's SUPER_ADMIN asynchronously
    (async () => {
      try {
        const tenant = await (prisma as any).tenant.findUnique({ where: { id } });
        const tenantAdmins = await (prisma as any).user.findMany({
          where: { tenantId: id, role: 'SUPER_ADMIN', email: { not: null } }
        });

        if (tenantAdmins.length > 0 && tenant) {
          const { tenantStorage } = await import('../middleware/tenantStorage.js');
          const { sendEmail } = await import('../lib/email.js');
          
          const isProd = process.env.NODE_ENV === 'production';
          const protocol = isProd ? 'https' : 'http';
          const hostname = tenant.domain || `${tenant.id}.localhost`;
          const port = isProd ? '' : ':5173';
          const approvalLink = `${protocol}://${hostname}${port}/approve-integrations?token=${token}`;
          
          tenantStorage.run({ tenantId: null }, () => {
            for (const admin of tenantAdmins) {
              sendEmail({
                to: admin.email,
                subject: 'SaaS 平台系統通知：整合金鑰設定審核',
                html: `<div style="font-family: sans-serif; padding: 20px;">
                        <h2>整合金鑰更新確認</h2>
                        <p>親愛的 ${admin.name}，您好：</p>
                        <p>系統管理員為您的餐廳配置了新的第三方整合金鑰（LINE, Google, 信箱或金流）。</p>
                        <p>請點擊下方按鈕進行確認並套用設定：</p>
                        <a href="${approvalLink}" style="display: inline-block; padding: 12px 24px; background-color: #ea580c; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">確認並套用設定</a>
                        <p style="color: #666; font-size: 14px;">如果您沒有提出此要求，請忽略此信件。</p>
                        <p>祝您生意興隆！<br/>夏特點餐系統 團隊</p>
                       </div>`
              });
            }
          });
        }
      } catch (err) {
        logger.error({ err }, 'Failed to send integration update email');
      }
    })();

  } catch (error) {
    logger.error({ err: error }, 'Failed to update tenant integrations');
    res.status(500).json({ success: false, error: 'Failed to update tenant integrations' });
  }
};

export async function sendWelcomeEmailCore(tenant: any) {
  try {
    const { sendEmail } = await import('../lib/email.js');
    
    // Fetch global mail settings
    const settings = await (prisma as any).siteSettings.findUnique({
      where: { id: 'default' }
    });
    
    const mailSettings = typeof settings?.mailSettings === 'string' 
      ? JSON.parse(settings.mailSettings) 
      : (settings?.mailSettings || {});
      
    const template = mailSettings.welcomeEmailTemplate;
    
    if (!template || !template.subject || !template.body) {
      logger.warn('Welcome email template is not configured');
      return;
    }
    
    // Find the tenant admin user
    const adminUser = await (prisma as any).user.findFirst({
      where: { tenantId: tenant.id, role: 'SUPER_ADMIN' }
    });
    
    if (!adminUser) {
      logger.warn(`No admin user found for tenant ${tenant.id}`);
      return;
    }
    
    // Replace variables
    let storeUrl = '';
    let adminUrl = '';
    let erpUrl = '';
    
    if (tenant.domain) {
      storeUrl = `https://store.${tenant.domain}`;
      adminUrl = `https://admin.${tenant.domain}`;
      erpUrl = `https://erp.${tenant.domain}`;
      if (tenant.domain.endsWith('.shutterorder.pro')) {
        const subdomain = tenant.domain.replace('.shutterorder.pro', '');
        storeUrl = `https://${subdomain}.store.shutterorder.pro`;
        adminUrl = `https://${subdomain}.admin.shutterorder.pro`;
        erpUrl = `https://${subdomain}.erp.shutterorder.pro`;
      }
    } else {
      storeUrl = process.env.STORE_URL_PUBLIC || 'http://localhost:3000';
      adminUrl = process.env.ADMIN_URL_PUBLIC || 'http://localhost:5173';
      erpUrl = process.env.ERP_URL_PUBLIC || 'http://localhost:3002';
    }
    
    const expirationDate = tenant.subscriptionEndsAt 
      ? new Date(tenant.subscriptionEndsAt).toISOString().split('T')[0] 
      : '無期限';
      
    let htmlBody = template.body
      .replace(/{tenantName}/g, tenant.name)
      .replace(/{expirationDate}/g, expirationDate)
      .replace(/{storeUrl}/g, storeUrl)
      .replace(/{adminUrl}/g, adminUrl)
      .replace(/{erpUrl}/g, erpUrl);
      
    // Convert newlines to <br/> if the user entered plain text
    htmlBody = htmlBody.replace(/\n/g, '<br/>');

    const { tenantStorage } = await import('../middleware/tenantStorage.js');
    tenantStorage.run({ tenantId: null }, () => {
      sendEmail({
        to: adminUser.email,
        subject: template.subject,
        html: htmlBody
      });
    });
    
    logger.info(`Welcome email sent to ${adminUser.email}`);
  } catch (err) {
    logger.error({ err, tenantId: tenant?.id }, 'Failed to send welcome email');
  }
}

export const sendWelcomeEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id }
    });
    
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    
    // Background send
    sendWelcomeEmailCore(tenant);
    
    res.json({ success: true, message: 'Welcome email scheduled' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to schedule welcome email');
    res.status(500).json({ success: false, error: 'Failed to schedule welcome email' });
  }
};
