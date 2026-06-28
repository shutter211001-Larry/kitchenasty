import { Request, Response } from 'express';
import { getStripe } from '../lib/stripe.js';
import prisma from '../lib/db.js';
import { createPayPalOrder, capturePayPalOrder } from '../lib/paypal.js';
import { emitOrderStatusUpdate } from '../lib/socket.js';
import { LinePayClient } from '../lib/linepay.js';

export async function createPaymentIntent(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;

  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Check if order already has a completed payment
  const existingPayment = await prisma.payment.findFirst({
    where: { orderId, status: 'COMPLETED' },
  });
  if (existingPayment) {
    res.status(409).json({ success: false, error: 'Order already paid' });
    return;
  }

  try {
    const stripe = await getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // cents
      currency: 'usd',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'STRIPE',
        status: 'PENDING',
        amount: order.total,
        transactionId: paymentIntent.id,
      },
    });

    res.json({
      success: true,
      data: { clientSecret: paymentIntent.client_secret },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Payment creation failed' });
  }
}

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(500).json({ success: false, error: 'Webhook secret not configured' });
    return;
  }

  let event;
  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    res.status(400).json({ success: false, error: `Webhook error: ${err.message}` });
    return;
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        // Update payment status
        await prisma.payment.updateMany({
          where: { transactionId: paymentIntent.id },
          data: { status: 'COMPLETED' },
        });

        // Update order status to confirmed and paymentStatus to PAID
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
        });

        emitOrderStatusUpdate({
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          orderType: updatedOrder.orderType,
          customerId: updatedOrder.customerId,
          locationId: updatedOrder.locationId,
          paymentStatus: updatedOrder.paymentStatus,
        } as any);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      await prisma.payment.updateMany({
        where: { transactionId: paymentIntent.id },
        data: { status: 'FAILED' },
      });
      break;
    }
  }

  res.json({ received: true });
}

export async function markCashPayment(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;

  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method: 'CASH',
      status: 'PENDING',
      amount: order.total,
    },
  });

  res.status(201).json({ success: true, data: payment });
}

export async function createPayPalPayment(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;

  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const existingPayment = await prisma.payment.findFirst({
    where: { orderId, status: 'COMPLETED' },
  });
  if (existingPayment) {
    res.status(409).json({ success: false, error: 'Order already paid' });
    return;
  }

  try {
    const paypalOrder = await createPayPalOrder(order.total, order.orderNumber);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'PAYPAL',
        status: 'PENDING',
        amount: order.total,
        transactionId: paypalOrder.id,
      },
    });

    res.json({
      success: true,
      data: { paypalOrderId: paypalOrder.id, approvalUrl: paypalOrder.approvalUrl },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'PayPal order creation failed' });
  }
}

export async function capturePayPalPayment(req: Request, res: Response): Promise<void> {
  const { paypalOrderId, orderId } = req.body;

  if (!paypalOrderId || !orderId) {
    res.status(400).json({ success: false, error: 'paypalOrderId and orderId are required' });
    return;
  }

  try {
    const result = await capturePayPalOrder(paypalOrderId);

    if (result.status === 'COMPLETED') {
      await prisma.payment.updateMany({
        where: { transactionId: paypalOrderId },
        data: { status: 'COMPLETED' },
      });

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
      });

      emitOrderStatusUpdate({
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        orderType: updatedOrder.orderType,
        customerId: updatedOrder.customerId,
        locationId: updatedOrder.locationId,
        paymentStatus: updatedOrder.paymentStatus,
      } as any);

      res.json({ success: true, data: { status: 'COMPLETED' } });
    } else {
      res.status(400).json({ success: false, error: 'PayPal capture failed', data: result });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'PayPal capture failed' });
  }
}

export async function createLinePayPayment(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;

  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({ 
    where: { id: orderId },
    include: { items: true }
  });
  
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const existingPayment = await prisma.payment.findFirst({
    where: { orderId, status: 'COMPLETED' },
  });
  
  if (existingPayment) {
    res.status(409).json({ success: false, error: 'Order already paid' });
    return;
  }

  try {
    const linePay = new LinePayClient();
    
    // Check return url from environment or fallback to frontend
    const returnUrl = process.env.LINE_PAY_RETURN_URL || 'http://localhost:5173/checkout/linepay/confirm';
    
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    let currencyDecimals = 0;
    if (siteSettings && siteSettings.generalSettings) {
      const general = typeof siteSettings.generalSettings === 'string' 
        ? JSON.parse(siteSettings.generalSettings) 
        : siteSettings.generalSettings;
      if ((general as any).currencyDecimals !== undefined) {
        currencyDecimals = Number((general as any).currencyDecimals);
      }
    }
    const roundPrice = (val: number) => Number(val.toFixed(currencyDecimals));

    const lineProducts = (() => {
      const products = order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: roundPrice(item.unitPrice),
      }));

      if (order.tax && order.tax > 0) {
        products.push({ name: '稅金 (Tax)', quantity: 1, price: roundPrice(order.tax) });
      }
      if (order.deliveryFee && order.deliveryFee > 0) {
        products.push({ name: '運費 (Delivery)', quantity: 1, price: roundPrice(order.deliveryFee) });
      }
      if (order.discount && order.discount > 0) {
        products.push({ name: '折扣 (Discount)', quantity: 1, price: -roundPrice(order.discount) });
      }
      
      return products;
    })();

    const finalAmount = lineProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);

    // Construct the payload for LINE Pay
    const payload = {
      amount: finalAmount,
      currency: 'TWD',
      orderId: order.orderNumber,
      packages: [
        {
          id: `pkg_${order.id}`,
          amount: finalAmount,
          products: lineProducts,
        },
      ],
      redirectUrls: {
        confirmUrl: `${returnUrl}?orderId=${order.orderNumber}`,
        cancelUrl: returnUrl, // Typically we handle cancel on the same page and show an error
      },
    };

    const response = await linePay.requestPayment(payload);

    if (response.returnCode === '0000') {
      const transactionId = response.info.transactionId.toString(); // API v3 returns number, important to convert to string

      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'LINE_PAY',
          status: 'PENDING',
          amount: order.total,
          transactionId: transactionId,
        },
      });

      res.json({
        success: true,
        data: {
          paymentUrl: response.info.paymentUrl.web,
          transactionId: transactionId,
        },
      });
    } else {
      console.error('[LINE Pay Request Rejected]', response);
      res.status(400).json({ success: false, error: response.returnMessage });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'LINE Pay order creation failed' });
  }
}

export async function confirmLinePayPayment(req: Request, res: Response): Promise<void> {
  const { transactionId, orderId } = req.body;

  if (!transactionId || !orderId) {
    res.status(400).json({ success: false, error: 'transactionId and orderId are required' });
    return;
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: orderId } // Notice we use orderNumber here because LINE Pay passes back our original orderId string
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: { orderId: order.id, transactionId: transactionId, method: 'LINE_PAY' }
    });

    if (!payment) {
      res.status(404).json({ success: false, error: 'Payment record not found' });
      return;
    }

    if (payment.status === 'COMPLETED') {
       res.json({ success: true, data: { status: 'ALREADY_COMPLETED' } });
       return;
    }

    const linePay = new LinePayClient();
    const payload = {
      amount: order.total,
      currency: 'TWD',
    };

    const result = await linePay.confirmPayment(transactionId, payload);

    if (result.returnCode === '0000') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' },
      });

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
      });

      emitOrderStatusUpdate({
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        orderType: updatedOrder.orderType,
        customerId: updatedOrder.customerId,
        locationId: updatedOrder.locationId,
        paymentStatus: updatedOrder.paymentStatus,
      } as any);

      res.json({ success: true, data: { status: 'COMPLETED' } });
    } else {
      res.status(400).json({ success: false, error: result.returnMessage });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'LINE Pay capture failed' });
  }
}
