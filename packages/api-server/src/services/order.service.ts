import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OrderService {
  /**
   * Saves the order and executes all side-effects (inventory, coupons, loyalty) in a strict database transaction.
   * Ensures data consistency and prevents race conditions.
   */
  static async saveOrderWithTransaction(
    orderData: any,
    items: any[],
    menuItemMap: Map<string, any>,
    appliedCouponId?: string | null,
    customerId?: string | null,
    guestPhone?: string,
    address?: any,
    subtotal: number = 0,
    earnRate: number = 0,
    loyaltyPointsRedeem: number = 0,
    totalRewardPointsCost: number = 0
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Create the base Order
      const order = await (tx.order.create as any)({
        data: orderData,
        include: {
          items: { include: { options: true, menuItem: true } },
          customer: true,
          location: { include: { operatingHours: true } },
          table: { select: { id: true, name: true } },
        },
      });

      // 2. Increment coupon usage
      if (appliedCouponId) {
        // Prevent race condition: ensure usageCount hasn't exceeded limits (if limits exist, they should be checked here)
        await tx.coupon.update({
          where: { id: appliedCouponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // 3. Decrement Inventory (with optimistic concurrency check)
      for (const item of items) {
        const menuItem = menuItemMap.get(item.menuItemId)!;
        
        if (menuItem.trackStock) {
          const result = await tx.menuItem.updateMany({
            where: { id: item.menuItemId, stockQty: { gte: item.quantity } },
            data: { stockQty: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw new Error(`Insufficient stock for item: ${menuItem.name}`);
          }
        }

        if (menuItem.category && (menuItem.category as any).trackSharedStock) {
          const result = await (tx.category as any).updateMany({
            where: { id: menuItem.categoryId, sharedStockQty: { gte: item.quantity } },
            data: { sharedStockQty: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw new Error(`Insufficient shared stock for category of item: ${menuItem.name}`);
          }
        }
      }

      // 4. Update Loyalty Points & Customer Info
      if (customerId) {
        const pointsEarned = Math.floor(subtotal * earnRate);
        const currentCustomer = await tx.customer.findUnique({ where: { id: customerId }, select: { phone: true, address: true } });
        
        const updateData: any = {};
        if (pointsEarned > 0) {
          updateData.loyaltyPoints = { increment: pointsEarned };
        }
        
        if (guestPhone && guestPhone !== currentCustomer?.phone) {
          updateData.phone = guestPhone;
        }
        
        const incomingAddress = address?.line1;
        if (incomingAddress && incomingAddress !== currentCustomer?.address) {
          updateData.address = incomingAddress;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: updateData,
          });
        }

        if (pointsEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              customerId,
              type: 'EARN',
              points: pointsEarned,
              description: `Earned from order #${order.orderNumber}`,
              orderId: order.id,
            },
          });
        }

        const totalPointsDeducted = (loyaltyPointsRedeem || 0) + totalRewardPointsCost;
        if (totalPointsDeducted > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { loyaltyPoints: { decrement: totalPointsDeducted } },
          });
          
          if (loyaltyPointsRedeem && loyaltyPointsRedeem > 0) {
            await tx.loyaltyTransaction.create({
              data: {
                customerId,
                type: 'REDEEM',
                points: -loyaltyPointsRedeem,
                description: `Redeemed on order #${order.orderNumber} for cash discount`,
                orderId: order.id,
              },
            });
          }
          
          if (totalRewardPointsCost > 0) {
            await tx.loyaltyTransaction.create({
              data: {
                customerId,
                type: 'REDEEM',
                points: -totalRewardPointsCost,
                description: `Redeemed on order #${order.orderNumber} for reward items`,
                orderId: order.id,
              },
            });
          }
        }
      }

      return order;
    });
  }
}
