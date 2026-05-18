import { translateContent } from './ai.js';

const baseline = {
  'PLACED': '您好{使用者}，您的訂單{訂單編號}已成功建立！\n餐點內容：{餐點內容}\n取餐時間：{取餐時間/做好馬上取}',
  'CONFIRMED': '您好{使用者}，您的訂單{訂單編號}已確認，我們將盡快為您準備。',
  'PREPARING': '您的餐點正在製作中！',
  'READY': '🎉 您好{使用者}，您的訂單{訂單編號}已準備就緒！歡迎前往取貨。',
  'OUT_FOR_DELIVERY': '🚀 您的訂單{訂單編號}已由外送員取走，正在前往您的地址！',
  'DELIVERED': '🍽️ 您的餐點已送達，祝您用餐愉快！',
  'CANCELLED': '您的訂單{訂單編號}已被取消。如有任何疑問，請聯繫我們。'
};

const languages = ['de', 'es', 'fr', 'id', 'it', 'pt', 'th', 'tl', 'vi'];
const langNames: Record<string, string> = {
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  id: 'Indonesian',
  it: 'Italian',
  pt: 'Portuguese',
  th: 'Thai',
  tl: 'Tagalog',
  vi: 'Vietnamese'
};

async function run() {
  const result: any = {};
  for (const lang of languages) {
    result[lang] = {};
    for (const [key, value] of Object.entries(baseline)) {
      try {
        const prompt = `
          You are a professional translator for a food ordering platform.
          Translate the following sentence from Traditional Chinese into ${langNames[lang]}.
          Keep the variables inside curly brackets exactly as they are (e.g. {使用者}, {訂單編號}, {餐點內容}, {取餐時間/做好馬上取}). Do not translate the text inside curly brackets!
          
          Sentence:
          ${value}
          
          Return ONLY the translated string, with no added commentary or markdown.
        `;
        const translated = await translateContent(prompt, [lang], 'Traditional Chinese');
        // Clean markdown response
        let text = translated[lang] || translated;
        if (text.startsWith('```')) {
          text = text.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
        }
        result[lang][key] = text.trim();
      } catch (err: any) {
        console.error(`Failed to translate ${key} into ${lang}:`, err.message);
      }
    }
  }
  console.log('TRANSLATED_JSON_START');
  console.log(JSON.stringify(result, null, 2));
  console.log('TRANSLATED_JSON_END');
}

run();
