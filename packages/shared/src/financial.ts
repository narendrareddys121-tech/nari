// ─────────────────────────────────────────────────────────────────────────────
// BidRush Shared — Financial Utilities
// All monetary values are stored and computed in integer PAISE (1 INR = 100 paise)
// NEVER use floating point for financial calculations.
// ─────────────────────────────────────────────────────────────────────────────

export const COMMISSION_RATE_BASIS_POINTS = 700; // 7% = 700 basis points

/**
 * Convert INR to paise (integer)
 */
export function inrToPaise(inr: number): number {
  return Math.round(inr * 100);
}

/**
 * Convert paise to INR display string
 */
export function paiseToInr(paise: number): string {
  return (paise / 100).toFixed(2);
}

/**
 * Format paise as INR currency string with ₹ symbol
 */
export function formatInr(paise: number): string {
  const inr = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(inr);
}

/**
 * Calculate platform commission in paise (floor rounding — platform never rounds up against seller)
 * commission = amount * 700 / 10000
 */
export function calculateCommissionPaise(saleAmountPaise: number): number {
  return Math.floor((saleAmountPaise * COMMISSION_RATE_BASIS_POINTS) / 10000);
}

/**
 * Calculate seller proceeds after commission
 */
export function calculateSellerProceedsPaise(saleAmountPaise: number): number {
  return saleAmountPaise - calculateCommissionPaise(saleAmountPaise);
}

/**
 * Commission calculation result
 */
export interface CommissionBreakdown {
  grossAmountPaise: number;
  commissionRateBasisPoints: number;
  commissionPaise: number;
  sellerProceedsPaise: number;
}

export function getCommissionBreakdown(saleAmountPaise: number): CommissionBreakdown {
  const commissionPaise = calculateCommissionPaise(saleAmountPaise);
  return {
    grossAmountPaise: saleAmountPaise,
    commissionRateBasisPoints: COMMISSION_RATE_BASIS_POINTS,
    commissionPaise,
    sellerProceedsPaise: saleAmountPaise - commissionPaise,
  };
}
