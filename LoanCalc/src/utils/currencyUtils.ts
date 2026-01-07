import { Currency } from './storage';

/**
 * Format a number as currency with the given currency settings
 */
export function formatCurrency(amount: number, currency: Currency, decimals: number = 2): string {
    const formattedAmount = amount.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    if (currency.position === 'before') {
        return `${currency.symbol}${formattedAmount}`;
    } else {
        return `${formattedAmount} ${currency.symbol}`;
    }
}
