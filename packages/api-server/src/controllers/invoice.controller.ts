import { Request, Response } from 'express';
import prisma from '../lib/db.js';
import { getInvoiceProvider } from '../lib/invoice.js';

export async function issueOrderInvoice(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;

  try {
    const provider = await getInvoiceProvider();
    if (!provider) {
      res.status(400).json({ success: false, error: 'Invoice provider is not configured or not enabled' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
      }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const result = await provider.issueInvoice({
      orderId: order.id,
      amount: order.total,
      items: order.items.map(item => ({
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity
      })),
      customerName: order.customer?.name || order.guestName || '客戶',
      customerEmail: order.customer?.email || order.guestEmail || '',
      customerPhone: order.customer?.phone || order.guestPhone || ''
    });

    if (result.success) {
      // You might want to save the invoice number (result.data.InvoiceNo) to the order in the database here
      res.json({ success: true, invoiceNumber: result.data.InvoiceNo, data: result.data });
    } else {
      res.status(400).json({ success: false, error: 'Failed to issue invoice', details: result.data });
    }
  } catch (error: any) {
    console.error('Invoice Issue Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error while issuing invoice', details: error.message });
  }
}
