"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// BidRush Shared — Financial Utilities
// All monetary values are stored and computed in integer PAISE (1 INR = 100 paise)
// NEVER use floating point for financial calculations.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMISSION_RATE_BASIS_POINTS = void 0;
exports.inrToPaise = inrToPaise;
exports.paiseToInr = paiseToInr;
exports.formatInr = formatInr;
exports.calculateCommissionPaise = calculateCommissionPaise;
exports.calculateSellerProceedsPaise = calculateSellerProceedsPaise;
exports.getCommissionBreakdown = getCommissionBreakdown;
exports.COMMISSION_RATE_BASIS_POINTS = 700; // 7% = 700 basis points
/**
 * Convert INR to paise (integer)
 */
function inrToPaise(inr) {
    return Math.round(inr * 100);
}
/**
 * Convert paise to INR display string
 */
function paiseToInr(paise) {
    return (paise / 100).toFixed(2);
}
/**
 * Format paise as INR currency string with ₹ symbol
 */
function formatInr(paise) {
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
function calculateCommissionPaise(saleAmountPaise) {
    return Math.floor((saleAmountPaise * exports.COMMISSION_RATE_BASIS_POINTS) / 10000);
}
/**
 * Calculate seller proceeds after commission
 */
function calculateSellerProceedsPaise(saleAmountPaise) {
    return saleAmountPaise - calculateCommissionPaise(saleAmountPaise);
}
function getCommissionBreakdown(saleAmountPaise) {
    const commissionPaise = calculateCommissionPaise(saleAmountPaise);
    return {
        grossAmountPaise: saleAmountPaise,
        commissionRateBasisPoints: exports.COMMISSION_RATE_BASIS_POINTS,
        commissionPaise,
        sellerProceedsPaise: saleAmountPaise - commissionPaise,
    };
}
//# sourceMappingURL=financial.js.map