import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import prisma from './db.js';
import { emailLogger } from './logger.js';

let cachedTransporter: Transporter | null = null;
let cachedFrom: string = '';
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getMailConfig(locationId?: string | null): Promise<{ transporter: Transporter; from: string }> {
  const now = Date.now();
  if (!locationId && cachedTransporter && now < cacheExpiry) {
    return { transporter: cachedTransporter, from: cachedFrom };
  }

  let host = process.env.SMTP_HOST || 'localhost';
  let port = parseInt(process.env.SMTP_PORT || '1025');
  let secure = false;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let senderName = '夏特點餐系統';
  let senderEmail = 'noreply@shutterorder.com';
  let requireTLS = false;

  let googleSettings: any = {};
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    googleSettings = settings?.googleSettings || {};
    if (typeof googleSettings === 'string') googleSettings = JSON.parse(googleSettings);
    
    let mail = (settings?.mailSettings as Record<string, any>) || {};

    if (locationId) {
      const advanced = (settings?.advancedSettings as Record<string, any>) || {};
      const overrides = advanced.locationOverrides || {};
      if (overrides[locationId]?.mailSettings) {
        mail = overrides[locationId].mailSettings;
      }
    }

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

  const gmailClientId = googleSettings.gmailClientId || process.env.GOOGLE_CLIENT_ID;
  const gmailClientSecret = googleSettings.gmailClientSecret || process.env.GOOGLE_CLIENT_SECRET;
  const gmailRefreshToken = googleSettings.gmailRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;

  let transporter: Transporter;

  if (serviceType === 'GMAIL_API' && gmailClientId) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: user || process.env.SMTP_USER,
        clientId: gmailClientId,
        clientSecret: gmailClientSecret,
        refreshToken: gmailRefreshToken,
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

  if (!locationId) {
    cachedTransporter = transporter;
    cachedFrom = from;
    cacheExpiry = now + CACHE_TTL;
  }

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

  let emailBrandName = '夏特點餐系統';
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
  locationId?: string | null;
  system?: string;
}

/**
 * Sends an email using the configured service (Gmail API, Mailgun, or SMTP).
 * Optimized to be truly non-blocking.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;
  if (options.to && options.to.endsWith('@line.shutterorder.com')) return;

  // Run in a self-contained async block to avoid blocking the caller's thread
  (async () => {
    try {
      const serviceType = process.env.MAIL_SERVICE_TYPE || 'GMAIL_API';

      // Load custom branding details and process HTML template
      let finalHtml = options.html;
      let erpBranding: any = null;
      try {
        let branding;
        if (options.system === 'ERP') {
          const { prisma: shutterErpPrisma } = await import('../shutter-erp/lib/prisma.js');
          const setting = await shutterErpPrisma.systemSetting.findUnique({ where: { key: 'mailBranding' } });
          erpBranding = setting?.value || {
            senderName: '夏特 ERP 系統',
            senderEmail: 'noreply@shutterorder.com',
            emailBrandName: '夏特 ERP 系統',
            emailHeaderColor: '#3b82f6',
            emailBgColor: '#f3f4f6'
          };
          branding = {
            emailBrandName: erpBranding.emailBrandName,
            emailHeaderColor: erpBranding.emailHeaderColor,
            emailBgColor: erpBranding.emailBgColor
          };
        } else {
          branding = await getMailBranding();
        }
        
        finalHtml = finalHtml.replace(/Shutter/g, branding.emailBrandName).replace(/夏特點餐系統/g, branding.emailBrandName);
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

      const brandedOptions = { ...options, html: finalHtml } as EmailOptions & { erpBranding?: any };
      if (erpBranding) {
        brandedOptions.erpBranding = erpBranding;
      }

      if (serviceType === 'MAILGUN' && process.env.MAILGUN_API_KEY) {
        await sendMailgunEmail(brandedOptions);
      } else if (serviceType === 'GMAIL_API' && process.env.GOOGLE_CLIENT_ID) {
        await sendGmailApiEmail(brandedOptions);
      } else {
        // Fallback to traditional SMTP
        let { transporter, from } = await getMailConfig(options.locationId);
        if (erpBranding) {
          from = `${erpBranding.senderName} <${erpBranding.senderEmail}>`;
        }
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

async function sendMailgunEmail(options: EmailOptions & { erpBranding?: any }) {
  const domain = process.env.MAILGUN_DOMAIN;
  const apiKey = process.env.MAILGUN_API_KEY;
  if (!domain || !apiKey) throw new Error('Mailgun config missing');

  const auth = Buffer.from(`api:${apiKey}`).toString('base64');
  let from = process.env.EMAIL_FROM || `夏特點餐系統 <noreply@${domain}>`;
  if (options.erpBranding) {
    from = `${options.erpBranding.senderName} <${options.erpBranding.senderEmail}>`;
  }

  const body = new URLSearchParams({
    from,
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

function encodeMimeHeader(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?utf-8?B?${Buffer.from(value).toString('base64')}?=`;
}

function encodeFromHeader(fromStr: string): string {
  const match = fromStr.match(/^(.*?)\s*<(.*?)>$/);
  if (match) {
    const displayName = match[1];
    const email = match[2];
    return `${encodeMimeHeader(displayName)} <${email}>`;
  }
  return encodeMimeHeader(fromStr);
}

async function sendGmailApiEmail(options: EmailOptions & { erpBranding?: any }) {
  let googleSettings: any = {};
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    googleSettings = settings?.googleSettings || {};
    if (typeof googleSettings === 'string') googleSettings = JSON.parse(googleSettings);
  } catch {}

  const gmailClientId = googleSettings.gmailClientId || process.env.GOOGLE_CLIENT_ID;
  const gmailClientSecret = googleSettings.gmailClientSecret || process.env.GOOGLE_CLIENT_SECRET;
  const gmailRefreshToken = googleSettings.gmailRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;

  // Get Access Token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: gmailClientId!,
      client_secret: gmailClientSecret!,
      refresh_token: gmailRefreshToken!,
      grant_type: 'refresh_token',
    }),
  });
  
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`Gmail OAuth error: ${tokenData.error_description || 'Unknown'}`);
  
  const accessToken = tokenData.access_token;

  // Construct MIME Message
  let from = process.env.EMAIL_FROM || '夏特點餐系統 <noreply@shutterorder.com>';
  if (options.erpBranding) {
    from = `${options.erpBranding.senderName} <${options.erpBranding.senderEmail}>`;
  }
  const encodedFrom = encodeFromHeader(from);
  const encodedSubject = encodeMimeHeader(options.subject);

  const message = [
    `From: ${encodedFrom}`,
    `To: ${options.to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
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

// Email Templates Localizations
const confirmationLocales: Record<string, any> = {
  'zh-TW': {
    subject: '點餐成功 - #',
    header: '夏特點餐系統',
    title: '點餐成功！',
    thankYou: '感謝您的訂購。您的訂單編號為 #',
    type: '類型',
    item: '品項',
    price: '價格',
    total: '總計',
    footer: '我們將在訂單狀態更新時通知您。',
    types: {
      DELIVERY: '外送',
      PICKUP: '自取'
    }
  },
  'ko': {
    subject: '주문 확인 - #',
    header: '샤트 주문 시스템',
    title: '주문 완료!',
    thankYou: '주문해 주셔서 감사합니다. 주문 번호는 #',
    type: '유형',
    item: '메뉴',
    price: '가격',
    total: '합계',
    footer: '주문 상태가 변경되면 알려드리겠습니다.',
    types: {
      DELIVERY: '배달',
      PICKUP: '포장'
    }
  },
  'en': {
    subject: 'Order Confirmed - #',
    header: 'Shutter Order System',
    title: 'Order Confirmed!',
    thankYou: 'Thank you for your order. Your order number is #',
    type: 'Type',
    item: 'Item',
    price: 'Price',
    total: 'Total',
    footer: "We'll notify you when your order status changes.",
    types: {
      DELIVERY: 'Delivery',
      PICKUP: 'Pickup'
    }
  },
  'ja': {
    subject: 'ご注文の確認 - #',
    header: 'シャト注文システム',
    title: 'ご注文完了！',
    thankYou: 'ご注文ありがとうございます。ご注文番号は #',
    type: '受け取り方法',
    item: '商品',
    price: '価格',
    total: '合計',
    footer: '注文ステータスが変更された際にお知らせいたします。',
    types: {
      DELIVERY: '配達',
      PICKUP: 'お持ち帰り'
    }
  }
};

const statusLocales: Record<string, any> = {
  'zh-TW': {
    subject: '訂單 #{{number}} 狀態更新 - {{status}}',
    header: '夏特點餐系統',
    title: '訂單狀態更新',
    label: '訂單',
    statuses: {
      PENDING: '待處理',
      CONFIRMED: '已確認',
      PREPARING: '製作中',
      READY: '可取餐',
      OUT_FOR_DELIVERY: '外送中',
      DELIVERED: '已送達',
      PICKED_UP: '已取餐',
      CANCELLED: '已取消'
    },
    messages: {
      CONFIRMED: '您的訂單已確認，我們將盡快為您準備。',
      PREPARING: '您的餐點正在製作中！',
      READY: '🎉 您的訂單已準備就緒！歡迎前往取貨。',
      OUT_FOR_DELIVERY: '🚀 您的訂單已由外送員取走，正在前往您的地址！',
      DELIVERED: '🍽️ 您的餐點已送達，祝您用餐愉快！',
      PICKED_UP: '🍽️ 您的餐點已取餐，祝您用餐愉快！',
      CANCELLED: '您的訂單已被取消。如有任何疑問，請聯繫我們。'
    },
    defaultMessage: '您的訂單狀態已更新。'
  },
  'ko': {
    subject: '주문 #{{number}} 상태 업데이트 - {{status}}',
    header: '샤트 주문 시스템',
    title: '주문 상태 업데이트',
    label: '주문',
    statuses: {
      PENDING: '대기 중',
      CONFIRMED: '확인됨',
      PREPARING: '준비 중',
      READY: '픽업 가능',
      OUT_FOR_DELIVERY: '배달 중',
      DELIVERED: '배달 완료',
      PICKED_UP: '픽업 완료',
      CANCELLED: '주문 취소됨'
    },
    messages: {
      CONFIRMED: '주문이 확인되었으며 최대한 빨리 준비하겠습니다.',
      PREPARING: '음식을 준비하고 있습니다!',
      READY: '🎉 주문하신 음식이 준비되었습니다! 수령해 가시기 바랍니다.',
      OUT_FOR_DELIVERY: '🚀 주문하신 음식을 배달원이 픽업하여 배송 중입니다!',
      DELIVERED: '🍽️ 음식이 배달되었습니다. 맛있게 드세요!',
      PICKED_UP: '🍽️ 주문하신 음식을 픽업하셨습니다. 맛있게 드세요!',
      CANCELLED: '주문이 취소되었습니다. 문의 사항이 있으시면 연락 주시기 바랍니다.'
    },
    defaultMessage: '주문 상태가 업데이트되었습니다.'
  },
  'en': {
    subject: 'Order #{{number}} Status Update - {{status}}',
    header: 'Shutter Order System',
    title: 'Order Status Update',
    label: 'Order',
    statuses: {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      PREPARING: 'Preparing',
      READY: 'Ready for Pickup',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Delivered',
      PICKED_UP: 'Picked Up',
      CANCELLED: 'Cancelled'
    },
    messages: {
      CONFIRMED: 'Your order has been confirmed and we will prepare it as soon as possible.',
      PREPARING: 'Your food is being prepared!',
      READY: '🎉 Your order is ready! Welcome to pick it up.',
      OUT_FOR_DELIVERY: '🚀 Your order has been picked up by the courier and is on its way to your address!',
      DELIVERED: '🍽️ Your meal has been delivered. Enjoy your meal!',
      PICKED_UP: '🍽️ Your order has been picked up. Enjoy your meal!',
      CANCELLED: 'Your order has been cancelled. If you have any questions, please contact us.'
    },
    defaultMessage: 'Your order status has been updated.'
  },
  'ja': {
    subject: 'ご注文 #{{number}} ステータス更新 - {{status}}',
    header: 'シャト注文システム',
    title: 'ご注文状況の更新',
    label: 'ご注文',
    statuses: {
      PENDING: '保留中',
      CONFIRMED: '確認済み',
      PREPARING: '準備中',
      READY: '受取可能',
      OUT_FOR_DELIVERY: '配達中',
      DELIVERED: '配達済み',
      PICKED_UP: '受取済み',
      CANCELLED: 'キャンセル済み'
    },
    messages: {
      CONFIRMED: 'ご注文が確認されました。できるだけ早くご用意いたします。',
      PREPARING: 'お料理を準備しております！',
      READY: '🎉 ご注文の準備ができました！お受け取りにお越しください。',
      OUT_FOR_DELIVERY: '🚀 配達員が商品を受け取り、お届け先へ向かっています！',
      DELIVERED: '🍽️ お届けが完了しました。どうぞお召し上がりください！',
      PICKED_UP: '🍽️ 商品をお受け取りいただきました。どうぞお召し上がりください！',
      CANCELLED: 'ご注文がキャンセルされました。ご不明な点がございましたら、お問い合わせください。'
    },
    defaultMessage: 'ご注文状況が更新されました。'
  }
};

export function orderConfirmationEmail(
  order: {
    orderNumber: string;
    orderType: string;
    total: number;
    items: { name: string; quantity: number; subtotal: number }[];
  },
  language: string = 'zh-TW'
): { subject: string; html: string } {
  const langKey = confirmationLocales[language] ? language : 'en';
  const loc = confirmationLocales[langKey];
  const typeText = loc.types[order.orderType] || order.orderType;

  const itemRows = order.items.map((i) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.quantity}x ${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${i.subtotal.toFixed(2)}</td></tr>`
  ).join('');

  return {
    subject: `${loc.subject}${order.orderNumber}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
        <div style="background:#f97316;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">${loc.header}</h1>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px">${loc.title}</h2>
          <p style="color:#6b7280;margin:0 0 16px">${loc.thankYou}<strong>${order.orderNumber}</strong>.</p>
          <p style="margin:0 0 16px">${loc.type}: <strong>${typeText}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead><tr><th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">${loc.item}</th><th style="padding:8px;text-align:right;border-bottom:2px solid #e5e7eb">${loc.price}</th></tr></thead>
            <tbody>${itemRows}</tbody>
            <tfoot><tr><td style="padding:8px;font-weight:bold">${loc.total}</td><td style="padding:8px;text-align:right;font-weight:bold;color:#f97316">$${order.total.toFixed(2)}</td></tr></tfoot>
          </table>
          <p style="color:#6b7280;font-size:14px">${loc.footer}</p>
        </div>
      </div>
    `,
  };
}

export function orderStatusEmail(
  order: {
    orderNumber: string;
    status: string;
  },
  messageText?: string,
  language: string = 'zh-TW'
): { subject: string; html: string } {
  const langKey = statusLocales[language] ? language : 'en';
  const loc = statusLocales[langKey];

  const translatedStatus = loc.statuses[order.status] || order.status.replace(/_/g, ' ');
  const displayMessage = messageText || loc.messages[order.status] || loc.defaultMessage;

  const finalSubject = loc.subject
    .replace('{{number}}', order.orderNumber)
    .replace('{{status}}', translatedStatus);

  return {
    subject: finalSubject,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
        <div style="background:#f97316;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">${loc.header}</h1>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px">${loc.title}</h2>
          <p style="color:#6b7280;margin:0 0 16px">${loc.label} <strong>#${order.orderNumber}</strong></p>
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin-bottom:16px">
            <p style="margin:0;font-size:18px;font-weight:bold">${translatedStatus}</p>
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
    subject: '邀請您加入 夏特點餐系統 團隊',
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
        <div style="background:#f97316;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">夏特點餐系統</h1>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px">您收到了邀請！</h2>
          <p style="color:#6b7280;margin:0 0 16px">您已被邀請加入 夏特點餐系統 團隊，職位為：<strong>${roleLabels[invite.role] || invite.role}</strong>。</p>
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
          <h1 style="margin:0;font-size:24px">夏特點餐系統</h1>
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

export const passwordResetEmail = ({ email, resetLink }: { email: string; resetLink: string }) => {
  return {
    subject: '重置密碼通知',
    text: `您好，\n\n您收到這封信是因為我們收到了重置您帳號密碼的請求。\n\n請點擊以下連結重置密碼：\n${resetLink}\n\n如果這不是您本人的操作，請忽略此信件。\n\n謝謝！`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>重置密碼通知</h2>
        <p>您好，</p>
        <p>您收到這封信是因為我們收到了重置您帳號密碼的請求。</p>
        <p>請點擊以下連結重置密碼：</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: #fff; text-decoration: none; border-radius: 5px;">重置密碼</a>
        <p>如果這不是您本人的操作，請忽略此信件。</p>
        <p>謝謝！</p>
      </div>
    `
  };
};

export const staffPasswordResetEmail = ({ email, resetLink }: { email: string; resetLink: string }) => {
  return {
    subject: 'POS 系統重置密碼通知',
    text: `您好，\n\n您收到這封信是因為我們收到了重置您 POS 帳號密碼的請求。\n\n請點擊以下連結重置密碼：\n${resetLink}\n\n如果這不是您本人的操作，請忽略此信件。\n\n謝謝！`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>POS 系統重置密碼通知</h2>
        <p>您好，</p>
        <p>您收到這封信是因為我們收到了重置您 POS 帳號密碼的請求。</p>
        <p>請點擊以下連結重置密碼：</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: #fff; text-decoration: none; border-radius: 5px;">重置密碼</a>
        <p>如果這不是您本人的操作，請忽略此信件。</p>
        <p>謝謝！</p>
      </div>
    `
  };
};

export const erpInviteEmail = ({ email, inviteLink }: { email: string; inviteLink: string }) => {
  return {
    subject: '邀請您加入 ERP 系統',
    text: `您好，\n\n管理員邀請您加入 ERP 系統。\n\n請點擊以下連結開通您的帳號並設定密碼：\n${inviteLink}\n\n如果這不是您本人的操作，請忽略此信件。\n\n謝謝！`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>邀請您加入 ERP 系統</h2>
        <p>您好，</p>
        <p>管理員邀請您加入 ERP 系統。</p>
        <p>請點擊以下連結開通您的帳號並設定密碼：</p>
        <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: #fff; text-decoration: none; border-radius: 5px;">接受邀請並開通帳號</a>
        <p>如果這不是您本人的操作，請忽略此信件。</p>
        <p>謝謝！</p>
      </div>
    `
  };
};
