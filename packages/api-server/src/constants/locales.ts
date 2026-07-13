export const guestNames: Record<string, string> = {
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

export const asapLabels: Record<string, string> = {
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

export const linePrefixLocales: Record<string, { placed: string; update: string; orderNumber: string; total: string; status: string }> = {
  'zh-TW': { placed: '【訂單建立成功】', update: '【訂單狀態更新】', orderNumber: '訂單編號', total: '總計', status: '目前狀態' },
  'ko': { placed: '【주문 완료】', update: '【주문 상태 업데이트】', orderNumber: '주문 번호', total: '합계', status: '현재 상태' },
  'en': { placed: '【Order Placed Successfully】', update: '【Order Status Update】', orderNumber: 'Order Number', total: 'Total', status: 'Current Status' },
  'ja': { placed: '【ご注文完了】', update: '【ご注文状況の更新】', orderNumber: '注文番号', total: '合計金額', status: '現在の状況' },
  'de': { placed: '【Bestellung erfolgreich aufgegeben】', update: '【Bestellstatus-Aktualisierung】', orderNumber: 'Bestellnummer', total: 'Gesamtbetrag', status: 'Aktueller Status' },
  'es': { placed: '【Pedido realizado correctamente】', update: '【Actualización del estado del pedido】', orderNumber: 'Número de pedido', total: 'Total', status: 'Estado actual' },
  'fr': { placed: '【Commande passée avec succès】', update: '【Mise à jour du statut de la commande】', orderNumber: 'Numéro de commande', total: 'Total', status: 'Statut actuel' },
  'id': { placed: '【Pesanan Berhasil Dibuat】', update: '【Pembaruan Status Pesanan】', orderNumber: 'Nomor Pesanan', total: 'Total', status: 'Status Saat Ini' },
  'it': { placed: '【Ordine effettuato con successo】', update: '【Aggiornamento dello stato dell\'ordine】', orderNumber: 'Numero d\'ordine', total: 'Totale', status: 'Stato attuale' },
  'pt': { placed: '【Pedido efetuado com sucesso】', update: '【Atualização do estado do pedido】', orderNumber: 'Número do pedido', total: 'Total', status: 'Estado atual' },
  'th': { placed: '【สั่งซื้อสินค้าสำเร็จแล้ว】', update: '【อัปเดตสถานะคำสั่งซื้อ】', orderNumber: 'หมายเลขคำสั่งซื้อ', total: 'ยอดรวม', status: 'สถานะปัจจุบัน' },
  'tl': { placed: '【Matagumpay na Naisumite ang Order】', update: '【Update sa Status ng Order】', orderNumber: 'Numero ng Order', total: 'Kabuuan', status: 'Kasalukuyang Status' },
  'vi': { placed: '【Đặt hàng thành công】', update: '【Cập nhật trạng thái đơn hàng】', orderNumber: 'Mã đơn hàng', total: 'Tổng cộng', status: 'Trạng thái hiện tại' }
};

export const defaultStatusLocales: Record<string, Record<string, string>> = {
  'zh-TW': {
    'PLACED': '您好{使用者}，您的訂單{訂單編號}已成功建立！\n餐點內容：{餐點內容}\n取餐時間：{取餐時間/做好馬上取}',
    'CONFIRMED': '您好{使用者}，您的訂單{訂單編號}已確認，我們將盡快為您準備。',
    'PREPARING': '您的餐點正在製作中！',
    'READY': '🎉 您好{使用者}，您的訂單{訂單編號}已準備就緒！歡迎前往取貨。',
    'OUT_FOR_DELIVERY': '🚀 您的訂單{訂單編號}已由外送員取走，正在前往您的地址！',
    'DELIVERED': '🍽️ 您的餐點已送達，祝您用餐愉快！',
    'CANCELLED': '您的訂單{訂單編號}已被取消。如有任何疑問，請聯繫我們。'
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
    'PLACED': 'Ciao {使用者}, il tuo ordine {訂單編號} è stato creato con successo!\nDettaglio ordini: {餐點內容}\nOrario di ritiro: {取餐時間/做好马上取}',
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
    'PLACED': 'Kamusta {使用者}, ang iyong order {訂單編號} ay matagumpay na natanggap!\nNilalaman: {餐點內容}\nOras ng pickup: {取餐時間/做好马上取}',
    'CONFIRMED': 'Kamusta {使用者}, ang iyong order {訂單編號} ay kumpirmado na. Ihahanda namin ito sa lalong madaling panahon.',
    'PREPARING': 'Inihahanda na ang iyong pagkain!',
    'READY': '🎉 Kamusta {使用者}, ang iyong order {訂單編號} ay handa na! Maligayang pagdating upang kunin ito.',
    'OUT_FOR_DELIVERY': '🚀 Ang iyong order {訂單編號} ay kasalukuyang dine-deliver! Darating ito sa iyong address sa lalong madaling panahon.',
    'DELIVERED': '🍽️ Naihatid na ang iyong pagkain. Masiyahan sa iyong pagkain!',
    'CANCELLED': 'Ang iyong order {訂單編號} ay kinansela. Kung mayroon kang anumang mga katanungan, mangyaring makipag-ugnay sa amin.'
  },
  'vi': {
    'PLACED': 'Xin chào {使用者}, đơn hàng {訂單編號} của bạn đã được khởi tạo thành công!\nMón ăn: {餐點內容}\nThời gian nhận: {取餐時間/做好马上取}',
    'CONFIRMED': 'Xin chào {使用者}, đơn hàng {訂單編號} của bạn đã được xác nhận. Chúng tôi sẽ chuẩn bị nhanh nhất có thể.',
    'PREPARING': 'Món ăn của bạn đang được chuẩn bị!',
    'READY': '🎉 Xin chào {使用者}, đơn hàng {訂單編號} của bạn đã sẵn sàng! Mời bạn đến nhận món.',
    'OUT_FOR_DELIVERY': '🚀 Đơn hàng {訂單編號} của bạn đang được giao! Sẽ sớm giao đến địa chỉ của bạn.',
    'DELIVERED': '🍽️ Món ăn đã được giao thành công. Chúc bạn ngon miệng!',
    'CANCELLED': 'Đơn hàng {訂單編號} của bạn đã bị hủy. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.'
  }
};
