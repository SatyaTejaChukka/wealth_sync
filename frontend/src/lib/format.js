const DEFAULT_LOCALE = import.meta.env.VITE_LOCALE || 'en-IN';
const DEFAULT_CURRENCY = import.meta.env.VITE_CURRENCY || 'INR';

const currencyFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  style: 'currency',
  currency: DEFAULT_CURRENCY,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  style: 'currency',
  currency: DEFAULT_CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(value, { compact = false } = {}) {
  const numeric = Number(value || 0);
  const formatter = compact ? compactCurrencyFormatter : currencyFormatter;
  return formatter.format(Number.isFinite(numeric) ? numeric : 0);
}

export function splitCurrency(formattedValue) {
  if (typeof formattedValue !== 'string') {
    return { symbol: '', amount: String(formattedValue ?? ''), isNegative: false, prefix: '' };
  }
  const isNegative = formattedValue.includes('-');
  // Remove minus sign for clean symbol and amount extraction
  const cleaned = formattedValue.replace('-', '').trim();
  // Matches any non-digit/space/dot/comma characters at the start of the string
  const match = cleaned.match(/^([^\d\s,.]*)(.*)$/);
  const symbol = match ? match[1] : '';
  const amount = match ? match[2].trim() : cleaned;
  return {
    symbol,
    amount,
    isNegative,
    prefix: isNegative ? '-' : '',
  };
}


export function formatPercent(value, digits = 1) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return '0.0%';
  }
  return `${numeric.toFixed(digits)}%`;
}

export function formatDate(isoDate) {
  if (!isoDate) {
    return 'Not set';
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
