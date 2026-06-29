import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { HttpsProxyAgent } from 'https-proxy-agent';
import JSONBig from 'json-bigint';

export interface LinePayProduct {
  name: string;
  quantity: number;
  price: number;
}

export interface LinePayPackage {
  id: string;
  amount: number;
  products: LinePayProduct[];
}

export interface LinePayPayload {
  amount: number;
  currency: 'TWD';
  orderId: string;
  packages: LinePayPackage[];
  redirectUrls: {
    confirmUrl: string;
    cancelUrl: string;
  };
}

export interface LinePayConfirmPayload {
  amount: number;
  currency: 'TWD';
}

export class LinePayClient {
  private channelId: string;
  private channelSecret: string;
  private apiUrl: string;

  constructor() {
    this.channelId = process.env.LINE_PAY_CHANNEL_ID || '';
    this.channelSecret = process.env.LINE_PAY_CHANNEL_SECRET || '';
    this.apiUrl = process.env.LINE_PAY_API_URL || 'https://sandbox-api-pay.line.me';

    if (!this.channelId || !this.channelSecret) {
      console.warn('[LINE Pay] Warning: LINE_PAY_CHANNEL_ID or LINE_PAY_CHANNEL_SECRET is not configured.');
    }
  }

  private generateSignature(uri: string, payload: any, nonce: string): string {
    const stringToSign = `${this.channelSecret}${uri}${JSON.stringify(payload)}${nonce}`;
    return crypto.createHmac('sha256', this.channelSecret).update(stringToSign).digest('base64');
  }

  async requestPayment(payload: LinePayPayload) {
    const uri = '/v3/payments/request';
    const nonce = uuidv4();
    const signature = this.generateSignature(uri, payload, nonce);

    const config: any = {
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': this.channelId,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
      },
      transformResponse: [(data: any) => {
        try {
          return JSONBig({ storeAsString: true }).parse(data);
        } catch (e) {
          return data;
        }
      }],
    };

    if (process.env.LINE_PAY_PROXY_URL) {
      config.httpsAgent = new HttpsProxyAgent(process.env.LINE_PAY_PROXY_URL);
    }

    try {
      const response = await axios.post(`${this.apiUrl}${uri}`, payload, config);
      return response.data;
    } catch (error: any) {
      const errData = typeof error.response?.data === 'string' 
        ? JSONBig({ storeAsString: true }).parse(error.response.data) 
        : error.response?.data;
      console.error('LINE Pay Request Error:', errData || error.message);
      throw new Error(errData?.returnMessage || 'Failed to request LINE Pay payment');
    }
  }

  async confirmPayment(transactionId: string, payload: LinePayConfirmPayload) {
    const uri = `/v3/payments/${transactionId}/confirm`;
    const nonce = uuidv4();
    const signature = this.generateSignature(uri, payload, nonce);

    const config: any = {
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': this.channelId,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
      },
      transformResponse: [(data: any) => {
        try {
          return JSONBig({ storeAsString: true }).parse(data);
        } catch (e) {
          return data;
        }
      }],
    };

    if (process.env.LINE_PAY_PROXY_URL) {
      config.httpsAgent = new HttpsProxyAgent(process.env.LINE_PAY_PROXY_URL);
    }

    try {
      const response = await axios.post(`${this.apiUrl}${uri}`, payload, config);
      return response.data;
    } catch (error: any) {
      const errData = typeof error.response?.data === 'string' 
        ? JSONBig({ storeAsString: true }).parse(error.response.data) 
        : error.response?.data;
      console.error('LINE Pay Confirm Error:', errData || error.message);
      throw new Error(errData?.returnMessage || 'Failed to confirm LINE Pay payment');
    }
  }
}
