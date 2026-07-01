import { ECPayInvoiceProvider } from './packages/api-server/src/lib/invoice.js';

async function run() {
  const settings = {
    enabled: true,
    provider: 'ecpay',
    merchantId: '2000132',
    hashKey: 'ejCk326UnaZWKisg',
    hashIv: 'q9jcZX8Ib9LM8wYk'
  };

  const provider = new ECPayInvoiceProvider(settings);
  
  const payload = {
    orderId: 'TEST12345',
    amount: 100,
    items: [
      { name: '測試商品', price: 100, quantity: 1 }
    ],
    customerName: '測試客',
    customerEmail: 'test@example.com'
  };

  try {
    const result = await provider.issueInvoice(payload);
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
