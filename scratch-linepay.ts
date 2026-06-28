import { LinePayClient } from './packages/server/src/lib/linepay.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const linePay = new LinePayClient();
  const payload = {
    amount: 8.99,
    currency: 'TWD',
    orderId: 'test_order_' + Date.now(),
    packages: [
      {
        id: `pkg_123`,
        amount: 8.99,
        products: [
          {
            name: 'Test Product',
            quantity: 1,
            price: 8.99,
          }
        ],
      },
    ],
    redirectUrls: {
      confirmUrl: 'http://localhost/confirm',
      cancelUrl: 'http://localhost/cancel',
    },
  };
  
  try {
    const res = await linePay.requestPayment(payload);
    console.log(res);
  } catch(e) {
    console.error('ERROR', e);
  }
}
test();
