/** Matches WebBE TicketingService create-order group tiers. */
export const GROUP_TIER_30 = 30;
export const GROUP_TIER_50 = 50;
export const MAX_ORDER_QUANTITY = 100;

export type GroupPricing = {
  isGroup: boolean;
  discountPercent: number;
  focCount: number;
  unitPrice: number;
  paidQuantity: number;
  totalAmount: number;
};

/**
 * Group orders (≥30): auto discount + FOC, promotions disabled.
 * FOC = floor(quantity / 30). Total charged = unitPrice * quantity (FOC tickets are free extras on BE).
 */
export function computeGroupPricing(
  basePrice: number,
  quantity: number,
): GroupPricing {
  const qty = Math.max(1, Math.floor(quantity));
  const base = Math.max(0, Number(basePrice) || 0);

  if (qty >= GROUP_TIER_50) {
    const discountPercent = 0.1;
    const unitPrice = Math.round(base * (1 - discountPercent));
    const focCount = Math.floor(qty / 30);
    return {
      isGroup: true,
      discountPercent: 10,
      focCount,
      unitPrice,
      paidQuantity: qty,
      totalAmount: unitPrice * qty,
    };
  }

  if (qty >= GROUP_TIER_30) {
    const discountPercent = 0.08;
    const unitPrice = Math.round(base * (1 - discountPercent));
    const focCount = Math.floor(qty / 30);
    return {
      isGroup: true,
      discountPercent: 8,
      focCount,
      unitPrice,
      paidQuantity: qty,
      totalAmount: unitPrice * qty,
    };
  }

  return {
    isGroup: false,
    discountPercent: 0,
    focCount: 0,
    unitPrice: base,
    paidQuantity: qty,
    totalAmount: base * qty,
  };
}
