import { Coupon, OrderType } from '@prisma/client';
import prisma from './db.js';

export interface DiscountConditions {
  allowedOrderTypes?: OrderType[];
  timeOfDay?: {
    startTime: string; // 'HH:MM' e.g. '14:00'
    endTime: string;   // 'HH:MM' e.g. '17:00'
  };
  
  // Participating items (Buy group)
  applicableCategoryIds?: string[];
  applicableMenuItemIds?: string[];
  
  // Thresholds (evaluated ONLY on the participating items above)
  minItemCount?: number; // 滿件 (Overrides campaign.minOrder if set, or can be used together)

  // Get group items (if different from participating items)
  getCategoryIds?: string[];
  getMenuItemIds?: string[];

  // Get N items discount config
  getQuantity?: number; // "送Y件"
  getDiscountType?: 'FREE' | 'PERCENTAGE' | 'FIXED';
  getDiscountValue?: number;
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

  // 5. Parse Advanced Conditions
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

    // B. Time of Day (Happy Hour)
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

  // 6. Identify Participating Items
  let eligibleItems = [];
  if (rules.applicableCategoryIds?.length || rules.applicableMenuItemIds?.length) {
    eligibleItems = cartItems.filter(item => 
      rules.applicableCategoryIds?.includes(item.categoryId) || 
      rules.applicableMenuItemIds?.includes(item.menuItemId)
    );
  } else {
    eligibleItems = [...cartItems];
  }

  const applicableSubtotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const applicableItemCount = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);

  // If there are restrictions but no matching items in cart
  if ((rules.applicableCategoryIds?.length || rules.applicableMenuItemIds?.length) && eligibleItems.length === 0) {
    return { isValid: false, discountAmount: 0, freeDelivery: false, reason: '購物車內沒有符合此優惠條件的指定商品' };
  }

  // 7. Threshold Checks (Evaluated ONLY on eligible items)
  if (campaign.minOrder > 0 && applicableSubtotal < campaign.minOrder) {
    return { isValid: false, discountAmount: 0, freeDelivery: false, reason: `指定商品未達最低消費金額門檻 $${campaign.minOrder.toFixed(2)}` };
  }

  if (rules.minItemCount !== undefined && rules.minItemCount > 0 && applicableItemCount < rules.minItemCount) {
    return { isValid: false, discountAmount: 0, freeDelivery: false, reason: `指定商品未達最低消費件數門檻 ${rules.minItemCount} 件` };
  }

  // 8. Calculate Discount Amount
  let discountAmount = 0;
  let freeDelivery = false;

  if (campaign.type === ('BOGO' as any)) {
    // GET_N_ITEMS logic
    let triggerCount = 0;
    
    // Determine how many times the promotion triggers
    if (campaign.minOrder > 0) {
      triggerCount = Math.floor(applicableSubtotal / campaign.minOrder);
    } else if (rules.minItemCount && rules.minItemCount > 0) {
      triggerCount = Math.floor(applicableItemCount / rules.minItemCount);
    } else {
      triggerCount = 1; // No threshold, trigger once
    }

    if (triggerCount <= 0) {
      return { isValid: false, discountAmount: 0, freeDelivery: false, reason: `未達贈送條件門檻` };
    }

    const getQ = rules.getQuantity ?? 1;
    const discountType = rules.getDiscountType || 'FREE';
    const discountValue = rules.getDiscountValue || 0;

    // Identify Get items
    let getItems = [];
    if (rules.getCategoryIds?.length || rules.getMenuItemIds?.length) {
      getItems = cartItems.filter(item => 
        rules.getCategoryIds?.includes(item.categoryId) || 
        rules.getMenuItemIds?.includes(item.menuItemId)
      );
    } else {
      getItems = eligibleItems;
    }

    // Flatten get items so each quantity=1 is its own element
    const flattenedGetItems: number[] = [];
    for (const item of getItems) {
      for (let i = 0; i < item.quantity; i++) {
        flattenedGetItems.push(item.price);
      }
    }

    // Sort ascending (lowest price first)
    flattenedGetItems.sort((a, b) => a - b);

    const totalDiscountableItems = triggerCount * getQ;
    let itemsDiscounted = 0;

    for (let i = 0; i < Math.min(totalDiscountableItems, flattenedGetItems.length); i++) {
      const itemPrice = flattenedGetItems[i];
      if (discountType === 'FREE') {
        discountAmount += itemPrice;
      } else if (discountType === 'PERCENTAGE') {
        discountAmount += itemPrice * (discountValue / 100);
      } else if (discountType === 'FIXED') {
        discountAmount += Math.min(itemPrice, discountValue);
      }
      itemsDiscounted++;
    }

    if (itemsDiscounted === 0) {
      return { isValid: false, discountAmount: 0, freeDelivery: false, reason: '購物車內沒有符合贈送條件的商品' };
    }
  } else if (campaign.type === 'FIXED') {
    discountAmount = campaign.value;
    if (rules.applicableCategoryIds?.length || rules.applicableMenuItemIds?.length) {
      discountAmount = Math.min(discountAmount, applicableSubtotal);
    }
  } else if (campaign.type === 'PERCENTAGE') {
    discountAmount = applicableSubtotal * (campaign.value / 100);
    if (campaign.maxDiscount !== null && campaign.maxDiscount !== undefined) {
      discountAmount = Math.min(discountAmount, campaign.maxDiscount);
    }
  } else if (campaign.type === 'FREE_DELIVERY') {
    freeDelivery = true;
  }

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
        (result.freeDelivery === bestFreeDelivery && result.discountAmount > bestDiscountAmount)
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
