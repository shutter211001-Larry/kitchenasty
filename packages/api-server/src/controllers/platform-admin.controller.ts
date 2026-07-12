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

export const getTenantLocations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const locations = await (prisma as any).location.findMany({
      where: { tenantId: id, isActive: true },
      select: { id: true, name: true }
    });
    res.json({ success: true, data: locations });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get tenant locations');
    res.status(500).json({ success: false, error: 'Failed to get tenant locations' });
  }
};

export const getTenantIntegrations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const locationId = req.query.locationId as string;

    let line: any = {};
    let google: any = {};
    let mail: any = {};
    let payment: any = {};
    let invoice: any = {};
    let order: any = {};
    let s3: any = {};

    if (locationId) {
      const settings = await (prisma as any).siteSettings.findFirst({
        where: { tenantId: id }
      });
      const advanced = parseJson(settings?.advancedSettings);
      const overrides = advanced.locationOverrides || {};
      const locationOverride = overrides[locationId] || {};
      
      line = parseJson(locationOverride.lineSettings);
      google = parseJson(locationOverride.googleSettings);
      mail = parseJson(locationOverride.mailSettings);
      payment = parseJson(locationOverride.paymentSettings);
      invoice = parseJson(locationOverride.invoiceSettings);
      order = parseJson(locationOverride.orderSettings);
      s3 = parseJson(locationOverride.s3Settings);
    } else {
      const settings = await (prisma as any).siteSettings.findFirst({
        where: { tenantId: id }
      });
      line = parseJson(settings?.lineSettings);
      google = parseJson(settings?.googleSettings);
      mail = parseJson(settings?.mailSettings);
      payment = parseJson(settings?.paymentSettings);
      invoice = parseJson(settings?.invoiceSettings);
      order = parseJson(settings?.orderSettings);
      const advanced = parseJson(settings?.advancedSettings);
      s3 = advanced.s3Settings || {};
    }

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
      },
      s3: {
        endpoint: s3.endpoint || '',
        bucket: s3.bucket || '',
        accessKey: s3.accessKey || '',
        secretKey: maskSecret(s3.secretKey),
        publicUrl: s3.publicUrl || '',
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
    const locationId = req.query.locationId as string;
    const { line, google, mail, payment, invoice, logistics, s3, notifyEmail } = req.body;

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

    if (locationId) {
      const currentSettings = await (prisma as any).siteSettings.findFirst({
        where: { tenantId: id }
      });
      if (!currentSettings) {
        return res.status(404).json({ success: false, error: 'Tenant settings not found' });
      }

      const currentAdvanced = parseJson(currentSettings.advancedSettings);
      const overrides = { ...(currentAdvanced.locationOverrides || {}) };
      const locationOverride = overrides[locationId] || {};

      const currentLine = parseJson(locationOverride.lineSettings);
      const currentMail = parseJson(locationOverride.mailSettings);
      const currentInvoice = parseJson(locationOverride.invoiceSettings);
      const currentPayment = parseJson(locationOverride.paymentSettings);

      const newLine = applyUpdate(currentLine, line, [
        'liffId', 'channelAccessToken', 'channelSecret', 
        'lineLoginChannelId', 'lineLoginChannelSecret', 
        'linePayChannelId', 'linePayChannelSecret', 'linePayEnabled', 'linePaySandbox',
        'linePayApiUrl', 'linePayProxyUrl', 'linePayReturnUrl'
      ]);

      const newMail = applyUpdate(currentMail, mail, [
        'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'senderEmail', 'senderName', 'mailServiceType'
      ]);

      const newInvoice = applyUpdate(currentInvoice, invoice, [
        'merchantId', 'hashKey', 'hashIv'
      ]);

      const newPayment = applyUpdate(currentPayment, payment, [
        'stripePublicKey', 'stripeSecretKey', 'stripeWebhookSecret',
        'paypalClientId', 'paypalClientSecret'
      ]);

      overrides[locationId] = {
        ...locationOverride,
        lineSettings: newLine,
        mailSettings: newMail,
        invoiceSettings: newInvoice,
        paymentSettings: newPayment
      };

      await (prisma as any).siteSettings.update({
        where: { id: currentSettings.id },
        data: {
          advancedSettings: {
            ...currentAdvanced,
            locationOverrides: overrides
          }
        }
      });
    } else {
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
      const currentAdvanced = parseJson(currentSettings.advancedSettings);

      const newLine = applyUpdate(currentLine, line, [
        'liffId', 'channelAccessToken', 'channelSecret', 
        'lineLoginChannelId', 'lineLoginChannelSecret', 
        'linePayChannelId', 'linePayChannelSecret', 'linePayEnabled', 'linePaySandbox',
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

      const newS3 = applyUpdate(currentAdvanced.s3Settings || {}, s3, [
        'endpoint', 'bucket', 'accessKey', 'secretKey', 'publicUrl'
      ]);

      const payload = {
        lineSettings: newLine,
        googleSettings: newGoogle,
        mailSettings: newMail,
        paymentSettings: newPayment,
        invoiceSettings: newInvoice,
        orderSettings: newOrder,
        advancedSettings: {
          ...currentAdvanced,
          s3Settings: newS3
        }
      };

      await (prisma as any).siteSettings.update({
        where: { id: currentSettings.id },
        data: payload
      });
    }

    if (notifyEmail) {
      // Send email notification dynamically to the provided email
      try {
        const tenant = await (prisma as any).tenant.findUnique({ where: { id } });
        if (tenant) {
          const { tenantStorage } = await import('../middleware/tenantStorage.js');
          const { sendEmail } = await import('../lib/email.js');
          
          await new Promise<void>((resolve, reject) => {
            tenantStorage.run({ tenantId: null }, async () => {
              try {
                await sendEmail({
                  to: notifyEmail,
                  subject: 'SaaS 平台系統通知：整合金鑰設定已更新',
                  throwOnError: true,
                  html: `<div style="font-family: sans-serif; padding: 20px;">
                            <h2>第三方服務整合金鑰已更新</h2>
                            <p>您好：</p>
                            <p>系統管理員已為您的餐廳（${tenant.name}）配置了新的第三方整合金鑰或服務串接。</p>
                            <p>若有任何疑問，請聯繫 SaaS 平台客服中心。</p>
                            <p>祝您生意興隆！<br/>夏特點餐系統 團隊</p>
                           </div>`
                });
                resolve();
              } catch (err) {
                reject(err);
              }
            });
          });
        }
      } catch (err) {
        logger.error({ err }, 'Failed to send integration update email to ' + notifyEmail);
        return res.status(500).json({ success: false, error: '設定已儲存，但寄送確認信失敗' });
      }
    }

    res.json({ success: true, message: notifyEmail ? '設定已儲存並發送通知' : '設定已儲存' });
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
      
    const template = mailSettings.welcomeEmailTemplate || {};
    
    const subject = template.subject || '歡迎使用 夏特 SaaS 平台 - 您的專屬系統已建立';
    const body = template.body || `<div style="font-family: sans-serif; padding: 20px;">
      <h2>歡迎加入 夏特 SaaS 平台</h2>
      <p>親愛的 {tenantName} 您好：</p>
      <p>您的專屬系統已經為您準備完畢！</p>
      <br/>
      <h3>管理後台連結</h3>
      <ul>
        <li>租戶管理端：<a href="{adminUrl}">{adminUrl}</a></li>
        <li>總部 ERP 端：<a href="{erpUrl}">{erpUrl}</a></li>
        <li>顧客點餐端：<a href="{storeUrl}">{storeUrl}</a></li>
      </ul>
      <br/>
      <p>您的系統使用期限至：{expirationDate}</p>
      <br/>
      <p>若您對系統有任何疑問或需要修改第三方金鑰，請隨時聯繫 SaaS 平台客服人員。</p>
      <p>祝您生意興隆！<br/>夏特團隊</p>
    </div>`;
    
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
      
    let htmlBody = body
      .replace(/{tenantName}/g, tenant.name)
      .replace(/{expirationDate}/g, expirationDate)
      .replace(/{storeUrl}/g, storeUrl)
      .replace(/{adminUrl}/g, adminUrl)
      .replace(/{erpUrl}/g, erpUrl);
      
    // Convert newlines to <br/> if the user entered plain text
    htmlBody = htmlBody.replace(/\n/g, '<br/>');

    const { tenantStorage } = await import('../middleware/tenantStorage.js');
    await new Promise<void>((resolve, reject) => {
      tenantStorage.run({ tenantId: null }, async () => {
        try {
          await sendEmail({
            to: adminUser.email,
            subject: subject,
            throwOnError: true,
            html: htmlBody
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
    
    logger.info(`Welcome email sent to ${adminUser.email}`);
  } catch (err) {
    logger.error({ err, tenantId: tenant?.id }, 'Failed to send welcome email');
    throw err; // Re-throw so caller knows it failed
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
    
    await sendWelcomeEmailCore(tenant);
    
    res.json({ success: true, message: 'Welcome email sent' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to send welcome email');
    res.status(500).json({ success: false, error: 'Failed to send welcome email' });
  }
};
