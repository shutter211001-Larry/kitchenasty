import crypto from 'crypto';
import prisma from './db.js';

export interface InvoiceSettings {
  enabled: boolean;
  provider: string; // 'ecpay' | 'whale' etc.
  merchantId: string;
  hashKey: string;
  hashIv: string;
  vatNumber?: string;
}

export interface IssueInvoiceParams {
  orderId: string;
  amount: number;
  items: Array<{ name: string; price: number; quantity: number }>;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export class ECPayInvoiceProvider {
  private merchantId: string;
  private hashKey: string;
  private hashIv: string;
  private isSandbox: boolean;

  constructor(settings: InvoiceSettings) {
    this.merchantId = settings.merchantId;
    this.hashKey = settings.hashKey;
    this.hashIv = settings.hashIv;
    // We can assume sandbox if merchantId matches the official sandbox ID (2000132) or just default to true for safety
    this.isSandbox = this.merchantId === '2000132' || process.env.NODE_ENV !== 'production';
  }

  private get apiUrl() {
    return this.isSandbox
      ? 'https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue'
      : 'https://einvoice.ecpay.com.tw/B2CInvoice/Issue';
  }

  private urlEncode(data: string) {
    return encodeURIComponent(data)
      .replace(/%20/g, '+')
      .replace(/%2D/g, '-')
      .replace(/%5F/g, '_')
      .replace(/%2E/g, '.')
      .replace(/%21/g, '!')
      .replace(/%2A/g, '*')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')');
  }

  private encrypt(data: any): string {
    const jsonString = JSON.stringify(data);
    const encodedData = this.urlEncode(jsonString);

    const cipher = crypto.createCipheriv('aes-128-cbc', this.hashKey, this.hashIv);
    // ECPay uses pkcs7 padding, Node.js uses pkcs7 by default when using createCipheriv
    let encrypted = cipher.update(encodedData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  private decrypt(encryptedBase64: string): any {
    const decipher = crypto.createDecipheriv('aes-128-cbc', this.hashKey, this.hashIv);
    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const decoded = decodeURIComponent(decrypted);
    return JSON.parse(decoded);
  }

  public async issueInvoice(params: IssueInvoiceParams) {
    const ts = Math.floor(Date.now() / 1000);
    const relSeqNum = `KITCHENASTY${ts}`;

    const Items = params.items.map(i => ({
      ItemName: i.name,
      ItemCount: i.quantity,
      ItemWord: '件',
      ItemPrice: i.price,
      ItemTaxType: '1',
      ItemAmount: i.price * i.quantity
    }));

    const data = {
      MerchantID: this.merchantId,
      RelateNumber: relSeqNum,
      CustomerID: params.customerEmail || '',
      CustomerIdentifier: '',
      CustomerName: params.customerName || '客戶',
      CustomerAddr: '台灣',
      CustomerPhone: params.customerPhone || '',
      CustomerEmail: params.customerEmail || '',
      ClearanceMark: '',
      Print: '0', // 0 = don't print, send email
      Donation: '0',
      LoveCode: '',
      carrierType: '1', // 1 = ECPay member carrier
      carrierNum: '',
      TaxType: '1',
      SalesAmount: params.amount,
      InvoiceRemark: 'Order ' + params.orderId,
      Items,
      InvType: '07', // 07 = General
      vat: '1'
    };

    const encryptedData = this.encrypt(data);

    const payload = {
      MerchantID: this.merchantId,
      RqHeader: {
        Timestamp: ts,
        Revision: '3.0.0'
      },
      Data: encryptedData
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.Data) {
        const decryptedResult = this.decrypt(result.Data);
        return { success: result.TransCode === 1 && decryptedResult.RtnCode === 1, data: decryptedResult };
      }
      return { success: false, data: result };
    } catch (error) {
      console.error('ECPay Issue Invoice Error', error);
      throw error;
    }
  }
}

export async function getInvoiceProvider() {
  const settingsDoc = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const invoiceSettings = settingsDoc?.invoiceSettings as any;

  if (!invoiceSettings || !invoiceSettings.enabled) {
    return null;
  }

  if (invoiceSettings.provider === 'ecpay' || invoiceSettings.merchantId) {
    return new ECPayInvoiceProvider(invoiceSettings as InvoiceSettings);
  }

  return null;
}
