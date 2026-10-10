import React from 'react';
import { cn } from '../../lib/utils.js';
import { formatCurrency, splitCurrency } from '../../lib/format.js';

/**
 * MoneyValue Component
 * 
 * Implements optical scaling for monetary values (Stripe / Revolut / Linear pattern).
 * Scales the currency symbol down to ~65% height with muted opacity, ensuring the
 * numeric amount dominates visual hierarchy while maintaining tabular-nums alignment.
 */
export function MoneyValue({
  value,
  compact = false,
  className = '',
  symbolClassName = 'text-[0.65em] font-medium text-white/40 mr-0.5 select-none',
  negativeClassName = 'text-rose-400 font-bold mr-0.5 select-none',
  amountClassName = '',
}) {
  const sanitizedValue = typeof value === 'string' ? value.replace(/\$/g, '₹') : value;
  const formatted =
    typeof sanitizedValue === 'string' && sanitizedValue.includes('₹')
      ? sanitizedValue
      : formatCurrency(sanitizedValue, { compact });

  const { symbol, amount, isNegative } = splitCurrency(formatted);

  return (
    <span className={cn('inline-flex items-baseline tabular-nums', className)}>
      {isNegative && <span className={negativeClassName}>-</span>}
      {symbol && <span className={symbolClassName}>{symbol}</span>}
      <span className={amountClassName}>{amount}</span>
    </span>
  );
}
