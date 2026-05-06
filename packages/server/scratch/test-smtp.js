const nodemailer = require('nodemailer');

// --- 請填寫您的設定 ---
const config = {
  host: 'smtp.gmail.com',
  port: 587,               // 或是 587
  user: 'shutter211001@gmail.com',
  pass: 'kddudyzjikwoxywx',   // 請填入 16 位元的 App Password
  encryption: 'tls',       // 若 Port 465 請用 ssl，若 587 請用 tls
  to: 'shutter211001@gmail.com'
};
// ----------------------

async function test() {
  console.log(`正在測試連線至 ${config.host}:${config.port}...`);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.encryption === 'ssl',
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      // 避免某些本地端憑證問題
      rejectUnauthorized: false
    }
  });

  try {
    console.log('正在發送測試郵件...');
    const info = await transporter.sendMail({
      from: `"Test" <${config.user}>`,
      to: config.to,
      subject: 'Local SMTP Test',
      text: 'Hello from local test script!',
    });
    console.log('✅ 發送成功！');
    console.log('回應:', info.response);
  } catch (err) {
    console.error('❌ 發送失敗');
    console.error('錯誤代碼:', err.code);
    console.error('詳細訊息:', err.message);
  }
}

test();
