import { Coupon, OrderType } from '@prisma/client';
import prisma from './db.js';

export interface DiscountConditions {
  allowedOrderTypes?: OrderType[];
  requireCategoryIds?: string[];
  minItemCount?: number;
  minCategoryItemCount?: number;
  timeOfDay?: {
    startTime: string; // 'HH:MM' e.g. '14:00'
    endTime: string;   // 'HH:MM' e.g. '17:00'
  };
  applicableCategoryIds?: string[];
  applicableMenuItemIds?: string[];
}

export interface DiscountValidationResult {
  isValid: boolean;
  discountAmount: number;
  freeDelivery: boolean;
  reason?: string;
}

/**
 * Validates a coupon/promotion against the current cart and order metadata.
 * Calculates and returns the discount amount if valid.
 */
export function validateAndCalculateDiscount(
  campaign: Coupon,
  orderData: {
    subtotal: number;
    orderType: OrderType;
    locationId: string;
    localTime?: Date;
  },
  cartItems: Array<{
    menuItemId: string;
    categoryId: string;
    price: number;
    quantity: number;
  }>
): DiscountValidationResult {
  // 1. Basic Active status check
  if (!campaign.isActive) {
    return { isValid: false, discountAmount: 0, freeDelivery: false, reason: '此優惠券/活動目前已停用' };
  }

  // 2. Starts & Expires date check
  const now = orderData.localTime || new Date();
  if (campaign.startsAt && now < campaign.startsAt) {
    return { isValid: false, discountAmount: 0, freeDelivery: false, reason: '此優惠券/活動尚未開始' };
  }
  if (campaign.expiresAt && now > campaign.expiresAt) {
    return { isValid: false, discountAmount: 0, freeDelivery: false, reason: '此優惠券/活動已過期' };
  }

  // 3. Usage limit check
  if (campaign.usageLimit !== null && campaign.usageCount >= campaign.usageLimit) {
    return { isValid: false, discountAmount: 0, freeDelivery: false, reason: '此優惠券/活動的使用額度已滿' };
  }

  // 4. Store location restriction
  if (campaign.locationId && campaign.locationId !== orderData.locationId) {
    return { isValid: false, discountAmount: 0, freeDelivery: false, reason: '此優惠券/活動不適用於此門市' };
  }

  // 5. Minimum Order Subtotal check
  if (orderData.subtotal < campaign.minOrder) {
    return { 
      isValid: false, 
      discountAmount: 0, 
      freeDelivery: false, 
      reason: `未達最低消費金額門檻 $${campaign.minOrder.toFixed(2)}` 
    };
  }

  // 6. Advanced Custom Conditions parsing
  let rules: DiscountConditions = {};
  if (campaign.conditions) {
    try {
      rules = typeof campaign.conditions === 'string' 
        ? JSON.parse(campaign.conditions) 
        : (campaign.conditions as unknown as DiscountConditions);
    } catch {
      rules = {};
    }

    // A. Allowed Order Types (DELIVERY / PICKUP)
    if (rules.allowedOrderTypes && rules.allowedOrderTypes.length > 0) {
      if (!rules.allowedOrderTypes.includes(orderData.orderType)) {
        const typeStr = orderData.orderType === 'DELIVERY' ? '外送' : '自取';
        return { isValid: false, discountAmount: 0, freeDelivery: false, reason: `本活動僅限特定管道（${typeStr}）使用` };
      }
    }

    // B. Required Categories
    if (rules.requireCategoryIds && rules.requireCategoryIds.length > 0) {
      const hasCategory = cartItems.some(item => rules.requireCategoryIds?.includes(item.categoryId));
      if (!hasCategory) {
        return { isValid: false, discountAmount: 0, freeDelivery: false, reason: '購物車內未包含指定分類商品' };
      }

      // B2. Minimum Category Item Count (buy at least N items specifically in the required categories)
      if (rules.minCategoryItemCount !== undefined && rules.minCategoryItemCount > 0) {
        const categoryItemCount = cartItems
          .filter(item => rules.requireCategoryIds?.includes(item.categoryId))
          .reduce((sum, item) => sum + item.quantity, 0);

        if (categoryItemCount < rules.minCategoryItemCount) {
          return {
            isValid: false,
            discountAmount: 0,
            freeDelivery: false,
            reason: `指定分類商品總數量需達到 ${rules.minCategoryItemCount} 件`
          };
        }
      }
    }

    // C. Minimum total item count in cart
    if (rules.minItemCount !== undefined && rules.minItemCount > 0) {
      const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalCount < rules.minItemCount) {
        return { isValid: false, discountAmount: 0, freeDelivery: false, reason: `商品總數量需達到 ${rules.minItemCount} 件` };
      }
    }

    // D. Time of Day (Happy Hour)
    if (rules.timeOfDay) {
      const localTaiwanParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Taipei',
        hour: 'numeric', minute: 'numeric',
        hour12: false
      }).formatToParts(now);
      const partsMap: any = {};
      localTaiwanParts.forEach(p => partsMap[p.type] = p.value);
      const minutesSinceMidnight = Number(partsMap.hour) * 60 + Number(partsMap.minute);

      const [startH, startM] = rules.timeOfDay.startTime.split(':').map(Number);
      const [endH, endM] = rules.timeOfDay.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (minutesSinceMidnight < startMinutes || minutesSinceMidnight > endMinutes) {
        return { 
          isValid: false, 
          discountAmount: 0, 
          freeDelivery: false, 
          reason: `本活動僅限特惠時段（${rules.timeOfDay.startTime} - ${rules.timeOfDay.endTime}）使用` 
        };
      }
    }
  }

  // Calculate Applicable Subtotal for granular rules
  let applicableSubtotal = orderData.subtotal;
  let hasApplicableRestrictions = false;

  if (rules.applicableCategoryIds?.length || rules.applicableMenuItemIds?.length) {
    hasApplicableRestrictions = true;
    applicableSubtotal = cartItems.reduce((sum, item) => {
      const matchCategory = rules.applicableCategoryIds?.includes(item.categoryId);
      const matchItem = rules.applicableMenuItemIds?.includes(item.menuItemId);
      if (matchCategory || matchItem) {
        return sum + (item.price * item.quantity);
      }
      return sum;
    }, 0);

    // If there are restrictions and no applicable items are in the cart, the discount is 0.
    if (applicableSubtotal <= 0) {
      return { isValid: false, discountAmount: 0, freeDelivery: false, reason: '購物車內沒有符合此優惠條件的指定商品' };
    }
  }

  // 7. Calculate Discount Amount
  let discountAmount = 0;
  let freeDelivery = false;

  if (campaign.type === 'FIXED') {
    discountAmount = campaign.value;
    // Cap fixed discount at applicable subtotal to avoid negative totals
    if (hasApplicableRestrictions) {
      discountAmount = Math.min(discountAmount, applicableSubtotal);
    }
  } else if (campaign.type === 'PERCENTAGE') {
    // campaign.value is percentage, e.g. 10 means 10% off
    discountAmount = applicableSubtotal * (campaign.value / 100);
    if (campaign.maxDiscount !== null && campaign.maxDiscount !== undefined) {
      discountAmount = Math.min(discountAmount, campaign.maxDiscount);
    }
  } else if (campaign.type === 'FREE_DELIVERY') {
    freeDelivery = true;
  }

  // Round to 2 decimal places
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    isValid: true,
    discountAmount,
    freeDelivery
  };
}

/**
 * Scans all active automatic promotions, runs validation,
 * and returns the best promotion (the one with the largest discount/free delivery).
 */
export async function findAndApplyBestAutomaticDiscount(
  orderData: {
    subtotal: number;
    orderType: OrderType;
    locationId: string;
    localTime?: Date;
  },
  cartItems: Array<{
    menuItemId: string;
    categoryId: string;
    price: number;
    quantity: number;
  }>
): Promise<{ campaign: Coupon | null; discountAmount: number; freeDelivery: boolean }> {
  const now = orderData.localTime || new Date();

  // Query all active automatic campaigns
  const automaticCampaigns = await prisma.coupon.findMany({
    where: {
      isAutomatic: true,
      isActive: true,
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } }
      ],
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } }
          ]
        },
        {
          OR: [
            { locationId: null },
            { locationId: orderData.locationId }
          ]
        }
      ]
    }
  });

  let bestCampaign: Coupon | null = null;
  let bestDiscountAmount = 0;
  let bestFreeDelivery = false;

  for (const campaign of automaticCampaigns) {
    const result = validateAndCalculateDiscount(campaign, orderData, cartItems);
    if (result.isValid) {
      // Prioritize free delivery, or whichever gives the higher absolute discount amount
      if (
        (result.freeDelivery && !bestFreeDelivery) || 
        (result.discountAmount > bestDiscountAmount)
      ) {
        bestCampaign = campaign;
        bestDiscountAmount = result.discountAmount;
        bestFreeDelivery = result.freeDelivery;
      }
    }
  }

  return {
    campaign: bestCampaign,
    discountAmount: bestDiscountAmount,
    freeDelivery: bestFreeDelivery
  };
}
