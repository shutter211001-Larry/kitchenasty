import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface LinePayRequestPayload {
  amount: number;
  currency: string;
  orderId: string;
  packages: Array<{
    id: string;
    amount: number;
    products: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  }>;
  redirectUrls: {
    confirmUrl: string;
    cancelUrl: string;
  };
}

export interface LinePayConfirmPayload {
  amount: number;
  currency: string;
}

export class LinePayClient {
  private channelId: string;
  private channelSecret: string;
  private apiUrl: string;

  constructor() {
    this.channelId = process.env.LINE_PAY_CHANNEL_ID || '';
    this.channelSecret = process.env.LINE_PAY_CHANNEL_SECRET || '';
    this.apiUrl = process.env.LINE_PAY_API_URL || 'https://sandbox-api-pay.line.me';
  }

  private generateSignature(uri: string, requestBody: any, nonce: string): string {
    const data = this.channelSecret + uri + JSON.stringify(requestBody) + nonce;
    return crypto.createHmac('sha256', this.channelSecret).update(data).digest('base64');
  }

  async requestPayment(payload: LinePayRequestPayload) {
    const uri = '/v3/payments/request';
    const nonce = uuidv4();
    const signature = this.generateSignature(uri, payload, nonce);

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': this.channelId,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
      },
    };

    try {
      const response = await axios.post(`${this.apiUrl}${uri}`, payload, config);
      return response.data;
    } catch (error: any) {
      console.error('LINE Pay Request Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.returnMessage || 'Failed to request LINE Pay payment');
    }
  }

  async confirmPayment(transactionId: string, payload: LinePayConfirmPayload) {
    const uri = `/v3/payments/${transactionId}/confirm`;
    const nonce = uuidv4();
    const signature = this.generateSignature(uri, payload, nonce);

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': this.channelId,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
      },
    };

    try {
      const response = await axios.post(`${this.apiUrl}${uri}`, payload, config);
      return response.data;
    } catch (error: any) {
      console.error('LINE Pay Confirm Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.returnMessage || 'Failed to confirm LINE Pay payment');
    }
  }
}
