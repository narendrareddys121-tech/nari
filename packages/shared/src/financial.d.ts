export declare const COMMISSION_RATE_BASIS_POINTS = 700;
/**
 * Convert INR to paise (integer)
 */
export declare function inrToPaise(inr: number): number;
/**
 * Convert paise to INR display string
 */
export declare function paiseToInr(paise: number): string;
/**
 * Format paise as INR currency string with ₹ symbol
 */
export declare function formatInr(paise: number): string;
/**
 * Calculate platform commission in paise (floor rounding — platform never rounds up against seller)
 * commission = amount * 700 / 10000
 */
export declare function calculateCommissionPaise(saleAmountPaise: number): number;
/**
 * Calculate seller proceeds after commission
 */
export declare function calculateSellerProceedsPaise(saleAmountPaise: number): number;
/**
 * Commission calculation result
 */
export interface CommissionBreakdown {
    grossAmountPaise: number;
    commissionRateBasisPoints: number;
    commissionPaise: number;
    sellerProceedsPaise: number;
}
export declare function getCommissionBreakdown(saleAmountPaise: number): CommissionBreakdown;
//# sourceMappingURL=financial.d.ts.map