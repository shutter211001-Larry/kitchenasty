import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import prisma from './db.js';
import { emailLogger } from './logger.js';

let cachedTransporter: Transporter | null = null;
let cachedFrom: string = '';
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getMailConfig(): Promise<{ transporter: Transporter; from: string }> {
  const now = Date.now();
  if (cachedTransporter && now < cacheExpiry) {
    return { transporter: cachedTransporter, from: cachedFrom };
  }

  let host = process.env.SMTP_HOST || 'localhost';
  let port = parseInt(process.env.SMTP_PORT || '1025');
  let secure = false;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let senderName = 'KitchenAsty';
  let senderEmail = 'noreply@kitchenasty.com';
  let requireTLS = false;

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const mail = (settings?.mailSettings as Record<string, any>) || {};
    if (mail.smtpHost) host = mail.smtpHost;
    if (mail.smtpPort) port = mail.smtpPort;
    if (mail.smtpUser) user = mail.smtpUser;
    if (mail.smtpPass) pass = mail.smtpPass;
    if (mail.senderName) senderName = mail.senderName;
    if (mail.senderEmail) senderEmail = mail.senderEmail;
    if (mail.encryption === 'ssl') secure = true;
    if (mail.encryption === 'tls') requireTLS = true;
  } catch {
    // DB unavailable — fall back to env vars
  }

  const from = process.env.EMAIL_FROM || `${senderName} <${senderEmail}>`;
  const serviceType = process.env.MAIL_SERVICE_TYPE || 'SMTP';

  let transporter: Transporter;

  if (serviceType === 'GMAIL_API' && process.env.GOOGLE_CLIENT_ID) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: user || process.env.SMTP_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      ...(requireTLS ? { requireTLS: true } : {}),
      connectionTimeout: 15000,
      family: 0,
    } as any);
  }

  cachedTransporter = transporter;
  cachedFrom = from;
  cacheExpiry = now + CACHE_TTL;

  return { transporter, from };
}

export function invalidateMailCache(): void {
  cachedTransporter = null;
  cacheExpiry = 0;
  cachedMailBranding = null;
  brandingCacheExpiry = 0;
}

let cachedMailBranding: {
  emailBrandName: string;
  emailHeaderColor: string;
  emailBgColor: string;
} | null = null;
let brandingCacheExpiry = 0;

export async function getMailBranding(): Promise<{
  emailBrandName: string;
  emailHeaderColor: string;
  emailBgColor: string;
}> {
  const now = Date.now();
  if (cachedMailBranding && now < brandingCacheExpiry) {
    return cachedMailBranding;
  }

  let emailBrandName = 'KitchenAsty';
  let emailHeaderColor = '#f97316';
  let emailBgColor = '#f3f4f6';

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const mail = (settings?.mailSettings as Record<string, any>) || {};
    if (mail.emailBrandName) emailBrandName = mail.emailBrandName;
    if (mail.emailHeaderColor) emailHeaderColor = mail.emailHeaderColor;
    if (mail.emailBgColor) emailBgColor = mail.emailBgColor;
  } catch {}

  cachedMailBranding = { emailBrandName, emailHeaderColor, emailBgColor };
  brandingCacheExpiry = now + 5 * 60 * 1000; // 5 minutes
  return cachedMailBranding;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends an email using the configured service (Gmail API, Mailgun, or SMTP).
 * Optimized to be truly non-blocking.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  if (options.to && options.to.endsWith('@line.pizzastudio.com')) return;

  // Run in a self-contained async block to avoid blocking the caller's thread
  (async () => {
    try {
      const serviceType = process.env.MAIL_SERVICE_TYPE || 'GMAIL_API';

      // Load custom branding details and process HTML template
      let finalHtml = options.html;
      try {
        const branding = await getMailBranding();
        finalHtml = finalHtml.replace(/KitchenAsty/g, branding.emailBrandName);
        finalHtml = finalHtml.replace(/#f97316/g, branding.emailHeaderColor);
        // Wrap with the custom email outer background color
        finalHtml = `
          <div style="background-color:${branding.emailBgColor};padding:40px 20px;min-height:100%;font-family:sans-serif">
            ${finalHtml}
          </div>
        `;
      } catch (e) {
        console.error('[Mail Branding] Failed to apply custom styling properties:', e);
      }

      const brandedOptions = { ...options, html: finalHtml };

      if (serviceType === 'MAILGUN' && process.env.MAILGUN_API_KEY) {
        await sendMailgunEmail(brandedOptions);
      } else if (serviceType === 'GMAIL_API' && process.env.GOOGLE_CLIENT_ID) {
        await sendGmailApiEmail(brandedOptions);
      } else {
        // Fallback to traditional SMTP
        const { transporter, from } = await getMailConfig();
        await transporter.sendMail({
          from,
          to: brandedOptions.to,
          subject: brandedOptions.subject,
          html: brandedOptions.html,
          text: brandedOptions.text,
        });
      }
    } catch (err) {
      emailLogger.error({ err, options }, 'Background email sending failed');
    }
  })();
}

async function sendMailgunEmail(options: EmailOptions) {
  const domain = process.env.MAILGUN_DOMAIN;
  const apiKey = process.env.MAILGUN_API_KEY;
  if (!domain || !apiKey) throw new Error('Mailgun config missing');

  const auth = Buffer.from(`api:${apiKey}`).toString('base64');
  const body = new URLSearchParams({
    from: process.env.EMAIL_FROM || `KitchenAsty <noreply@${domain}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(`Mailgun error: ${errData.message || res.statusText}`);
  }
}

async function sendGmailApiEmail(options: EmailOptions) {
  // Get Access Token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`Gmail OAuth error: ${tokenData.error_description || 'Unknown'}`);
  
  const accessToken = tokenData.access_token;

  // Construct MIME Message
  const from = process.env.EMAIL_FROM || 'KitchenAsty <noreply@kitchenasty.com>';
  const message = [
    `From: ${from}`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    options.html,
  ].join('\r\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const user = process.env.SMTP_USER || 'me';
  const apiRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${user}/messages/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!apiRes.ok) {
    const errData = await apiRes.json();
    throw new Error(errData.error?.message || 'Gmail API error');
  }
}

// Email Templates
export function orderConfirmationEmail(order: {
  orderNumber: string;
  orderType: string;
  total: number;
  items: { name: string; quantity: number; subtotal: number }[];
}): { subject: string; html: string } {
  const itemRows = order.items.map((i) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.quantity}x ${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${i.subtotal.toFixed(2)}</td></tr>`
  ).join('');

  return {
    subject: `Order Confirmed - #${order.orderNumber}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
        <div style="background:#f97316;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">KitchenAsty</h1>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px">Order Confirmed!</h2>
          <p style="color:#6b7280;margin:0 0 16px">Thank you for your order <strong>#${order.orderNumber}</strong>.</p>
          <p style="margin:0 0 16px">Type: <strong>${order.orderType}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead><tr><th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Item</th><th style="padding:8px;text-align:right;border-bottom:2px solid #e5e7eb">Price</th></tr></thead>
            <tbody>${itemRows}</tbody>
            <tfoot><tr><td style="padding:8px;font-weight:bold">Total</td><td style="padding:8px;text-align:right;font-weight:bold;color:#f97316">$${order.total.toFixed(2)}</td></tr></tfoot>
          </table>
          <p style="color:#6b7280;font-size:14px">We'll notify you when your order status changes.</p>
        </div>
      </div>
    `,
  };
}

export function orderStatusEmail(order: {
  orderNumber: string;
  status: string;
}, messageText?: string): { subject: string; html: string } {
  const statusMessages: Record<string, string> = {
    CONFIRMED: '您的訂單已確認，我們將盡快為您準備。',
    PREPARING: '您的餐點正在製作中！',
    READY: '🎉 您的訂單已準備就緒！歡迎前往取貨。',
    OUT_FOR_DELIVERY: '🚀 您的訂單已由外送員取走，正在前往您的地址！',
    DELIVERED: '🍽️ 您的餐點已送達，祝您用餐愉快！',
    PICKED_UP: '🍽️ 您的餐點已取餐，祝您用餐愉快！',
    CANCELLED: '您的訂單已被取消。如有任何疑問，請聯繫我們。',
  };

  const statusChineseMap: Record<string, string> = {
    PENDING: '待處理',
    CONFIRMED: '已確認',
    PREPARING: '製作中',
    READY: '可取餐',
    OUT_FOR_DELIVERY: '外送中',
    DELIVERED: '已送達',
    PICKED_UP: '已取餐',
    CANCELLED: '已取消',
  };

  const chineseStatus = statusChineseMap[order.status] || order.status.replace(/_/g, ' ');
  const displayMessage = messageText || statusMessages[order.status] || '您的訂單狀態已更新。';

  return {
    subject: `訂單 #${order.orderNumber} 狀態更新 - ${chineseStatus}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
        <div style="background:#f97316;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">KitchenAsty</h1>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px">訂單狀態更新</h2>
          <p style="color:#6b7280;margin:0 0 16px">訂單 <strong>#${order.orderNumber}</strong></p>
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin-bottom:16px">
            <p style="margin:0;font-size:18px;font-weight:bold">${chineseStatus}</p>
            <p style="margin:8px 0 0;color:#374151;white-space:pre-wrap;line-height:1.6">${displayMessage}</p>
          </div>
        </div>
      </div>
    `,
  };
}

export function staffInvitationEmail(invite: {
  email: string;
  role: string;
  inviteLink: string;
}): { subject: string; html: string } {
  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: '超級管理員',
    MANAGER: '店經理',
    STAFF: '店員',
  };

  return {
    subject: '邀請您加入 KitchenAsty 團隊',
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
        <div style="background:#f97316;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">KitchenAsty</h1>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px">您收到了邀請！</h2>
          <p style="color:#6b7280;margin:0 0 16px">您已被邀請加入 KitchenAsty 團隊，職位為：<strong>${roleLabels[invite.role] || invite.role}</strong>。</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${invite.inviteLink}" style="display:inline-block;background:#f97316;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">接受邀請</a>
          </div>
          <p style="color:#6b7280;font-size:14px">此邀請連結將在 7 天後過期。如果您沒有預期收到此邀請，請直接忽略此郵件。</p>
        </div>
      </div>
    `,
  };
}

export function reservationConfirmationEmail(reservation: {
  date: string;
  time: string;
  partySize: number;
  locationName: string;
}): { subject: string; html: string } {
  return {
    subject: `Reservation Confirmed - ${reservation.locationName}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
        <div style="background:#f97316;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">KitchenAsty</h1>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 16px">Reservation Confirmed!</h2>
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin-bottom:16px">
            <p style="margin:0 0 8px"><strong>Location:</strong> ${reservation.locationName}</p>
            <p style="margin:0 0 8px"><strong>Date:</strong> ${reservation.date}</p>
            <p style="margin:0 0 8px"><strong>Time:</strong> ${reservation.time}</p>
            <p style="margin:0"><strong>Party Size:</strong> ${reservation.partySize} guests</p>
          </div>
          <p style="color:#6b7280;font-size:14px">We look forward to seeing you!</p>
        </div>
      </div>
    `,
  };
}
