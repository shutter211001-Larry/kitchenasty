import { PrismaClient } from '@prisma/client';
import { sendEmail, orderConfirmationEmail, orderStatusEmail } from '../lib/email.js';
import { emitNewOrder, emitOrderStatusUpdate } from '../lib/socket.js';
import { guestNames, asapLabels, linePrefixLocales, defaultStatusLocales } from '../constants/locales.js';
// We use dynamic imports for line.controller and ai to avoid circular dependencies if they are controllers

const prisma = new PrismaClient();

export function formatNotificationMessage(template: string, order: any, customer?: any, timezone?: string) {
  const userLang = order.language || 'zh-TW';
  
  const userName = customer?.name || order.guestName || guestNames[userLang] || guestNames['en'];
  const orderNumber = `#${order.orderNumber}`;
  
  const itemsList = order.items?.map((i: any) => {
    let itemName = i.name;
    if (userLang !== 'zh-TW' && i.menuItem?.nameTranslations) {
      try {
        const trans = typeof i.menuItem.nameTranslations === 'string'
          ? JSON.parse(i.menuItem.nameTranslations)
          : i.menuItem.nameTranslations;
        if (trans && trans[userLang]) {
          itemName = trans[userLang];
        }
      } catch (e) {}
    }
    return `${itemName} x${i.quantity}`;
  }).join(', ') || '';

  const pickupTime = order.scheduledAt 
    ? new Date(order.scheduledAt).toLocaleString(
        userLang === 'zh-TW' ? 'zh-TW' : 
        userLang === 'ko' ? 'ko-KR' : 
        userLang === 'ja' ? 'ja-JP' : 
        userLang === 'de' ? 'de-DE' :
        userLang === 'es' ? 'es-ES' :
        userLang === 'fr' ? 'fr-FR' :
        userLang === 'id' ? 'id-ID' :
        userLang === 'it' ? 'it-IT' :
        userLang === 'pt' ? 'pt-PT' :
        userLang === 'th' ? 'th-TH' :
        userLang === 'tl' ? 'fil-PH' :
        userLang === 'vi' ? 'vi-VN' : 'en-US', 
        { timeZone: timezone || 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      )
    : (asapLabels[userLang] || asapLabels['en']);

  return template
    .replace(/{使用者}/g, userName)
    .replace(/{訂單編號}/g, orderNumber)
    .replace(/{餐點內容}/g, itemsList)
    .replace(/{取餐時間\/做好馬上取}/g, pickupTime);
}

export class NotificationService {
  /**
   * Sends new order notifications via Email, LINE, and Socket
   */
  static async notifyNewOrder(order: any, customerId?: string, guestEmail?: string) {
    const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;
    const recipientEmail = customer?.email || guestEmail;
    
    // 1. Send Email
    if (recipientEmail) {
      let shouldSendEmail = true;
      try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        const orderSettings = (settings?.orderSettings as any) || {};
        const notifications = orderSettings.emailNotifications || {};
        if (notifications['PLACED'] === false) {
          shouldSendEmail = false;
        }
        
        if (customer && customer.emailNotificationsEnabled === false) {
          shouldSendEmail = false;
        }
      } catch (e) {}
  
      if (shouldSendEmail) {
        const orderLang = order.language || 'zh-TW';
        const emailContent = orderConfirmationEmail({
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          total: order.total,
          items: order.items.map((i: any) => {
            let itemName = i.name;
            if (orderLang !== 'zh-TW' && i.menuItem?.nameTranslations) {
              try {
                const trans = typeof i.menuItem.nameTranslations === 'string'
                  ? JSON.parse(i.menuItem.nameTranslations)
                  : i.menuItem.nameTranslations;
                if (trans && trans[orderLang]) itemName = trans[orderLang];
              } catch (e) {}
            }
            return { name: itemName, quantity: i.quantity, subtotal: i.subtotal };
          }),
        }, orderLang);
  
        sendEmail({
          to: recipientEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          locationId: order.locationId,
        }).catch(err => console.error('[NotificationService] Email error:', err));
      }
    }
  
    // 2. Send LINE Push
    if (customer?.lineUserId && customer.lineNotificationsEnabled !== false) {
      try {
        const { sendLinePush } = await import('../controllers/line.controller.js');
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        const lineSettings = (settings?.lineSettings as any) || {};
        const generalSettings = (settings?.generalSettings as any) || {};
        const timezone = generalSettings.timezone || 'Asia/Taipei';
        const lineNotifications = lineSettings.notifications || {};
        
        const isEnabled = lineNotifications['PLACED']?.enabled !== false;
        const orderLang = order.language || 'zh-TW';
        const langKey = defaultStatusLocales[orderLang] ? orderLang : 'en';
  
        const customConfig = lineNotifications['PLACED'];
        let template = '';
        let isPreTranslated = false;
  
        if (customConfig) {
          if (langKey === 'zh-TW') {
            template = customConfig.message || '';
            isPreTranslated = true;
          } else if (customConfig.translations?.[langKey]) {
            template = customConfig.translations[langKey];
            isPreTranslated = true;
          } else if (customConfig.message) {
            template = customConfig.message;
          }
        }
  
        if (!template) {
          template = defaultStatusLocales[langKey]['PLACED'];
          isPreTranslated = true;
        }
  
        if (isEnabled && template) {
          const formattedMessage = formatNotificationMessage(template, order, customer, timezone);
          const prefixObj = linePrefixLocales[langKey] || linePrefixLocales['en'];
          const prefix = prefixObj.placed;
          
          let lineMessage = `${prefix}\n${prefixObj.orderNumber}：#${order.orderNumber}\n${prefixObj.total}：$${order.total.toFixed(2)}\n${formattedMessage}`;
  
          if (!isPreTranslated && customConfig?.message) {
            try {
              const { translateContent } = await import('../lib/ai.js');
              const rawMessageToTranslate = `${prefix}\n${prefixObj.total}：$${order.total.toFixed(2)}\n${formattedMessage}`;
              const transResult = await translateContent(rawMessageToTranslate, [orderLang], 'Traditional Chinese');
              if (transResult && transResult[orderLang]) {
                lineMessage = `${prefix}\n${prefixObj.orderNumber}：#${order.orderNumber}\n${transResult[orderLang]}`;
              }
            } catch (err) {
              console.error('[AI Translation] LINE placed order dynamic translation fallback failed:', err);
            }
          }
  
          sendLinePush(customer.lineUserId, lineMessage).catch(() => {});
        }
      } catch (err) {
        console.error('[NotificationService] LINE notify error:', err);
      }
    }
  
    // 3. Socket / UI events
    emitNewOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      locationId: order.locationId,
      paymentStatus: order.paymentStatus,
      tenantId: order.tenantId,
    });
  
    try {
      const { appEvents } = await import('../lib/events.js');
      appEvents.emit('order.created', { order });
    } catch {}
  }
}
