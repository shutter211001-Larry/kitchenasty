import { Request, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/db.js';
import { 
  OrderStatus, 
  OrderType, 
  Prisma, 
  ReservationStatus,
  PaymentStatus,
  PaymentMethod
} from '@prisma/client';
import { emitNewOrder, emitOrderStatusUpdate, getIO } from '../lib/socket.js';
import { isPointInPolygon } from '../lib/geo.js';
import { calculateDistance } from '../lib/geo.js';
import { sendEmail, orderConfirmationEmail, orderStatusEmail } from '../lib/email.js';
import { auditLog } from '../lib/audit.js';
import { validateAndCalculateDiscount, findAndApplyBestAutomaticDiscount } from '../lib/discount-engine.js';

// ============================================================
// HELPERS
// ============================================================

function formatNotificationMessage(template: string, order: any, customer?: any, timezone?: string) {
  const userLang = order.language || 'zh-TW';
  
  const guestNames: Record<string, string> = {
    'zh-TW': '顧客',
    'ko': '고객',
    'ja': 'お客様',
    'en': 'Guest',
    'de': 'Gast',
    'es': 'Invitado',
    'fr': 'Invité',
    'id': 'Pelanggan',
    'it': 'Ospite',
    'pt': 'Cliente',
    'th': 'ลูกค้า',
    'tl': 'Kustomer',
    'vi': 'Khách hàng'
  };
  
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

  const asapLabels: Record<string, string> = {
    'zh-TW': '做好馬上取',
    'ko': '바로 픽업',
    'ja': 'すぐ受け取り',
    'en': 'ASAP',
    'de': 'Sofort abholen',
    'es': 'Recoger de inmediato',
    'fr': 'Retrait immédiat',
    'id': 'Ambil segera',
    'it': 'Ritiro immediato',
    'pt': 'Levantar de imediato',
    'th': 'รับทันที',
    'tl': 'Kunin agad',
    'vi': 'Nhận ngay'
  };

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

const linePrefixLocales: Record<string, { placed: string; update: string; orderNumber: string; total: string; status: string }> = {
  'zh-TW': {
    placed: '【訂單建立成功】',
    update: '【訂單狀態更新】',
    orderNumber: '訂單編號',
    total: '總計',
    status: '目前狀態'
  },
  'ko': {
    placed: '【주문 완료】',
    update: '【주문 상태 업데이트】',
    orderNumber: '주문 번호',
    total: '합계',
    status: '현재 상태'
  },
  'en': {
    placed: '【Order Placed Successfully】',
    update: '【Order Status Update】',
    orderNumber: 'Order Number',
    total: 'Total',
    status: 'Current Status'
  },
  'ja': {
    placed: '【ご注文完了】',
    update: '【ご注文状況の更新】',
    orderNumber: '注文番号',
    total: '合計金額',
    status: '現在の状況'
  },
  'de': {
    placed: '【Bestellung erfolgreich aufgegeben】',
    update: '【Bestellstatus-Aktualisierung】',
    orderNumber: 'Bestellnummer',
    total: 'Gesamtbetrag',
    status: 'Aktueller Status'
  },
  'es': {
    placed: '【Pedido realizado correctamente】',
    update: '【Actualización del estado del pedido】',
    orderNumber: 'Número de pedido',
    total: 'Total',
    status: 'Estado actual'
  },
  'fr': {
    placed: '【Commande passée avec succès】',
    update: '【Mise à jour du statut de la commande】',
    orderNumber: 'Numéro de commande',
    total: 'Total',
    status: 'Statut actuel'
  },
  'id': {
    placed: '【Pesanan Berhasil Dibuat】',
    update: '【Pembaruan Status Pesanan】',
    orderNumber: 'Nomor Pesanan',
    total: 'Total',
    status: 'Status Saat Ini'
  },
  'it': {
    placed: '【Ordine effettuato con successo】',
    update: '【Aggiornamento dello stato dell\'ordine】',
    orderNumber: 'Numero d\'ordine',
    total: 'Totale',
    status: 'Stato attuale'
  },
  'pt': {
    placed: '【Pedido efetuado com sucesso】',
    update: '【Atualização do estado do pedido】',
    orderNumber: 'Número do pedido',
    total: 'Total',
    status: 'Estado atual'
  },
  'th': {
    placed: '【สั่งซื้อสินค้าสำเร็จแล้ว】',
    update: '【อัปเดตสถานะคำสั่งซื้อ】',
    orderNumber: 'หมายเลขคำสั่งซื้อ',
    total: 'ยอดรวม',
    status: 'สถานะปัจจุบัน'
  },
  'tl': {
    placed: '【Matagumpay na Naisumite ang Order】',
    update: '【Update sa Status ng Order】',
    orderNumber: 'Numero ng Order',
    total: 'Kabuuan',
    status: 'Kasalukuyang Status'
  },
  'vi': {
    placed: '【Đặt hàng thành công】',
    update: '【Cập nhật trạng thái đơn hàng】',
    orderNumber: 'Mã đơn hàng',
    total: 'Tổng cộng',
    status: 'Trạng thái hiện tại'
  }
};

const defaultStatusLocales: Record<string, Record<string, string>> = {
  'zh-TW': {
    'PLACED': '您好{使用者}，您的訂單{訂單編號}已成功建立！\n餐點內容：{餐點內容}\n取餐時間：{取餐時間/做好馬上取}',
    'CONFIRMED': '您好{使用者}，您的訂單{訂單編號}已確認，我們將盡快為您準備。',
    'PREPARING': '您的餐點正在製作中！',
    'READY': '🎉 您好{使用者}，您的訂單{訂單編號}已準備就緒！歡迎前往取貨。',
    'OUT_FOR_DELIVERY': '🚀 您的訂單{訂單編號}已由外送員取走，正在前往您的地址！',
    'DELIVERED': '🍽️ 您的餐點已送達，祝您用餐愉快！',
    'CANCELLED': '您的訂單{訂單編號}已被取消。如有 any 疑問，請聯繫我們。'
  },
  'ko': {
    'PLACED': '안녕하세요 {使用者}님, 주문 {訂單編號}이(가) 완료되었습니다!\n주문 내용: {餐點內容}\n수령 시간: {取餐時間/做好馬上取}',
    'CONFIRMED': '안녕하세요 {使用者}님, 주문 {訂單編號}이(가) 확인되었습니다. 최대한 빨리 준비하겠습니다.',
    'PREPARING': '주문하신 음식을 준비하고 있습니다!',
    'READY': '🎉 안녕하세요 {使用者}님, 주문 {訂單編號}이(가) 준비되었습니다! 매장에 방문하셔서 픽업해 주세요.',
    'OUT_FOR_DELIVERY': '🚀 주문 {訂單編號} 배달이 시작되었습니다. 곧 도착할 예정입니다!',
    'DELIVERED': '🍽️ 주문하신 음식이 배달 완료되었습니다. 맛있게 드세요!',
    'CANCELLED': '주문 {訂單編號}이(가) 취소되었습니다. 문의 사항이 있으시면 연락 주시기 바랍니다.'
  },
  'en': {
    'PLACED': 'Hello {使用者}, your order {訂單編號} has been successfully created!\nItems: {餐點內容}\nPickup time: {取餐時間/做好馬上取}',
    'CONFIRMED': 'Hello {使用者}, your order {訂單編號} has been confirmed. We will prepare it as soon as possible.',
    'PREPARING': 'Your food is being prepared!',
    'READY': '🎉 Hello {使用者}, your order {訂單編號} is ready! Welcome to pick it up.',
    'OUT_FOR_DELIVERY': '🚀 Your order {訂單編號} is out for delivery! It will arrive at your address soon.',
    'DELIVERED': '🍽️ Your meal has been delivered. Enjoy your meal!',
    'CANCELLED': 'Your order {訂單編號} has been cancelled. If you have any questions, please contact us.'
  },
  'ja': {
    'PLACED': 'こんにちは {使用者} 様、ご注文 {訂單編號} が正常に作成されました！\nご注文内容：{餐點內容}\nお受取時間：{取餐時間/做好馬上取}',
    'CONFIRMED': 'こんにちは {使用者} 様、ご注文 {訂單編號} が確認されました。ご用意を始めております。',
    'PREPARING': 'お料理を準備しております！',
    'READY': '🎉 こんにちは {使用者} 様、ご注文 {訂單編號} の準備ができました！お受け取りにお越しください。',
    'OUT_FOR_DELIVERY': '🚀 ご注文 {訂單編號} の配達が開始されました！まもなくお届け先へ到着します。',
    'DELIVERED': '🍽️ 商品のお届けが完了しました。どうぞお召し上がりください！',
    'CANCELLED': 'ご注文 {訂單編號} がキャンセルされました。ご不明な点がございましたら、お問い合わせください。'
  },
  'de': {
    'PLACED': 'Hallo {使用者}, Ihre Bestellung {訂單編號} wurde erfolgreich erstellt!\nBestellte Artikel: {餐點內容}\nAbholzeit: {取餐時間/做好馬上取}',
    'CONFIRMED': 'Hallo {使用者}, Ihre Bestellung {訂單編號} wurde bestätigt. Wir werden sie so schnell wie möglich vorbereiten.',
    'PREPARING': 'Ihre Speisen werden jetzt zubereitet!',
    'READY': '🎉 Hallo {使用者}, Ihre Bestellung {訂單編號} ist abholbereit! Sie können sie gerne abholen.',
    'OUT_FOR_DELIVERY': '🚀 Ihre Bestellung {訂單編號} wird geliefert! Sie wird in Kürze bei Ihrer Adresse eintreffen.',
    'DELIVERED': '🍽️ Ihre Bestellung wurde geliefert. Guten Appetit!',
    'CANCELLED': 'Ihre Bestellung {訂單編號} wurde storniert. Bei Fragen können Sie uns gerne kontaktieren.'
  },
  'es': {
    'PLACED': 'Hola {使用者}, ¡su pedido {訂單編號} ha sido creado con éxito!\nContenido: {餐點內容}\nHora de recogida: {取餐時間/做好馬上取}',
    'CONFIRMED': 'Hola {使用者}, su pedido {訂單編號} ha sido confirmado. Lo prepararemos lo antes posible.',
    'PREPARING': '¡Su comida se está preparando!',
    'READY': '🎉 Hola {使用者}, ¡su pedido {訂單編號} está listo! Bienvenido a recogerlo.',
    'OUT_FOR_DELIVERY': '🚀 ¡Su pedido {訂單編號} está en camino! Llegará pronto a su dirección.',
    'DELIVERED': '🍽️ Su comida ha sido entregada. ¡Buen provecho!',
    'CANCELLED': 'Su pedido {訂單編號} ha sido cancelado. Si tiene alguna pregunta, contáctenos.'
  },
  'fr': {
    'PLACED': 'Bonjour {使用者}, votre commande {訂單編號} a été créée avec succès !\nContenu : {餐點內容}\nHeure de retrait : {取餐時間/做好馬上取}',
    'CONFIRMED': 'Bonjour {使用者}, votre commande {訂單編號} a été confirmée. Nous la préparerons dans les plus brefs délais.',
    'PREPARING': 'Votre repas est en cours de préparation !',
    'READY': '🎉 Bonjour {使用者}, votre commande {訂單編號} est prête ! Vous pouvez venir la récupérer.',
    'OUT_FOR_DELIVERY': '🚀 Votre commande {訂單編號} est en cours de livraison ! Elle arrivera bientôt à votre adresse.',
    'DELIVERED': '🍽️ Votre repas a été livré. Bon appétit !',
    'CANCELLED': 'Votre commande {訂單編號} a été annulée. Si vous avez des questions, veuillez nous contacter.'
  },
  'id': {
    'PLACED': 'Halo {使用者}, pesanan Anda {訂單編號} berhasil dibuat!\nDetail: {餐點內容}\nWaktu pengambilan: {取餐時間/做好馬上取}',
    'CONFIRMED': 'Halo {使用者}, pesanan Anda {訂單編號} telah dikonfirmasi. Kami akan segera menyiapkannya.',
    'PREPARING': 'Makanan Anda sedang disiapkan!',
    'READY': '🎉 Halo {使用者}, pesanan Anda {訂單編號} telah siap! Silakan datang untuk mengambil.',
    'OUT_FOR_DELIVERY': '🚀 Pesanan Anda {訂單編號} sedang dalam pengiriman! Akan segera tiba di alamat Anda.',
    'DELIVERED': '🍽️ Makanan Anda telah diantarkan. Selamat menikmati!',
    'CANCELLED': 'Pesanan Anda {訂單編號} telah dibatalkan. Jika ada pertanyaan, silakan hubungi kami.'
  },
  'it': {
    'PLACED': 'Ciao {使用者}, il tuo ordine {訂單編號} è stato creato con successo!\nDettaglio ordini: {餐點內容}\nOrario di ritiro: {取餐時間/做好馬上取}',
    'CONFIRMED': 'Ciao {使用者}, il tuo ordine {訂單編號} è stato confermato. Lo prepareremo il prima possibile.',
    'PREPARING': 'I tuoi piatti sono in preparazione!',
    'READY': '🎉 Ciao {使用者}, il tuo ordine {訂單編號} è pronto! Puoi venire a ritirarlo.',
    'OUT_FOR_DELIVERY': '🚀 Il tuo ordine {訂單編號} è in consegna! Arriverà presto al tuo indirizzo.',
    'DELIVERED': '🍽️ Il tuo pasto è stato consegnato. Buon appetito!',
    'CANCELLED': 'Il tuo ordine {訂單編號} è stato annullato. Per qualsiasi domanda, contattaci.'
  },
  'pt': {
    'PLACED': 'Olá {使用者}, o seu pedido {訂單編號} foi criado com sucesso!\nConteúdo: {餐點內容}\nHora de recolha: {取餐時間/做好馬上取}',
    'CONFIRMED': 'Olá {使用者}, o seu pedido {訂單編號} foi confirmado. Vamos prepará-lo o mais rápido possível.',
    'PREPARING': 'A sua refeição está a ser preparada!',
    'READY': '🎉 Olá {使用者}, o seu pedido {訂單編號} está pronto! Pode passar para levantar.',
    'OUT_FOR_DELIVERY': '🚀 O seu pedido {訂單編號} está a caminho! Chegará em breve ao seu endereço.',
    'DELIVERED': '🍽️ A sua refeição foi entregue. Bom apetite!',
    'CANCELLED': 'O seu pedido {訂單編號} foi cancelado. Se tiver alguma dúvida, por favor contacte-nos.'
  },
  'th': {
    'PLACED': 'สวัสดีคุณ {使用者} คำสั่งซื้อ {訂單編號} ของคุณสำเร็จแล้ว!\nรายการอาหาร: {餐點內容}\nเวลารับอาหาร: {取餐時間/做好馬上取}',
    'CONFIRMED': 'สวัสดีคุณ {使用者} คำสั่งซื้อ {訂單編號} ได้รับการยืนยันแล้ว เราจะรีบเตรียมอาหารให้คุณโดยเร็วที่สุด',
    'PREPARING': 'อาหารของคุณกำลังอยู่ในขั้นตอนการจัดเตรียม!',
    'READY': '🎉 สวัสดีคุณ {使用者} คำสั่งซื้อ {訂單編號} พร้อมแล้ว! สามารถมารับได้เลยค่ะ',
    'OUT_FOR_DELIVERY': '🚀 คำสั่งซื้อ {訂單編號} กำลังจัดส่ง! จะถึงที่อยู่ของคุณในไม่ช้า',
    'DELIVERED': '🍽️ อาหารของคุณถูกจัดส่งเรียบร้อยแล้ว ขอให้มีความสุขกับมื้ออาหารนะคะ!',
    'CANCELLED': 'คำสั่งซื้อ {訂單編號} ของคุณถูกยกเลิกแล้ว หากมีข้อสงสัยใดๆ โปรดติดต่อเรา'
  },
  'tl': {
    'PLACED': 'Kamusta {使用者}, ang iyong order {訂單編號} ay matagumpay na natanggap!\nNilalaman: {餐點內容}\nOras ng pickup: {取餐時間/做好馬上取}',
    'CONFIRMED': 'Kamusta {使用者}, ang iyong order {訂單編號} ay kumpirmado na. Ihahanda namin ito sa lalong madaling panahon.',
    'PREPARING': 'Inihahanda na ang iyong pagkain!',
    'READY': '🎉 Kamusta {使用者}, ang iyong order {訂單編號} ay handa na! Maligayang pagdating upang kunin ito.',
    'OUT_FOR_DELIVERY': '🚀 Ang iyong order {訂單編號} ay kasalukuyang dine-deliver! Darating ito sa iyong address sa lalong madaling panahon.',
    'DELIVERED': '🍽️ Naihatid na ang iyong pagkain. Masiyahan sa iyong pagkain!',
    'CANCELLED': 'Ang iyong order {訂單編號} ay kinansela. Kung mayroon kang anumang mga katanungan, mangyaring makipag-ugnay sa amin.'
  },
  'vi': {
    'PLACED': 'Xin chào {使用者}, đơn hàng {訂單編號} của bạn đã được khởi tạo thành công!\nMón ăn: {餐點內容}\nThời gian nhận: {取餐時間/做好馬上取}',
    'CONFIRMED': 'Xin chào {使用者}, đơn hàng {訂單編號} của bạn đã được xác nhận. Chúng tôi sẽ chuẩn bị nhanh nhất có thể.',
    'PREPARING': 'Món ăn của bạn đang được chuẩn bị!',
    'READY': '🎉 Xin chào {使用者}, đơn hàng {訂單編號} của bạn đã sẵn sàng! Mời bạn đến nhận món.',
    'OUT_FOR_DELIVERY': '🚀 Đơn hàng {訂單編號} của bạn đang được giao! Sẽ sớm giao đến địa chỉ của bạn.',
    'DELIVERED': '🍽️ Món ăn đã được giao thành công. Chúc bạn ngon miệng!',
    'CANCELLED': 'Đơn hàng {訂單編號} của bạn đã bị hủy. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.'
  }
};

const orderItemOptionSchema = z.object({
  menuOptionValueId: z.string().min(1),
  name: z.string().min(1),
  value: z.string().min(1),
  priceModifier: z.number(),
});

const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  comment: z.string().optional(),
  options: z.array(orderItemOptionSchema).optional(),
  redeemedWithPoints: z.boolean().optional(),
});

const createOrderSchema = z.object({
  orderType: z.enum(['DELIVERY', 'PICKUP', 'FROZEN_DELIVERY']),
  items: z.array(orderItemSchema).min(1),
  comment: z.string().optional(),
  scheduledAt: z.string().optional(),
  couponCode: z.string().optional(),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
  guestPhone: z.string().optional(),
  loyaltyPointsRedeem: z.number().int().min(0).optional(),
  userLat: z.number().optional(),
  userLon: z.number().optional(),
  locationId: z.string().optional(),
  tableName: z.string().optional(),
  groupSessionId: z.string().optional(),
  honeypot: z.string().optional(),
});

function generateOrderNumber(): string {
  const prefix = 'SH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { 
    orderType, items, comment, scheduledAt, address, 
    guestName, guestEmail, guestPhone, loyaltyPointsRedeem,
    userLat, userLon, locationId, honeypot, couponCode, tableName, groupSessionId
  } = parsed.data;

  // HONEYPOT check: Bots often fill all fields. If this hidden field is filled, reject it silently or with a generic error.
  if (honeypot) {
    auditLog(req, { action: 'honeypot_triggered', entity: 'Order', details: { ip: req.ip, honeypot } });
    res.status(400).json({ success: false, error: 'Suspicious activity detected.' });
    return;
  }

  const isStaff = req.user?.type === 'staff';

  if (!isStaff && (orderType === 'DELIVERY' || orderType === 'FROZEN_DELIVERY') && !address) {
    res.status(400).json({ success: false, error: 'Delivery address is required' });
    return;
  }

  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const orderSettings = (siteSettings?.orderSettings as any) || {};

  if (!isStaff && orderSettings.enabled === false) {
    res.status(400).json({ success: false, error: 'Online ordering is currently disabled' });
    return;
  }

  if (!isStaff && orderType === 'DELIVERY' && orderSettings.deliveryEnabled === false) {
    res.status(400).json({ success: false, error: 'Delivery is currently disabled' });
    return;
  }

  if (!isStaff && orderType === 'FROZEN_DELIVERY' && orderSettings.frozenDeliveryEnabled === false) {
    res.status(400).json({ success: false, error: 'Frozen delivery is currently disabled' });
    return;
  }

  if (!isStaff && orderType === 'PICKUP' && orderSettings.pickupEnabled === false) {
    res.status(400).json({ success: false, error: 'Pickup is currently disabled' });
    return;
  }

  // Get customer ID from auth if available
  const customerId = (req as any).user?.type === 'customer' ? (req as any).user.id : null;
  let isEmployee = false;
  let customerObj: any = null;
  if (customerId) {
    customerObj = await prisma.customer.findUnique({
      where: { id: customerId }
    });
    isEmployee = customerObj?.isEmployee || false;
  }

  // Guest checkout: default name to 'Guest' if not provided
  const finalGuestName = guestName || 'Guest';

  // Validate scheduledAt
  if (scheduledAt) {
    const scheduled = new Date(scheduledAt);
    if (isNaN(scheduled.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid scheduledAt date' });
      return;
    }

    if (!isStaff) {
      const now = new Date();
      const minTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 min in future
      const maxTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days out

      if (scheduled < minTime) {
        res.status(400).json({ success: false, error: 'Scheduled time must be at least 30 minutes in the future' });
        return;
      }
      if (scheduled > maxTime) {
        res.status(400).json({ success: false, error: 'Scheduled time cannot be more than 7 days in the future' });
        return;
      }

      // Require phone for scheduled orders
      if (!guestPhone && !customerId) {
        res.status(400).json({ success: false, error: 'Phone number is required for scheduled orders' });
        return;
      }

      if (customerId) {
        if (!customerObj?.phone && !guestPhone) {
          res.status(400).json({ success: false, error: 'Phone number is required for scheduled orders. Please provide a contact number.' });
          return;
        }
      }
    }
  }

  // Get location (specified or default)
  const location = await prisma.location.findFirst({
    where: { 
      ...(locationId ? { id: locationId } : { isActive: true })
    },
    include: { operatingHours: true },
  });
  if (!location) {
    res.status(400).json({ success: false, error: locationId ? 'Specified location not found' : 'No active location found' });
    return;
  }

  if (!isStaff && orderType === 'DELIVERY' && !location.deliveryEnabled) {
    res.status(400).json({ success: false, error: 'Delivery is not available for this location' });
    return;
  }

  if (!isStaff && orderType === 'PICKUP' && !location.pickupEnabled) {
    res.status(400).json({ success: false, error: 'Pickup is not available for this location' });
    return;
  }

  // Check busy mode
  if (!isStaff && location.isBusy) {
    res.status(400).json({
      success: false,
      error: location.busyMessage || 'This location is currently not accepting orders. Please try again later.',
    });
    return;
  }

  // Validate scheduledAt and ASAP within operating hours and respects buffers
  if (!isStaff && !isEmployee && location.operatingHours.length > 0) {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const orderSettings = (settings?.orderSettings as any) || {};
    const preOpeningBuffer = Number(orderSettings.preOpeningBuffer || 30);
    const postClosingBuffer = Number(orderSettings.postClosingBuffer || 30);
    const leadTime = orderType === 'DELIVERY' 
      ? (location.deliveryLeadTime || 45) 
      : orderType === 'FROZEN_DELIVERY'
        ? Number(orderSettings.frozenLeadTime || 0)
        : (location.pickupLeadTime || 15);

    const { isWithinHours } = await import('../lib/business-hours.js');

    if (scheduledAt) {
      const scheduled = new Date(scheduledAt);
      const now = new Date();
      
      // Check if scheduled time is in the past or before lead time
      const minTime = new Date(now);
      minTime.setMinutes(minTime.getMinutes() + leadTime);
      if (scheduled < minTime) {
        res.status(400).json({ success: false, error: `Scheduled time must be at least ${leadTime} minutes from now` });
        return;
      }

      const check = isWithinHours(
        scheduled,
        location.operatingHours,
        { preOpeningBuffer, postClosingBuffer }
      );

      if (!check.isOpen) {
        res.status(400).json({ success: false, error: check.error });
        return;
      }
    } else {
      // Check ASAP order against current hours
      const check = isWithinHours(new Date(), location.operatingHours);
      if (!check.isOpen) {
        res.status(400).json({ 
          success: false, 
          error: 'We are currently closed for immediate orders. Please select a future pickup time.' 
        });
        return;
      }
    }
  }

  // Delivery zone enforcement
  try {
    let deliveryFee = 0;
  if (orderType === 'DELIVERY') {
    if (address?.lat != null && address?.lng != null) {
      const zones = await prisma.deliveryZone.findMany({
        where: { locationId: location.id, isActive: true },
      });

      let matchedZone = null;
      for (const zone of zones) {
        if (zone.boundaries && Array.isArray(zone.boundaries)) {
          if (isPointInPolygon(address.lat, address.lng, zone.boundaries as [number, number][])) {
            matchedZone = zone;
            break;
          }
        }
      }

      if (!isStaff && zones.length > 0 && !matchedZone) {
        res.status(400).json({ success: false, error: 'Delivery address is outside our delivery zones' });
        return;
      }

      if (matchedZone) {
        deliveryFee = matchedZone.charge;
      } else {
        deliveryFee = 4.99; // Fallback if no zones configured
      }
    } else {
      // No coordinates provided — use fallback or first zone's charge
      const defaultZone = await prisma.deliveryZone.findFirst({
        where: { locationId: location.id, isActive: true },
        orderBy: { charge: 'asc' },
      });
      deliveryFee = defaultZone ? defaultZone.charge : 4.99;
    }
  } else if (orderType === 'FROZEN_DELIVERY') {
    deliveryFee = orderSettings.frozenDeliveryFee !== undefined ? Number(orderSettings.frozenDeliveryFee) : 0;
  }

  // Fetch menu items to validate and get prices
  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: {
      options: { include: { values: true } },
      category: true,
    },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // Calculate total ordered quantity per category for shared stock validation
  const categoryQtyOrdered = new Map<string, number>();
  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (menuItem && menuItem.categoryId) {
      const current = categoryQtyOrdered.get(menuItem.categoryId) || 0;
      categoryQtyOrdered.set(menuItem.categoryId, current + item.quantity);
    }
  }

  // Validate all items exist and are active
  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem) {
      res.status(400).json({ success: false, error: `Menu item not found: ${item.menuItemId}` });
      return;
    }
    if (!menuItem.isActive) {
      res.status(400).json({ success: false, error: `Menu item is not available: ${menuItem.name}` });
      return;
    }
    // 1. Check Product-level Independent Stock
    if (menuItem.trackStock && menuItem.stockQty < item.quantity) {
      res.status(400).json({ success: false, error: `商品庫存不足: ${menuItem.name}` });
      return;
    }
    // 2. Check Category-level Shared Stock
    if (menuItem.category && (menuItem.category as any).trackSharedStock) {
      const totalCategoryQty = categoryQtyOrdered.get(menuItem.categoryId) || 0;
      if ((menuItem.category as any).sharedStockQty < totalCategoryQty) {
        res.status(400).json({
          success: false,
          error: `分類「${menuItem.category.name}」共用庫存不足（如麵團剩餘不足），無法提供此數量`
        });
        return;
      }
    }
  }

  // Calculate totals and validate options
  let subtotal = 0;
  
  // Calculate total reward points cost for items bought with points
  let totalRewardPointsCost = 0;
  for (const item of items) {
    if (item.redeemedWithPoints) {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) continue;
      if (!menuItem.isRewardItem) {
        res.status(400).json({ success: false, error: `商品 ${menuItem.name} 並非可使用紅利點數兌換的品項。` });
        return;
      }
      totalRewardPointsCost += item.quantity * menuItem.rewardPointsPrice;
    }
  }

  // Retrieve dynamic rates from settings
  let earnRate = 1.0;
  let redeemRate = 100.0;
  try {
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const orderSettings = (siteSettings?.orderSettings as any) || {};
    if (orderSettings.loyaltyEarnRate !== undefined) earnRate = Number(orderSettings.loyaltyEarnRate);
    if (orderSettings.loyaltyRedeemRate !== undefined) redeemRate = Number(orderSettings.loyaltyRedeemRate);
  } catch (err) {
    console.error('Failed to get dynamic rates:', err);
  }

  // Validate customer points balance for the entire order requirements
  const neededPoints = (loyaltyPointsRedeem || 0) + totalRewardPointsCost;
  if (neededPoints > 0) {
    if (!customerId) {
      res.status(400).json({ success: false, error: '會員專屬功能，請先登入帳號。' });
      return;
    }
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.loyaltyPoints < neededPoints) {
      res.status(400).json({ success: false, error: '會員紅利點數不足以支付此訂單。' });
      return;
    }
  }

  // Fetch all option values in one go for efficiency
  const allOptionValueIds = items.flatMap(i => (i.options || []).map(o => o.menuOptionValueId)).filter(Boolean);
  const dbOptionValues = await prisma.menuOptionValue.findMany({
    where: { id: { in: allOptionValueIds } }
  });
  const optionValueMap = new Map(dbOptionValues.map(v => [v.id, v]));


  const orderItemsData = items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId)!;
    let unitPrice = menuItem.price;

    const optionsData = (item.options || []).map((opt) => {
      // SECURITY: Get actual price from DB, not from client request
      const dbValue = optionValueMap.get(opt.menuOptionValueId);
      const actualModifier = dbValue ? dbValue.priceModifier : 0;
      
      unitPrice += actualModifier;
      
      return {
        menuOptionValueId: opt.menuOptionValueId,
        name: dbValue ? dbValue.name : opt.name,
        value: dbValue ? dbValue.name : opt.value,
        priceModifier: actualModifier,
      };
    });

    const isRedeemed = !!item.redeemedWithPoints;
    const finalUnitPrice = isRedeemed ? 0 : unitPrice;
    const itemSubtotal = isRedeemed ? 0 : unitPrice * item.quantity;
    if (!isRedeemed) {
      subtotal += itemSubtotal;
    }

    return {
      menuItemId: item.menuItemId,
      name: menuItem.name,
      quantity: item.quantity,
      unitPrice: finalUnitPrice,
      subtotal: itemSubtotal,
      comment: isRedeemed 
        ? (item.comment ? `${item.comment} (紅利兌換)` : '紅利兌換')
        : item.comment,
      options: { create: optionsData },
    };
  });

  // Loyalty points redemption margin controls
  let maxRedemptionForCart = 0;
  try {
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const advancedSettings = (siteSettings?.advancedSettings as any) || {};
    const redemptionRules = advancedSettings.loyaltyRedemptionRules || {};

    items.forEach((item) => {
      // Only cash items are subject to redemption margin rules
      if (item.redeemedWithPoints) return;
      
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) return;
      let unitPrice = menuItem.price;
      (item.options || []).forEach((opt) => {
        const dbValue = optionValueMap.get(opt.menuOptionValueId);
        unitPrice += dbValue ? dbValue.priceModifier : 0;
      });
      const itemSubtotal = unitPrice * item.quantity;
      const rule = redemptionRules[item.menuItemId] || { isRedeemable: false, maxRedemptionAmount: 0 };
      if (rule.isRedeemable) {
        const allowedDiscount = rule.maxRedemptionAmount > 0 
          ? Math.min(itemSubtotal, item.quantity * rule.maxRedemptionAmount)
          : itemSubtotal;
        maxRedemptionForCart += allowedDiscount;
      }
    });
  } catch (err) {
    console.error('Failed to calculate loyalty point redemption margin controls:', err);
    maxRedemptionForCart = subtotal;
  }

  // Loyalty points redemption
  let loyaltyDiscount = 0;
  if (loyaltyPointsRedeem && loyaltyPointsRedeem > 0 && customerId) {
    const proposedDiscount = loyaltyPointsRedeem / redeemRate;
    if (proposedDiscount > maxRedemptionForCart) {
      res.status(400).json({ 
        success: false, 
        error: `該購物車內品項最高僅允許使用紅利折抵 NT$ ${maxRedemptionForCart.toFixed(2)} 元 (相當於 ${Math.round(maxRedemptionForCart * redeemRate)} 點)。`
      });
      return;
    }
    loyaltyDiscount = proposedDiscount;
  }

  // Check minimum order. Delivery zones override location/global defaults.
  if (!isStaff) {
    if (orderType === 'DELIVERY' && address?.lat != null && address?.lng != null) {
      const zones = await prisma.deliveryZone.findMany({
        where: { locationId: location.id, isActive: true },
      });
      let matchedZone = null;
      for (const zone of zones) {
        if (zone.boundaries && Array.isArray(zone.boundaries)) {
          if (isPointInPolygon(address.lat, address.lng, zone.boundaries as [number, number][])) {
            matchedZone = zone;
            break;
          }
        }
      }

      const minOrder = matchedZone?.minOrder ?? location.minOrderDelivery ?? Number(orderSettings.minOrderDelivery || 0);
      if (subtotal < minOrder) {
        res.status(400).json({
          success: false,
          error: `Minimum delivery order amount is ${minOrder.toFixed(2)}`,
        });
        return;
      }
    } else if (orderType === 'DELIVERY') {
      const defaultZone = await prisma.deliveryZone.findFirst({
        where: { locationId: location.id, isActive: true },
        orderBy: { minOrder: 'asc' },
      });
      const minOrder = defaultZone?.minOrder ?? location.minOrderDelivery ?? Number(orderSettings.minOrderDelivery || 0);
      if (subtotal < minOrder) {
        res.status(400).json({
          success: false,
          error: `Minimum delivery order amount is ${minOrder.toFixed(2)}`,
        });
        return;
      }
    } else if (orderType === 'FROZEN_DELIVERY') {
      const minOrder = orderSettings.minOrderFrozen !== undefined ? Number(orderSettings.minOrderFrozen) : 0;
      if (subtotal < minOrder) {
        res.status(400).json({
          success: false,
          error: `Minimum frozen delivery order amount is ${minOrder.toFixed(2)}`,
        });
        return;
      }
    } else {
      const minOrder = location.minOrderPickup ?? Number(orderSettings.minOrderPickup || 0);
      if (subtotal < minOrder) {
        res.status(400).json({
          success: false,
          error: `Minimum pickup order amount is ${minOrder.toFixed(2)}`,
        });
        return;
      }
    }
  }

  let currentTaxRate = orderSettings.taxRate !== undefined ? Number(orderSettings.taxRate) : 0;
  if (isNaN(currentTaxRate)) currentTaxRate = 0;

  // Calculate discount using Unified Discount Engine
  let couponDiscount = 0;
  let freeDelivery = false;
  let appliedCouponId: string | null = null;

  const engineCartItems = items.map((item) => {
    const dbItem = menuItemMap.get(item.menuItemId)!;
    let unitPrice = dbItem.price;
    (item.options || []).forEach((opt) => {
      const dbValue = optionValueMap.get(opt.menuOptionValueId);
      unitPrice += dbValue ? dbValue.priceModifier : 0;
    });
    return {
      menuItemId: item.menuItemId,
      categoryId: dbItem.categoryId,
      price: unitPrice,
      quantity: item.quantity,
    };
  });

  // A. First scan and apply the best automatic promotion
  const autoPromo = await findAndApplyBestAutomaticDiscount(
    { subtotal, orderType: orderType as any, locationId: location.id },
    engineCartItems
  );
  if (autoPromo.campaign) {
    couponDiscount = autoPromo.discountAmount;
    freeDelivery = autoPromo.freeDelivery;
    appliedCouponId = autoPromo.campaign.id;
  }

  // B. Second, if couponCode is provided, validate and apply
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!coupon) {
      res.status(400).json({ success: false, error: '無效的優惠碼' });
      return;
    }
    
    const validation = validateAndCalculateDiscount(
      coupon,
      { subtotal, orderType: orderType as any, locationId: location.id },
      engineCartItems
    );
    if (!validation.isValid) {
      res.status(400).json({ success: false, error: validation.reason || '此優惠碼目前無法套用' });
      return;
    }

    if (validation.freeDelivery) {
      freeDelivery = true;
    }
    if (validation.discountAmount > 0) {
      couponDiscount += validation.discountAmount;
    }
    appliedCouponId = coupon.id;
  }

  if (freeDelivery) {
    deliveryFee = 0;
  }

  const tax = subtotal * (currentTaxRate / 100);
  const unroundedTotal = Math.max(0, subtotal + tax + deliveryFee - loyaltyDiscount - couponDiscount);
  
  const generalSettings = typeof siteSettings?.generalSettings === 'string' 
    ? JSON.parse(siteSettings.generalSettings) 
    : siteSettings?.generalSettings || {};
  const currencyDecimals = generalSettings.currencyDecimals !== undefined ? Number(generalSettings.currencyDecimals) : 2;
  
  const total = Number(unroundedTotal.toFixed(currencyDecimals));

  if (isNaN(total)) {
    res.status(400).json({ success: false, error: 'Calculation error: invalid amounts' });
    return;
  }

  // Calculate distance and tag remote status
  let distance: number | null = null;
  let isRemote = false;
  if (userLat != null && userLon != null && location.lat != null && location.lng != null) {
    const calculated = calculateDistance(userLat, userLon, location.lat, location.lng);
    if (!isNaN(calculated)) {
      distance = calculated;
      isRemote = calculated > 20; // 20 meter threshold
    }
  }

  // Generate pickup number (001-999 loop)
  const lastOrder = await prisma.order.findFirst({
    where: { locationId: location.id },
    orderBy: { createdAt: 'desc' },
    select: { pickupNumber: true },
  });

  let nextPickup = 1;
  if (lastOrder?.pickupNumber) {
    const lastNum = parseInt(lastOrder.pickupNumber, 10);
    if (!isNaN(lastNum)) {
      nextPickup = (lastNum % 999) + 1;
    }
  }
  const pickupNumber = String(nextPickup).padStart(3, '0');

  // Capture preferred language from headers or request body
  let userLang = 'zh-TW';
  const langHeader = req.headers['accept-language'] || req.body.language;
  if (langHeader && typeof langHeader === 'string') {
    const primary = langHeader.split(',')[0].trim();
    if (primary.toLowerCase().startsWith('zh-tw') || primary.toLowerCase() === 'zh') {
      userLang = 'zh-TW';
    } else {
      const code = primary.split('-')[0].toLowerCase();
      userLang = code;
    }
  }
  
  // Validate table
  let tableId: string | undefined = undefined;
  if (tableName && location) {
    const table = await prisma.table.findFirst({
      where: { name: tableName, locationId: location.id, isActive: true },
    });
    if (!table) {
      res.status(400).json({ success: false, error: '查無此桌號或桌號已停用' });
      return;
    }
    tableId = table.id;
  }

  const order = await (prisma.order.create as any)({
    data: {
      orderNumber: generateOrderNumber(),
      pickupNumber,
      customerId,
      locationId: location.id,
      orderType,
      paymentStatus: 'UNPAID',
      subtotal,
      tax,
      deliveryFee,
      discount: loyaltyDiscount + couponDiscount,
      couponId: appliedCouponId,
      total,
      comment,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      guestName: customerId ? undefined : finalGuestName,
      guestEmail: customerId ? undefined : guestEmail,
      guestPhone: guestPhone || undefined,
      userLat,
      userLon,
      distance,
      isRemote,
      language: userLang,
      tableId,
      groupId: groupSessionId || undefined,
      items: { create: orderItemsData },
    } as any,
    include: {
      items: { include: { options: true, menuItem: { select: { id: true, nameTranslations: true } } } },
      customer: { select: { id: true, name: true, email: true } },
      table: { select: { id: true, name: true } },
    },
  });

  // Increment usage count for the coupon if applied
  if (appliedCouponId) {
    await prisma.coupon.update({
      where: { id: appliedCouponId },
      data: { usageCount: { increment: 1 } },
    });
  }

  // Decrement stock for tracked items and category shared stock
  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId)!;
    
    // 1. Decrement product independent stock
    if (menuItem.trackStock) {
      await prisma.menuItem.update({
        where: { id: item.menuItemId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }

    // 2. Decrement category shared stock
    if (menuItem.category && (menuItem.category as any).trackSharedStock) {
      await (prisma.category as any).update({
        where: { id: menuItem.categoryId },
        data: { sharedStockQty: { decrement: item.quantity } },
      });
    }


  }

  // Earn loyalty points using dynamic loyaltyEarnRate
  if (customerId) {
    const pointsEarned = Math.floor(subtotal * earnRate);
    const currentCustomer = await prisma.customer.findUnique({ where: { id: customerId }, select: { phone: true, address: true } });
    
    const updateData: any = {};
    if (pointsEarned > 0) {
      updateData.loyaltyPoints = { increment: pointsEarned };
    }
    
    // Always sync/update phone if provided and changed
    if (guestPhone && guestPhone !== currentCustomer?.phone) {
      updateData.phone = guestPhone;
    }
    
    // Always sync/update address if provided (line1) and changed
    const incomingAddress = address?.line1;
    if (incomingAddress && incomingAddress !== currentCustomer?.address) {
      updateData.address = incomingAddress;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.customer.update({
        where: { id: customerId },
        data: updateData,
      });
    }
    if (pointsEarned > 0) {
      await prisma.loyaltyTransaction.create({
        data: {
          customerId,
          type: 'EARN',
          points: pointsEarned,
          description: `Earned from order #${order.orderNumber}`,
          orderId: order.id,
        },
      });
    }

    // Redeem loyalty points (cash discount and reward item redemptions)
    const totalPointsDeducted = (loyaltyPointsRedeem || 0) + totalRewardPointsCost;
    if (totalPointsDeducted > 0) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { decrement: totalPointsDeducted } },
      });
      
      if (loyaltyPointsRedeem && loyaltyPointsRedeem > 0) {
        await prisma.loyaltyTransaction.create({
          data: {
            customerId,
            type: 'REDEEM',
            points: -loyaltyPointsRedeem,
            description: `Redeemed on order #${order.orderNumber} for cash discount`,
            orderId: order.id,
          },
        });
      }
      
      if (totalRewardPointsCost > 0) {
        await prisma.loyaltyTransaction.create({
          data: {
            customerId,
            type: 'REDEEM',
            points: -totalRewardPointsCost,
            description: `Redeemed on order #${order.orderNumber} for reward items`,
            orderId: order.id,
          },
        });
      }
    }
  }

  // Send confirmation email/LINE if enabled
  const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;
  const recipientEmail = customer?.email || guestEmail;
  
  if (recipientEmail) {
    let shouldSendEmail = true;
    try {
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      const orderSettings = (settings?.orderSettings as any) || {};
      const notifications = orderSettings.emailNotifications || {};
      if (notifications['PLACED'] === false) {
        shouldSendEmail = false;
      }
      
      // Check customer preference
      if (customer && customer.emailNotificationsEnabled === false) {
        shouldSendEmail = false;
      }
    } catch (e) {}

    if (shouldSendEmail) {
      const orderLang = (order as any).language || 'zh-TW';
      const emailContent = orderConfirmationEmail({
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        total: order.total,
        items: (order as any).items.map((i: any) => {
          let itemName = i.name;
          if (orderLang !== 'zh-TW' && i.menuItem?.nameTranslations) {
            try {
              const trans = typeof i.menuItem.nameTranslations === 'string'
                ? JSON.parse(i.menuItem.nameTranslations)
                : i.menuItem.nameTranslations;
              if (trans && trans[orderLang]) {
                itemName = trans[orderLang];
              }
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
      }).catch(() => {});
    }
  }

  // Send LINE push for new order if customer has bound LINE and preference is enabled
  if (customer?.lineUserId && customer.lineNotificationsEnabled !== false) {
    try {
      const { sendLinePush } = await import('./line.controller.js');
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      const lineSettings = (settings?.lineSettings as any) || {};
      const generalSettings = (settings?.generalSettings as any) || {};
      const timezone = generalSettings.timezone || 'Asia/Taipei';
      const lineNotifications = lineSettings.notifications || {};
      
      const isEnabled = lineNotifications['PLACED']?.enabled !== false;
      const orderLang = (order as any).language || 'zh-TW';
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
        
        const sendLinePlacedPushAsync = async () => {
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

          sendLinePush(customer.lineUserId!, lineMessage).catch(() => {});
        };
        sendLinePlacedPushAsync().catch(() => {});
      }
    } catch (err) {
      console.error('[LINE Notify] Error in createOrder notification logic:', err);
    }
  }

  emitNewOrder({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
    locationId: order.locationId,
    paymentStatus: order.paymentStatus,
  });

  // Emit event for automation rules
  try {
    const { appEvents } = await import('../lib/events.js');
    appEvents.emit('order.created', { order });
  } catch {}
    res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    console.error('Error creating order:', err);
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while processing your order' 
    });
  }
}


export async function listOrders(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const orderType = req.query.orderType as string | undefined;
  const locationId = req.query.locationId as string | undefined;

  const includeItems = req.query.includeItems === 'true';

  const where: Record<string, unknown> = {};
  if (status) {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }
  if (orderType) where.orderType = orderType;
  if (locationId) where.locationId = locationId;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        location: { select: { id: true, name: true } },
        table: { select: { id: true, name: true } },
        payments: true,
        _count: { select: { items: true } },
        ...(includeItems ? { items: { include: { options: true } } } : {}),
      },
    }),
    prisma.order.count({ where }),
  ]);

  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const generalSettings = typeof siteSettings?.generalSettings === 'string' ? JSON.parse(siteSettings.generalSettings) : siteSettings?.generalSettings || {};
  const currencyDecimals = generalSettings.currencyDecimals !== undefined ? Number(generalSettings.currencyDecimals) : 2;

  res.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    currencyDecimals
  });
}

export async function getOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  console.log('GET ORDER CALLED WITH ID:', JSON.stringify(id));

  const whereClause = id.startsWith('SH-') || id.length < 20 
    ? { orderNumber: id } 
    : { id };

  const order = await prisma.order.findUnique({
    where: whereClause as any,
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      location: { select: { id: true, name: true } },
      table: { select: { id: true, name: true } },
      payments: true,
      items: {
        include: {
          menuItem: { select: { id: true, name: true, nameTranslations: true, slug: true } },
          options: {
            include: {
              menuOptionValue: { select: { id: true, nameTranslations: true } }
            }
          },
        },
      },
    },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const user = req.user;
  if (order.customerId) {
    if (!user || (user.type !== 'staff' && order.customerId !== user.id)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }
  }

  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const generalSettings = typeof siteSettings?.generalSettings === 'string' ? JSON.parse(siteSettings.generalSettings) : siteSettings?.generalSettings || {};
  const currencyDecimals = generalSettings.currencyDecimals !== undefined ? Number(generalSettings.currencyDecimals) : 2;

  res.json({ success: true, data: order, currencyDecimals });
}

export async function listCustomerOrders(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const where = { customerId };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        location: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ERP Integration: Background call to deduct inventory in PizzaMaster
async function notifyPizzaMasterOfDeduction(order: any) {
  try {
    let url = (process.env.API_URL_PUBLIC || 'http://localhost:3000').trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    const erpUrl = url.includes('/shutter-erp') ? url : (url.endsWith('/') ? `${url}shutter-erp` : `${url}/shutter-erp`);
    console.log(`[ERP Integration] Notifying PizzaMaster for stock deduction. Order: #${order.orderNumber}`);
    const response = await fetch(`${erpUrl}/api/integration/deduct-inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-integration-key': process.env.INTEGRATION_KEY || 'pizzamaster-integration-secret-key'
      },
      body: JSON.stringify({
        orderId: order.id,
        orderNumber: order.orderNumber,
        items: order.items.map((item: any) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity
        }))
      })
    });
    
    const result = await response.json().catch(() => ({ success: false, error: 'Non-JSON response' }));
    if (!response.ok || !result.success) {
      console.error(`[ERP Integration] Failed to deduct inventory on PizzaMaster:`, result.error || response.statusText);
    } else {
      console.log(`[ERP Integration] Successfully deducted inventory on PizzaMaster for Order #${order.orderNumber}`);
    }
  } catch (err) {
    console.error(`[ERP Integration] Error sending stock deduction to PizzaMaster:`, err);
  }
}

export async function updateOrderStatus(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { 
      customer: { 
        select: { 
          email: true, 
          lineUserId: true,
          name: true
        } 
      } 
    },
  });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: { include: { options: true, menuItem: { select: { id: true, nameTranslations: true } } } },
    },
  });

  // Trigger ERP stock deduction in PizzaMaster when confirmed
  if (status === 'CONFIRMED' || status === 'PREPARING') {
    notifyPizzaMasterOfDeduction(updated).catch(err => 
      console.error('[ERP Integration] Async inventory deduction call failed:', err)
    );
  }

  auditLog(req, { action: 'update', entity: 'Order', entityId: id, details: { status, previousStatus: order.status } });

  emitOrderStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    orderType: updated.orderType,
    customerId: updated.customerId,
    locationId: updated.locationId,
    paymentStatus: updated.paymentStatus,
  });

  // Send status update email if enabled in settings
  const recipientEmail = order.customer?.email || order.guestEmail;
  if (recipientEmail) {
    let shouldSend = true;
    let formattedEmailMessage = '';
    try {
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      const orderSettings = (settings?.orderSettings as any) || {};
      const notifications = orderSettings.emailNotifications || {};
      if (notifications[status] === false) {
        shouldSend = false;
      }
      
      // Check customer preference
      const customer = order.customerId ? await prisma.customer.findUnique({ where: { id: order.customerId } }) : null;
      if (customer && customer.emailNotificationsEnabled === false) {
        shouldSend = false;
      }

      if (shouldSend) {
        const lineSettings = (settings?.lineSettings as any) || {};
        const lineNotifications = lineSettings.notifications || {};
        
        const orderLang = (order as any).language || 'zh-TW';
        const langKey = defaultStatusLocales[orderLang] ? orderLang : 'en';

        const statusConfig = lineNotifications[status];
        let template = '';
        let isPreTranslated = false;

        if (statusConfig) {
          if (langKey === 'zh-TW') {
            template = statusConfig.message || '';
            isPreTranslated = true;
          } else if (statusConfig.translations?.[langKey]) {
            template = statusConfig.translations[langKey];
            isPreTranslated = true;
          } else if (statusConfig.message) {
            template = statusConfig.message;
          }
        }

        if (!template) {
          template = defaultStatusLocales[langKey][status] || '';
          isPreTranslated = true;
        }

        if (template) {
          const generalSettings = (settings?.generalSettings as any) || {};
          const timezone = generalSettings.timezone || 'Asia/Taipei';
          let formattedMsg = formatNotificationMessage(template, updated, order.customer, timezone);
          
          if (!isPreTranslated && statusConfig?.message) {
            try {
              const { translateContent } = await import('../lib/ai.js');
              const transResult = await translateContent(formattedMsg, [orderLang], 'Traditional Chinese');
              if (transResult && transResult[orderLang]) {
                formattedMsg = transResult[orderLang];
              }
            } catch (err) {
              console.error('[AI Translation] Email status update dynamic translation fallback failed:', err);
            }
          }
          formattedEmailMessage = formattedMsg;
        }
      }
    } catch (e) {}

    if (shouldSend) {
      const orderLang = (order as any).language || 'zh-TW';
      const emailContent = orderStatusEmail(
        { orderNumber: order.orderNumber, status },
        formattedEmailMessage || undefined,
        orderLang
      );

      sendEmail({
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        locationId: updated.locationId,
      }).catch(() => {});
    }
  }

  // Send LINE push notification if customer has bound LINE account
  console.log(`[LINE Notify] Checking notification for Order #${order.orderNumber}. Status: ${status}`);
  if (order.customer?.lineUserId) {
    try {
      // Check customer preference
      const customer = await prisma.customer.findUnique({ 
        where: { id: order.customerId! },
        select: { lineNotificationsEnabled: true }
      });
      
      if (customer?.lineNotificationsEnabled === false) {
        console.log('[LINE Notify] Customer disabled LINE notifications. Skipping.');
        return;
      }

      console.log(`[LINE Notify] Found lineUserId: ${order.customer.lineUserId} for customer: ${order.customer.name}`);
      const { sendLinePush } = await import('./line.controller.js');
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      
      if (!settings) {
        console.error('[LINE Notify] Could not find SiteSettings with ID "default"');
      }

      const lineSettings = (settings?.lineSettings as any) || {};
      const lineNotifications = lineSettings.notifications || {};

      // Check if this status has a specific setting in lineSettings
      const statusConfig = lineNotifications[status];
      const isEnabled = statusConfig ? statusConfig.enabled !== false : !!defaultStatusLocales['zh-TW'][status];
      
      const orderLang = (order as any).language || 'zh-TW';
      const langKey = defaultStatusLocales[orderLang] ? orderLang : 'en';

      let template = '';
      let isPreTranslated = false;

      if (statusConfig) {
        if (langKey === 'zh-TW') {
          template = statusConfig.message || '';
          isPreTranslated = true;
        } else if (statusConfig.translations?.[langKey]) {
          template = statusConfig.translations[langKey];
          isPreTranslated = true;
        } else if (statusConfig.message) {
          template = statusConfig.message;
        }
      }

      if (!template) {
        template = defaultStatusLocales[langKey][status] || '';
        isPreTranslated = true;
      }

      console.log(`[LINE Notify] isEnabled: ${isEnabled}, template: ${template}`);

      if (isEnabled && template) {
        const generalSettings = (settings?.generalSettings as any) || {};
        const timezone = generalSettings.timezone || 'Asia/Taipei';
        const formattedMessage = formatNotificationMessage(template, updated, order.customer, timezone);
        const prefixObj = linePrefixLocales[langKey] || linePrefixLocales['en'];
        const prefix = prefixObj.update;

        const sendLinePushAsync = async () => {
          let lineMessage = `${prefix}\n${prefixObj.orderNumber}：#${order.orderNumber}\n${prefixObj.status}：${formattedMessage}`;

          if (!isPreTranslated && statusConfig?.message) {
            try {
              const { translateContent } = await import('../lib/ai.js');
              const rawMessageToTranslate = `${prefix}\n${prefixObj.status}：${formattedMessage}`;
              const transResult = await translateContent(rawMessageToTranslate, [orderLang], 'Traditional Chinese');
              if (transResult && transResult[orderLang]) {
                lineMessage = `${prefix}\n${prefixObj.orderNumber}：#${order.orderNumber}\n${transResult[orderLang]}`;
              }
            } catch (err) {
              console.error('[AI Translation] LINE status update dynamic translation fallback failed:', err);
            }
          }

          console.log(`[LINE Notify] Sending message to LINE...`);
          sendLinePush(order.customer!.lineUserId!, lineMessage).then(() => {
            console.log('[LINE Notify] sendLinePush call completed');
          }).catch(err => {
            console.error('[LINE Notify] sendLinePush FAILED:', err);
          });
        };
        sendLinePushAsync().catch(() => {});
      } else {
        console.log(`[LINE Notify] Notification skipped: isEnabled=${isEnabled}, hasMessage=${!!template}`);
      }
    } catch (err) {
      console.error('[LINE Notify] CRITICAL ERROR in notification logic:', err);
    }
  } else {
    console.log('[LINE Notify] Customer has no bound lineUserId. Skipping.');
  }

  // Emit event for automation rules
  try {
    const { appEvents } = await import('../lib/events.js');
    appEvents.emit('order.statusChanged', { order: updated, previousStatus: order.status });
  } catch {}

  res.json({ success: true, data: updated });
}

export async function updateOrderDiscount(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const { adjustedTotal, discount } = req.body;

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Calculate new total and discount
  let newDiscount = order.discount;
  let newTotal = order.total;
  const originalCostBeforeDiscount = order.subtotal + order.tax + order.deliveryFee + order.tip;

  if (typeof adjustedTotal === 'number' && adjustedTotal >= 0) {
    newDiscount = Math.max(0, originalCostBeforeDiscount - adjustedTotal);
    newTotal = adjustedTotal;
  } else if (typeof discount === 'number' && discount >= 0) {
    newDiscount = discount;
    newTotal = Math.max(0, originalCostBeforeDiscount - discount);
  } else {
    res.status(400).json({ success: false, error: 'Either adjustedTotal or discount must be a non-negative number' });
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      discount: newDiscount,
      total: newTotal,
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      location: { select: { id: true, name: true } },
      items: {
        include: {
          menuItem: { select: { id: true, name: true, nameTranslations: true, slug: true } },
          options: {
            include: {
              menuOptionValue: { select: { id: true, nameTranslations: true } }
            }
          },
        },
      },
    },
  });

  auditLog(req, {
    action: 'update',
    entity: 'Order',
    entityId: id,
    details: {
      action: 'discount_adjustment',
      previousTotal: order.total,
      newTotal: newTotal,
      previousDiscount: order.discount,
      newDiscount: newDiscount,
    }
  });

  emitOrderStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    orderType: updated.orderType,
    customerId: updated.customerId,
    locationId: updated.locationId,
  });

  res.json({ success: true, data: updated });
}

export async function cancelOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user;

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Only allowed to cancel if status is PENDING
  if (order.status !== 'PENDING') {
    res.status(400).json({ success: false, error: 'Only pending orders can be cancelled' });
    return;
  }

  // Permission check
  let isOwner = false;
  if (user) {
    if (user.type === 'staff') {
      isOwner = true; // Staff can always cancel
    } else if (order.customerId === user.id) {
      isOwner = true;
    }
  } else {
    // For guests, we rely on the fact they have the unique order ID (CUID)
    // and that the order is a guest order.
    if (!order.customerId) {
      isOwner = true; 
    }
  }

  if (!isOwner) {
    res.status(403).json({ success: false, error: 'You do not have permission to cancel this order' });
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  auditLog(req, { action: 'update', entity: 'Order', entityId: id, details: { status: 'CANCELLED', previousStatus: order.status, cancelledBy: user ? 'user' : 'guest' } });

  emitOrderStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    orderType: updated.orderType,
    customerId: updated.customerId,
    locationId: updated.locationId,
  });

  res.json({ success: true, data: updated });
}

export async function deleteOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Delete associated items and options first (if not handled by cascade)
  // Our schema usually handles this with onDelete: Cascade, but let's be safe or just delete the order
  await prisma.order.delete({
    where: { id },
  });

  auditLog(req, { action: 'delete', entity: 'Order', entityId: id, details: { orderNumber: order.orderNumber } });

  res.json({ success: true, message: 'Order deleted successfully' });
}

export async function exportOrders(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ success: false, error: 'Start date and end date are required' });
    return;
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  end.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      customer: { select: { name: true, email: true } },
      location: { select: { name: true } },
      items: {
        include: {
          options: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const exportData = orders.map((order) => ({
    'Order Number': order.orderNumber,
    'Date': order.createdAt.toLocaleString(),
    'Customer': order.customer?.name || order.guestName || 'Guest',
    'Email': order.customer?.email || order.guestEmail || '',
    'Type': order.orderType,
    'Status': order.status,
    'Location': order.location.name,
    'Subtotal': order.subtotal,
    'Tax': order.tax,
    'Delivery Fee': order.deliveryFee,
    'Discount': order.discount,
    'Total': order.total,
    'Items Count': order.items.length,
    'Items Details': order.items.map(i => `${i.name} x${i.quantity}`).join(', '),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename="orders_${startDate}_${endDate}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

export async function downloadOrderTemplate(req: Request, res: Response): Promise<void> {
  const templateData = [
    {
      'Order Number': 'SH-SAMPLE-001',
      'Date': new Date().toISOString().split('T')[0],
      'Customer': '王小明',
      'Email': 'customer@example.com',
      'Phone': '0912345678',
      'Type': 'PICKUP',
      'Status': 'DELIVERED',
      'Location': 'Main Store',
      'Total': 100.00,
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="order_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

export async function importOrders(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get all locations for mapping
    const locations = await prisma.location.findMany();
    const locationMap = new Map(locations.map(l => [l.name.toLowerCase(), l.id]));

    for (const row of data) {
      try {
        const orderNumber = row['Order Number'] || row['orderNumber'] || generateOrderNumber();
        const total = parseFloat(row['Total'] || row['total'] || '0');
        const orderType = (row['Type'] || row['orderType'] || 'PICKUP').toUpperCase() as any;
        const status = (row['Status'] || row['status'] || 'DELIVERED').toUpperCase() as any;
        const createdAt = row['Date'] || row['createdAt'] ? new Date(row['Date'] || row['createdAt']) : new Date();
        const locationName = row['Location'] || row['locationName'];
        
        let locationId = row['locationId'];
        if (!locationId && locationName) {
          locationId = locationMap.get(locationName.toLowerCase());
        }

        if (!locationId) {
          if (locations.length > 0) {
            locationId = locations[0].id;
          } else {
            throw new Error(`Location not found: ${locationName}`);
          }
        }

        const guestName = row['Customer'] || row['guestName'] || 'Imported Guest';
        const guestEmail = row['Email'] || row['guestEmail'];
        const guestPhone = row['Phone'] || row['guestPhone'];

        const order = await prisma.order.create({
          data: {
            orderNumber,
            total,
            subtotal: total, // Simple mapping
            orderType,
            status,
            createdAt,
            locationId,
            guestName,
            guestEmail,
            guestPhone,
            items: {
              create: {
                name: 'Imported Order Item',
                quantity: 1,
                unitPrice: total,
                subtotal: total,
                menuItemId: (await prisma.menuItem.findFirst())?.id || 'placeholder',
              }
            }
          }
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row ${results.success + results.failed}: ${err.message}`);
      }
    }

    auditLog(req, { action: 'create', entity: 'Order', details: { action: 'bulk_import', ...results } });

    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
// ============================================================
// ORDER STATUS REMINDERS
// ============================================================

export async function checkOrderReminders(req: Request, res: Response): Promise<void> {
  // Find orders that are PENDING or CONFIRMED for more than 15 mins
  // Or READY for more than 30 mins
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

  const staleOrders = await prisma.order.findMany({
    where: {
      OR: [
        { status: 'PENDING', createdAt: { lt: fifteenMinsAgo } },
        { status: 'CONFIRMED', createdAt: { lt: fifteenMinsAgo } },
        { status: 'READY', updatedAt: { lt: thirtyMinsAgo } },
      ],
    },
    include: {
      customer: { select: { email: true, name: true } },
    }
  });

  if (staleOrders.length === 0) {
    res.json({ success: true, data: { message: 'No stale orders found', count: 0 } });
    return;
  }

  const results = await Promise.allSettled(
    staleOrders.map(order => {
      const email = order.customer?.email || order.guestEmail;
      if (!email) return Promise.resolve();

      let message = '';
      if (order.status === 'READY') {
        message = `Your order #${order.orderNumber} is ready for pickup! Please come and get it.`;
      } else {
        message = `We are still working on your order #${order.orderNumber}. We apologize for the delay and will update you soon!`;
      }

      return sendEmail({
        to: email,
        subject: `Update on your order #${order.orderNumber}`,
        text: message,
        html: `<p>${message}</p>`,
        locationId: order.locationId
      });
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;

  auditLog(req, { 
    action: 'update', 
    entity: 'Order', 
    details: { action: 'status_reminders', count: staleOrders.length, successful } 
  });

  res.json({
    success: true,
    data: {
      message: `Sent reminders for ${successful} orders`,
      totalStale: staleOrders.length,
      successful
    }
  });
}

export async function lookupOrder(req: Request, res: Response): Promise<void> {
  const { email, phone, orderNumber } = req.query;

  if (!orderNumber) {
    res.status(400).json({ success: false, error: 'Order number is required' });
    return;
  }

  if (!email && !phone) {
    res.status(400).json({ success: false, error: 'Either email or phone is required' });
    return;
  }

  const conditions: any[] = [];
  if (email) {
    conditions.push({ guestEmail: email as string });
    conditions.push({ customer: { email: email as string } });
  }
  if (phone) {
    conditions.push({ guestPhone: phone as string });
    conditions.push({ customer: { phone: phone as string } });
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber: orderNumber as string,
      OR: conditions
    },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      createdAt: true,
      total: true,
      orderType: true
    }
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found with these details' });
    return;
  }

  res.json({ success: true, data: order });
}


export async function claimOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const customerId = req.user?.id;

  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  if (order.customerId) {
    res.status(400).json({ success: false, error: 'Order is already linked to an account' });
    return;
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { customerId },
  });

  auditLog(req, { action: 'update', entity: 'Order', entityId: id, details: { action: 'claim', customerId } });

  res.json({ success: true, data: updatedOrder });
}

export async function updateOrderPaymentStatus(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  const validStatuses = ['PAID', 'UNPAID'];
  if (paymentStatus !== null && paymentStatus !== undefined && !validStatuses.includes(paymentStatus)) {
    res.status(400).json({ success: false, error: `Invalid paymentStatus. Must be one of: ${validStatuses.join(', ')} or null` });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
  });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { paymentStatus: paymentStatus || null },
  });

  auditLog(req, { 
    action: 'update', 
    entity: 'Order', 
    entityId: id, 
    details: { paymentStatus: updated.paymentStatus, previousPaymentStatus: order.paymentStatus } 
  });

  emitOrderStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    orderType: updated.orderType,
    customerId: updated.customerId,
    locationId: updated.locationId,
    paymentStatus: updated.paymentStatus,
  } as any);

  res.status(200).json({ success: true, data: updated });
}

export async function addOrderPayment(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const { amount, method } = req.body;

  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ success: false, error: 'Invalid amount' });
    return;
  }

  const validMethods = ['CASH', 'STRIPE', 'PAYPAL', 'LINE_PAY', 'CREDIT_CARD'];
  if (!validMethods.includes(method)) {
    res.status(400).json({ success: false, error: `Invalid method. Must be one of: ${validMethods.join(', ')}` });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { payments: true }
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Create payment
  await prisma.payment.create({
    data: {
      orderId: id,
      amount,
      method: method as PaymentMethod,
      status: 'COMPLETED' as PaymentStatus,
    }
  });

  // Calculate new total paid
  const totalPaid = order.payments.reduce((sum, p) => sum + (p.status === 'COMPLETED' ? p.amount : 0), 0) + amount;

  let updatedOrder = order;
  if (totalPaid >= order.total && order.paymentStatus !== 'PAID') {
    updatedOrder = await prisma.order.update({
      where: { id },
      data: { paymentStatus: 'PAID' },
      include: { payments: true }
    });

    emitOrderStatusUpdate({
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      orderType: updatedOrder.orderType,
    });
  }

  auditLog(req, { 
    action: 'create', 
    entity: 'Payment', 
    entityId: id, 
    details: { amount, method, newTotalPaid: totalPaid } 
  });

  // Send generic order refresh so CounterDisplay fetches new payment data
  const io = getIO();
  if (io) {
    io.to(`kitchen:${order.locationId}`).emit('order:statusUpdate', { id });
  }

  res.json({ success: true, data: updatedOrder });
}

export async function calculateOrderSummary(req: Request, res: Response): Promise<void> {
  const {
    items = [],
    orderType = 'PICKUP',
    locationId,
    couponCode,
    loyaltyPointsRedeem = 0,
    address,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: '購物車不得為空' });
    return;
  }

  // Get location
  const location = await prisma.location.findFirst({
    where: { 
      ...(locationId ? { id: locationId } : { isActive: true })
    },
  });

  if (!location) {
    res.status(400).json({ success: false, error: 'Location not found' });
    return;
  }

  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const orderSettings = (siteSettings?.orderSettings as any) || {};

  // Fetch menu items to validate and get prices
  const menuItemIds = items.map((i: any) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: {
      options: { include: { values: true } },
      category: true,
    },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  let subtotal = 0;
  
  // Fetch all option values
  const allOptionValueIds = items.flatMap((i: any) => (i.options || []).map((o: any) => o.menuOptionValueId)).filter(Boolean);
  const dbOptionValues = await prisma.menuOptionValue.findMany({
    where: { id: { in: allOptionValueIds } }
  });
  const optionValueMap = new Map(dbOptionValues.map(v => [v.id, v]));

  const engineCartItems: Array<{
    menuItemId: string;
    categoryId: string;
    price: number;
    quantity: number;
  }> = [];

  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem || !menuItem.isActive) continue;

    let unitPrice = menuItem.price;
    (item.options || []).forEach((opt: any) => {
      const dbValue = optionValueMap.get(opt.menuOptionValueId);
      if (dbValue) {
        unitPrice += dbValue.priceModifier;
      }
    });

    const isRedeemed = !!item.redeemedWithPoints;
    if (!isRedeemed) {
      subtotal += unitPrice * item.quantity;
      engineCartItems.push({
        menuItemId: item.menuItemId,
        categoryId: menuItem.categoryId,
        price: unitPrice,
        quantity: item.quantity,
      });
    }
  }

  // Calculate delivery fee
  let deliveryFee = 0;
  if (orderType === 'DELIVERY') {
    if (address?.lat != null && address?.lng != null) {
      const zones = await prisma.deliveryZone.findMany({
        where: { locationId: location.id, isActive: true },
      });

      let matchedZone = null;
      for (const zone of zones) {
        if (zone.boundaries && Array.isArray(zone.boundaries)) {
          if (isPointInPolygon(address.lat, address.lng, zone.boundaries as [number, number][])) {
            matchedZone = zone;
            break;
          }
        }
      }
      if (matchedZone) {
        deliveryFee = matchedZone.charge;
      } else {
        deliveryFee = 4.99;
      }
    } else {
      const defaultZone = await prisma.deliveryZone.findFirst({
        where: { locationId: location.id, isActive: true },
        orderBy: { charge: 'asc' },
      });
      deliveryFee = defaultZone ? defaultZone.charge : 4.99;
    }
  } else if (orderType === 'FROZEN_DELIVERY') {
    deliveryFee = orderSettings.frozenDeliveryFee !== undefined ? Number(orderSettings.frozenDeliveryFee) : 0;
  }

  // Loyalty points redemption
  let loyaltyDiscount = 0;
  let redeemRate = 100.0;
  if (orderSettings.loyaltyRedeemRate !== undefined) redeemRate = Number(orderSettings.loyaltyRedeemRate);

  if (loyaltyPointsRedeem && loyaltyPointsRedeem > 0) {
    const advancedSettings = (siteSettings?.advancedSettings as any) || {};
    const redemptionRules = advancedSettings.loyaltyRedemptionRules || {};
    let maxRedemptionForCart = 0;

    items.forEach((item: any) => {
      if (item.redeemedWithPoints) return;
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) return;
      let unitPrice = menuItem.price;
      (item.options || []).forEach((opt: any) => {
        const dbValue = optionValueMap.get(opt.menuOptionValueId);
        unitPrice += dbValue ? dbValue.priceModifier : 0;
      });
      const itemSubtotal = unitPrice * item.quantity;
      const rule = redemptionRules[item.menuItemId] || { isRedeemable: false, maxRedemptionAmount: 0 };
      if (rule.isRedeemable) {
        const allowedDiscount = rule.maxRedemptionAmount > 0 
          ? Math.min(itemSubtotal, item.quantity * rule.maxRedemptionAmount)
          : itemSubtotal;
        maxRedemptionForCart += allowedDiscount;
      }
    });

    const proposedDiscount = loyaltyPointsRedeem / redeemRate;
    loyaltyDiscount = Math.min(proposedDiscount, maxRedemptionForCart);
  }

  let currentTaxRate = orderSettings.taxRate !== undefined ? Number(orderSettings.taxRate) : 0;
  if (isNaN(currentTaxRate)) currentTaxRate = 0;

  // Calculate discount using Unified Discount Engine
  let couponDiscount = 0;
  let freeDelivery = false;
  let appliedPromo: { id: string, name: string, code?: string | null } | null = null;

  // A. Automatic promotions
  const autoPromo = await findAndApplyBestAutomaticDiscount(
    { subtotal, orderType: orderType as any, locationId: location.id },
    engineCartItems
  );
  if (autoPromo.campaign) {
    couponDiscount = autoPromo.discountAmount;
    freeDelivery = autoPromo.freeDelivery;
    appliedPromo = { id: autoPromo.campaign.id, name: autoPromo.campaign.name, code: autoPromo.campaign.code };
  }

  // B. Manual coupon override
  let manualCouponError = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!coupon) {
      manualCouponError = '無效的優惠碼';
    } else {
      const validation = validateAndCalculateDiscount(
        coupon,
        { subtotal, orderType: orderType as any, locationId: location.id },
        engineCartItems
      );
      if (!validation.isValid) {
        manualCouponError = validation.reason || '此優惠碼目前無法套用';
      } else {
        if (validation.freeDelivery) {
          freeDelivery = true;
        }
        if (validation.discountAmount > 0) {
          couponDiscount += validation.discountAmount;
        }
        appliedPromo = { id: coupon.id, name: coupon.name, code: coupon.code };
      }
    }
  }

  if (freeDelivery) {
    deliveryFee = 0;
  }

  const tax = subtotal * (currentTaxRate / 100);
  const unroundedTotal = Math.max(0, subtotal + tax + deliveryFee - loyaltyDiscount - couponDiscount);
  
  const generalSettings = typeof siteSettings?.generalSettings === 'string' 
    ? JSON.parse(siteSettings.generalSettings) 
    : siteSettings?.generalSettings || {};
  const currencyDecimals = generalSettings.currencyDecimals !== undefined ? Number(generalSettings.currencyDecimals) : 2;
  
  const total = Number(unroundedTotal.toFixed(currencyDecimals));

  res.json({
    success: true,
    data: {
      subtotal,
      tax,
      deliveryFee,
      loyaltyDiscount,
      couponDiscount,
      total,
      freeDelivery,
      appliedPromo,
      manualCouponError
    }
  });
}

