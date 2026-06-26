import { Request, Response } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';
import { autoTranslateSiteSettings } from '../lib/translation-helper.js';

const updateSettingsSchema = z.object({
  siteName: z.string().min(1).optional(),
  siteTitle: z.string().min(1).optional(),
  siteDescription: z.string().optional(),
  colorPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  colorSecondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  darkMode: z.enum(['light', 'dark', 'system']).optional(),
  storefrontTemplate: z.string().optional(),
  heroSection: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaPrimaryText: z.string().optional(),
    ctaPrimaryLink: z.string().optional(),
    ctaSecondaryText: z.string().optional(),
    ctaSecondaryLink: z.string().optional(),
    backgroundImage: z.string().optional(),
  }).optional(),
  featuresSection: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })).optional(),
  ctaSection: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    buttonText: z.string().optional(),
    buttonLink: z.string().optional(),
  }).optional(),
  menuSection: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  lineSettings: z.object({
    liffId: z.string().optional(),
    officialAccountUrl: z.string().optional(),
    notifications: z.record(z.object({
      enabled: z.boolean().optional(),
      message: z.string().optional(),
    })).optional(),
  }).optional(),
  orderSettings: z.object({
    emailNotifications: z.record(z.boolean()).optional(),
    loyaltyEarnRate: z.number().min(0).optional(),
    loyaltyRedeemRate: z.number().min(1).optional(),
  }).optional(),
});

async function getOrCreateSettings() {
  let settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: { id: 'default' } });
  }
  return settings;
}

// Only the fields required by the public storefront — never include API keys or credentials.
function toPublicSettings(settings: Awaited<ReturnType<typeof getOrCreateSettings>>) {
  const getJson = (val: any) => {
    if (!val) return {};
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return {}; }
    }
    return val;
  };

  const general = getJson(settings.generalSettings);
  const order = getJson(settings.orderSettings);
  const payment = getJson(settings.paymentSettings);
  const reservation = getJson(settings.reservationSettings);

  const isTrue = (val: any, defaultVal: boolean) => {
    if (val === undefined || val === null) return defaultVal;
    return val === true || val === 'true';
  };

  return {
    id: settings.id,
    siteName: settings.siteName,
    siteTitle: settings.siteTitle,
    siteDescription: settings.siteDescription,
    favicon: settings.favicon,
    logo: settings.logo,
    colorPrimary: settings.colorPrimary,
    colorSecondary: settings.colorSecondary,
    darkMode: settings.darkMode,
    storefrontTemplate: settings.storefrontTemplate,
    heroSection: settings.heroSection,
    menuSection: settings.menuSection,
    featuresSection: settings.featuresSection,
    ctaSection: settings.ctaSection,
    navShowHome: isTrue(general.navShowHome, true),
    navShowLocations: isTrue(general.navShowLocations, true),
    navShowMenu: isTrue(general.navShowMenu, true),
    navShowReservations: isTrue(general.navShowReservations, true),
    showMembership: isTrue(general.showMembership, true),
    orderStatusMessage: general.orderStatusMessage,
    orderStatusMessageTranslations: general.orderStatusMessageTranslations,
    orderSettings: settings.orderSettings ? {
      enabled: isTrue(order.enabled, true),
      deliveryEnabled: isTrue(order.deliveryEnabled, true),
      pickupEnabled: isTrue(order.pickupEnabled, true),
      frozenDeliveryEnabled: isTrue(order.frozenDeliveryEnabled, false),
      allowGuestCheckout: isTrue(order.allowGuestCheckout, true),
      minOrderDelivery: order.minOrderDelivery !== undefined ? Number(order.minOrderDelivery) : 0,
      minOrderPickup: order.minOrderPickup !== undefined ? Number(order.minOrderPickup) : 0,
      minOrderFrozen: order.minOrderFrozen !== undefined ? Number(order.minOrderFrozen) : 0,
      deliveryLeadTime: order.deliveryLeadTime !== undefined ? Number(order.deliveryLeadTime) : 30,
      pickupLeadTime: order.pickupLeadTime !== undefined ? Number(order.pickupLeadTime) : 15,
      frozenLeadTime: order.frozenLeadTime !== undefined ? Number(order.frozenLeadTime) : 0,
      frozenDeliveryFee: order.frozenDeliveryFee !== undefined ? Number(order.frozenDeliveryFee) : 0,
      enableFutureOrdering: isTrue(order.enableFutureOrdering, false),
      taxRate: order.taxRate !== undefined ? Number(order.taxRate) : 0,
      preOpeningBuffer: order.preOpeningBuffer !== undefined ? Number(order.preOpeningBuffer) : 30,
      postClosingBuffer: order.postClosingBuffer !== undefined ? Number(order.postClosingBuffer) : 30,
      timeSlotInterval: order.timeSlotInterval !== undefined ? Number(order.timeSlotInterval) : 15,
      boardLeadTime: order.boardLeadTime !== undefined ? Number(order.boardLeadTime) : 60,
      loyaltyEarnRate: order.loyaltyEarnRate !== undefined ? Number(order.loyaltyEarnRate) : 1.0,
      loyaltyRedeemRate: order.loyaltyRedeemRate !== undefined ? Number(order.loyaltyRedeemRate) : 100.0,
      emailNotifications: order.emailNotifications || {},
    } : undefined,
    paymentSettings: {
      cashEnabled: isTrue(payment.cashEnabled, true),
      stripeEnabled: isTrue(payment.stripeEnabled, false),
      paypalEnabled: isTrue(payment.paypalEnabled, false),
    },
    reservationSettings: settings.reservationSettings ? {
      enabled: isTrue(reservation.enabled, true),
    } : undefined,
    lineSettings: getJson(settings.lineSettings),
    storefrontUrl: process.env.STORE_URL_PUBLIC || 'http://localhost:5173',
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const settings = await getOrCreateSettings();
  res.json({ success: true, data: toPublicSettings(settings) });
}

export async function debugSettings(_req: Request, res: Response): Promise<void> {
  const settings = await getOrCreateSettings();
  res.json({ success: true, raw: settings });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const locationId = req.query.locationId as string | undefined;
  if (locationId) {
    if (parsed.data.lineSettings) {
      const advanced = await getSettingsGroup('advancedSettings');
      const overrides = { ...(advanced.locationOverrides || {}) };
      const locationOverride = overrides[locationId] || {};
      const existingLine = locationOverride.lineSettings || {};
      
      overrides[locationId] = {
        ...locationOverride,
        lineSettings: {
          ...existingLine,
          ...parsed.data.lineSettings,
        },
      };

      const updatedSettings = await prisma.siteSettings.update({
        where: { id: 'default' },
        data: {
          advancedSettings: {
            ...advanced,
            locationOverrides: overrides,
          },
        },
      });

      auditLog(req, { action: 'update', entity: 'SiteSettings', entityId: 'default', details: { locationId, fields: ['lineSettings'] } });
      res.json({ success: true, data: toPublicSettings(updatedSettings) });
      return;
    }
  }

  const existingSettings = await getOrCreateSettings();

  // Helper to merge JSON fields
  const mergeJson = (field: string, newData: any) => {
    if (!newData) return undefined;
    const existing = (existingSettings as any)[field] || {};
    return { ...existing, ...newData };
  };

  const dataToUpdate: any = { ...parsed.data };
  
  if (parsed.data.lineSettings) {
    dataToUpdate.lineSettings = mergeJson('lineSettings', parsed.data.lineSettings);
  }
  if (parsed.data.orderSettings) {
    dataToUpdate.orderSettings = mergeJson('orderSettings', parsed.data.orderSettings);
  }

  // Auto-translate
  const translatedData = await autoTranslateSiteSettings(dataToUpdate, existingSettings);

  const settings = await prisma.siteSettings.update({
    where: { id: 'default' },
    data: translatedData,
  });

  auditLog(req, { action: 'update', entity: 'SiteSettings', entityId: 'default', details: { fields: Object.keys(parsed.data) } });

  res.json({ success: true, data: toPublicSettings(settings) });
}

export async function uploadLogo(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  await getOrCreateSettings();

  const logoPath = `/uploads/${req.file.filename}`;
  const settings = await prisma.siteSettings.update({
    where: { id: 'default' },
    data: { logo: logoPath },
  });

  res.json({ success: true, data: toPublicSettings(settings) });
}

export async function uploadFavicon(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  await getOrCreateSettings();

  const faviconPath = `/uploads/${req.file.filename}`;
  const settings = await prisma.siteSettings.update({
    where: { id: 'default' },
    data: { favicon: faviconPath },
  });

  res.json({ success: true, data: toPublicSettings(settings) });
}

export async function uploadHeroBackground(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  const settings = await getOrCreateSettings();
  const heroSection = (settings.heroSection as any) || {};
  const imagePath = `/uploads/${req.file.filename}`;
  
  const updated = await prisma.siteSettings.update({
    where: { id: 'default' },
    data: { 
      heroSection: { 
        ...heroSection, 
        backgroundImage: imagePath 
      } as any 
    },
  });

  res.json({ success: true, data: toPublicSettings(updated) });
}

// ============================================================
// SECRET MASKING UTILITIES
// ============================================================

function maskSecret(value: string | undefined | null): string {
  if (!value || value.length < 8) return value ? '••••••••' : '';
  return value.slice(0, 4) + '...' + value.slice(-4);
}

function isMasked(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.includes('...');
}

function preserveIfMasked(newVal: string | undefined | null, existingVal: string | undefined | null): string | undefined | null {
  if (isMasked(newVal)) return existingVal;
  return newVal;
}

// ============================================================
// GENERIC SETTINGS GROUP HELPERS
// ============================================================

type SettingsField =
  | 'generalSettings'
  | 'orderSettings'
  | 'reservationSettings'
  | 'mailSettings'
  | 'paymentSettings'
  | 'reviewSettings'
  | 'advancedSettings';

async function getSettingsGroup(field: SettingsField): Promise<Record<string, any>> {
  const settings = await getOrCreateSettings();
  return (settings[field] as Record<string, any>) || {};
}

async function updateSettingsGroup(field: SettingsField, data: Record<string, any>): Promise<Record<string, any>> {
  await getOrCreateSettings();
  const updated = await prisma.siteSettings.update({
    where: { id: 'default' },
    data: { [field]: data },
  });
  return (updated[field] as Record<string, any>) || {};
}

// ============================================================
// ZOD SCHEMAS FOR SETTINGS GROUPS
// ============================================================

const generalSettingsSchema = z.object({
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  timezone: z.string().optional(),
  distanceUnit: z.enum(['km', 'mi']).optional(),
  defaultCurrency: z.string().max(3).optional(),
  currencySymbol: z.string().max(5).optional(),
  currencyPosition: z.enum(['before', 'after']).optional(),
  googleMapsApiKey: z.string().optional(),
  navShowHome: z.boolean().optional(),
  navShowLocations: z.boolean().optional(),
  navShowMenu: z.boolean().optional(),
  navShowReservations: z.boolean().optional(),
  showMembership: z.boolean().optional(),
  permissions: z.record(z.record(z.boolean())).optional(),
  orderStatusMessage: z.string().optional(),
  orderStatusMessageTranslations: z.record(z.string()).optional(),
});

const orderSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  frozenDeliveryEnabled: z.boolean().optional(),
  allowGuestCheckout: z.boolean().optional(),
  minOrderDelivery: z.number().min(0).optional(),
  minOrderPickup: z.number().min(0).optional(),
  minOrderFrozen: z.number().min(0).optional(),
  deliveryLeadTime: z.number().min(0).optional(),
  pickupLeadTime: z.number().min(0).optional(),
  frozenLeadTime: z.number().min(0).optional(),
  frozenDeliveryFee: z.number().min(0).optional(),
  enableFutureOrdering: z.boolean().optional(),
  enableTipping: z.boolean().optional(),
  enableCounterDisplay: z.boolean().optional(),
  tipOptions: z.array(z.number()).optional(),
  preOpeningBuffer: z.number().min(0).optional(),
  postClosingBuffer: z.number().min(0).optional(),
  timeSlotInterval: z.number().min(5).max(120).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  boardLeadTime: z.number().min(0).max(1440).optional(),
  loyaltyEarnRate: z.number().min(0).optional(),
  loyaltyRedeemRate: z.number().min(1).optional(),
  emailNotifications: z.record(z.boolean()).optional(),
});

const reservationSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  timeInterval: z.number().min(1).optional(),
  stayTime: z.number().min(1).optional(),
  maxAdvanceBookingDays: z.number().min(1).optional(),
  minCancellationNoticeHours: z.number().min(0).optional(),
  autoConfirm: z.boolean().optional(),
});

const mailSettingsSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional().or(z.literal('')),
  encryption: z.enum(['none', 'tls', 'ssl']).optional(),
  emailBrandName: z.string().optional(),
  emailHeaderColor: z.string().optional(),
  emailBgColor: z.string().optional(),
});

const paymentSettingsSchema = z.object({
  stripeEnabled: z.boolean().optional(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  paypalEnabled: z.boolean().optional(),
  paypalClientId: z.string().optional(),
  paypalClientSecret: z.string().optional(),
  paypalSandbox: z.boolean().optional(),
  cashEnabled: z.boolean().optional(),
});

const reviewSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  requireOrder: z.boolean().optional(),
  autoApprove: z.boolean().optional(),
  minimumRating: z.number().min(1).max(5).optional(),
});

const advancedSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
  enableRateLimiting: z.boolean().optional(),
  inventorySyncFrequency: z.string().optional(),
  loyaltyRedemptionRules: z.record(z.object({
    isRedeemable: z.boolean(),
    maxRedemptionAmount: z.number(),
  })).optional(),
});

// ============================================================
// GENERAL SETTINGS
// ============================================================

export async function getGeneralSettings(_req: Request, res: Response): Promise<void> {
  const data = await getSettingsGroup('generalSettings');
  res.json({ success: true, data });
}

export async function updateGeneralSettings(req: Request, res: Response): Promise<void> {
  const parsed = generalSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const data = await updateSettingsGroup('generalSettings', parsed.data);
  res.json({ success: true, data });
}

// ============================================================
// ORDER SETTINGS
// ============================================================

export async function getOrderSettings(_req: Request, res: Response): Promise<void> {
  const data = await getSettingsGroup('orderSettings');
  res.json({ success: true, data });
}

export async function updateOrderSettings(req: Request, res: Response): Promise<void> {
  const parsed = orderSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const data = await updateSettingsGroup('orderSettings', parsed.data);
  res.json({ success: true, data });
}

// ============================================================
// RESERVATION SETTINGS
// ============================================================

export async function getReservationSettings(_req: Request, res: Response): Promise<void> {
  const data = await getSettingsGroup('reservationSettings');
  res.json({ success: true, data });
}

export async function updateReservationSettings(req: Request, res: Response): Promise<void> {
  const parsed = reservationSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const data = await updateSettingsGroup('reservationSettings', parsed.data);
  res.json({ success: true, data });
}

// ============================================================
// MAIL SETTINGS
// ============================================================

export async function getMailSettings(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  if (locationId) {
    const advanced = await getSettingsGroup('advancedSettings');
    const overrides = advanced.locationOverrides || {};
    const locationData = overrides[locationId]?.mailSettings || {};
    res.json({
      success: true,
      data: {
        ...locationData,
        smtpPass: maskSecret(locationData.smtpPass),
      },
    });
    return;
  }

  const data = await getSettingsGroup('mailSettings');
  res.json({
    success: true,
    data: {
      ...data,
      smtpPass: maskSecret(data.smtpPass),
    },
  });
}

export async function updateMailSettings(req: Request, res: Response): Promise<void> {
  const parsed = mailSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const locationId = req.query.locationId as string | undefined;
  if (locationId) {
    const advanced = await getSettingsGroup('advancedSettings');
    const overrides = { ...(advanced.locationOverrides || {}) };
    const locationOverride = overrides[locationId] || {};
    const existing = locationOverride.mailSettings || {};
    const mergedData = {
      ...existing,
      ...parsed.data,
      smtpPass: preserveIfMasked(parsed.data.smtpPass, existing.smtpPass),
    };

    overrides[locationId] = {
      ...locationOverride,
      mailSettings: mergedData,
    };

    await updateSettingsGroup('advancedSettings', {
      ...advanced,
      locationOverrides: overrides,
    });

    try {
      const { invalidateMailCache } = await import('../lib/email.js');
      invalidateMailCache();
    } catch (err) {
      console.error('Failed to invalidate mail cache:', err);
    }

    res.json({
      success: true,
      data: { ...mergedData, smtpPass: maskSecret(mergedData.smtpPass) },
    });
    return;
  }

  const existing = await getSettingsGroup('mailSettings');
  const mergedData = {
    ...existing,
    ...parsed.data,
    smtpPass: preserveIfMasked(parsed.data.smtpPass, existing.smtpPass),
  };

  const data = await updateSettingsGroup('mailSettings', mergedData);

  // Invalidate cache immediately for instant updates
  try {
    const { invalidateMailCache } = await import('../lib/email.js');
    invalidateMailCache();
  } catch (err) {
    console.error('Failed to invalidate mail cache:', err);
  }

  res.json({
    success: true,
    data: { ...data, smtpPass: maskSecret(data.smtpPass) },
  });
}

export async function sendTestEmail(req: Request, res: Response): Promise<void> {
  const { to } = req.body;
  if (!to || typeof to !== 'string') {
    res.status(400).json({ success: false, error: 'Recipient email (to) is required' });
    return;
  }

  const locationId = req.query.locationId as string | undefined;
  let mail = await getSettingsGroup('mailSettings');
  if (locationId) {
    const advanced = await getSettingsGroup('advancedSettings');
    const overrides = advanced.locationOverrides || {};
    mail = overrides[locationId]?.mailSettings || mail;
  }
  
  // Use environment variables for sensitive OAuth2 data if available
  const serviceType = process.env.MAIL_SERVICE_TYPE || 'SMTP';
  const oauth2Config = {
    user: mail.smtpUser || process.env.SMTP_USER,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  };

  const host = (mail.smtpHost || process.env.SMTP_HOST || 'localhost').trim();
  const port = mail.smtpPort || parseInt(process.env.SMTP_PORT || '1025');
  const user = (mail.smtpUser || process.env.SMTP_USER || '').trim();
  const pass = (mail.smtpPass || process.env.SMTP_PASS || '').trim();
  const senderName = (mail.senderName || '夏特點餐系統').trim();
  const senderEmail = (mail.senderEmail || 'noreply@shutterorder.com').trim();
  const encryption = (mail.encryption || 'none').trim();

  try {
    let transporter;

    if (serviceType === 'GMAIL_API' && oauth2Config.clientId) {
      // Use Gmail REST API via HTTP (Bypasses SMTP port blocking)
      const getAccessToken = async () => {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: oauth2Config.clientId!,
            client_secret: oauth2Config.clientSecret!,
            refresh_token: oauth2Config.refreshToken!,
            grant_type: 'refresh_token',
          } as any),
        });
        const data = await response.json();
        return data.access_token;
      };

      const accessToken = await getAccessToken();
      const message = [
        `To: ${to}`,
        `Subject: 夏特點餐系統 — 測試信件 (Gmail API)`,
        'Content-Type: text/html; charset=utf-8',
        '',
        '<div style="font-family:sans-serif;padding:20px"><h2>Test Email</h2><p>This was sent via Gmail REST API (HTTP) to bypass SMTP blocking.</p></div>',
      ].join('\r\n');

      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const apiResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${oauth2Config.user}/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      });

      if (!apiResponse.ok) {
        const errData = await apiResponse.json();
        throw new Error(errData.error?.message || 'Gmail API error');
      }

      res.json({ success: true, message: 'Test email sent successfully via Gmail API' });
      return;
    } else if (host.toLowerCase().includes('resend')) {
      // Existing Resend API Fallback...
      const apiResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pass}`,
        },
        body: JSON.stringify({
          from: senderEmail.includes('resend.dev') ? senderEmail : `${senderName} <onboarding@resend.dev>`,
          to: [to],
          subject: '夏特點餐系統 — 測試信件 (via API)',
          html: '<div style="font-family:sans-serif;padding:20px"><h2>Test Email</h2><p>This email was sent via the Resend HTTP API.</p></div>',
        }),
      });

      const apiData = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(apiData.message || 'Resend API error');
      
      res.json({ success: true, message: 'Test email sent successfully via API' });
      return;
    } else {
      // Standard SMTP
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: encryption === 'ssl',
        auth: user ? { user, pass } : undefined,
        ...(encryption === 'tls' ? { requireTLS: true } : {}),
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        family: 0,
      } as any);
    }

    await transporter.sendMail({
      from: `${senderName} <${senderEmail}>`,
      to,
      subject: '夏特點餐系統 — 測試信件',
      html: '<div style="font-family:sans-serif;padding:20px"><h2>Test Email</h2><p>If you received this, your mail settings are configured correctly.</p></div>',
    });

    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (err: any) {
    let message = err.message || 'Failed to send test email';
    if (err.code === 'ETIMEDOUT') message = `Connection timeout: Could not reach ${host}:${port}. This port might be blocked by the environment or the mail provider.`;
    if (err.code === 'ECONNREFUSED') message = 'Connection refused: The SMTP host rejected the connection. Check your host and port.';
    if (err.code === 'EAUTH') message = 'Authentication failed: Check your username and app password.';
    
    res.status(500).json({ success: false, error: message, code: err.code });
  }
}

// ============================================================
// PAYMENT SETTINGS
// ============================================================

export async function getPaymentSettings(_req: Request, res: Response): Promise<void> {
  const data = await getSettingsGroup('paymentSettings');
  res.json({
    success: true,
    data: {
      ...data,
      stripeSecretKey: maskSecret(data.stripeSecretKey),
      stripeWebhookSecret: maskSecret(data.stripeWebhookSecret),
      paypalClientSecret: maskSecret(data.paypalClientSecret),
    },
  });
}

export async function updatePaymentSettings(req: Request, res: Response): Promise<void> {
  const parsed = paymentSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await getSettingsGroup('paymentSettings');
  const mergedData = {
    ...parsed.data,
    stripeSecretKey: preserveIfMasked(parsed.data.stripeSecretKey, existing.stripeSecretKey),
    stripeWebhookSecret: preserveIfMasked(parsed.data.stripeWebhookSecret, existing.stripeWebhookSecret),
    paypalClientSecret: preserveIfMasked(parsed.data.paypalClientSecret, existing.paypalClientSecret),
  };

  const data = await updateSettingsGroup('paymentSettings', mergedData);
  res.json({
    success: true,
    data: {
      ...data,
      stripeSecretKey: maskSecret(data.stripeSecretKey),
      stripeWebhookSecret: maskSecret(data.stripeWebhookSecret),
      paypalClientSecret: maskSecret(data.paypalClientSecret),
    },
  });
}

// ============================================================
// REVIEW SETTINGS
// ============================================================

export async function getReviewSettings(_req: Request, res: Response): Promise<void> {
  const data = await getSettingsGroup('reviewSettings');
  res.json({ success: true, data });
}

export async function updateReviewSettings(req: Request, res: Response): Promise<void> {
  const parsed = reviewSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const data = await updateSettingsGroup('reviewSettings', parsed.data);
  res.json({ success: true, data });
}

// ============================================================
// ADVANCED SETTINGS
// ============================================================

export async function getAdvancedSettings(_req: Request, res: Response): Promise<void> {
  const data = await getSettingsGroup('advancedSettings');
  res.json({ success: true, data });
}

export async function updateAdvancedSettings(req: Request, res: Response): Promise<void> {
  const parsed = advancedSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const existing = await getSettingsGroup('advancedSettings');
  const mergedData = {
    ...existing,
    ...parsed.data,
    loyaltyRedemptionRules: {
      ...(existing.loyaltyRedemptionRules || {}),
      ...(parsed.data.loyaltyRedemptionRules || {}),
    },
  };
  const data = await updateSettingsGroup('advancedSettings', mergedData);
  res.json({ success: true, data });
}
