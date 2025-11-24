/**
 * Common Formatter Utilities
 * Provides consistent formatting for dates, numbers, currency, etc.
 */

/**
 * Format date to Japanese format
 */
export function formatDate(date: string | Date, options?: {
  includeTime?: boolean;
  includeSeconds?: boolean;
}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return '-';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (options?.includeTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    if (options?.includeSeconds) {
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    }
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  }

  return `${year}/${month}/${day}`;
}

/**
 * Format currency (Japanese Yen by default)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'JPY',
  options?: {
    showCurrency?: boolean;
    decimals?: number;
  }
): string {
  const decimals = options?.decimals ?? (currency === 'JPY' ? 0 : 2);
  const formatted = amount.toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (options?.showCurrency) {
    const currencySymbol = currency === 'JPY' ? '¥' : currency;
    return `${currencySymbol}${formatted}`;
  }

  return formatted;
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('ja-JP');
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format phone number (Japanese format)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  
  return phone;
}

/**
 * Get relative time string (e.g., "2時間前")
 */
export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return '今';
  } else if (diffMin < 60) {
    return `${diffMin}分前`;
  } else if (diffHour < 24) {
    return `${diffHour}時間前`;
  } else if (diffDay < 7) {
    return `${diffDay}日前`;
  } else {
    return formatDate(d);
  }
}

/**
 * Validate and format email
 */
export function formatEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Format postal code (Japanese format)
 */
export function formatPostalCode(code: string): string {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length === 7) {
    return cleaned.replace(/(\d{3})(\d{4})/, '$1-$2');
  }
  return code;
}
