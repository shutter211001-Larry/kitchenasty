/**
 * Utility for consistent date and time handling across Shutter storefront.
 * Aligns with Asia/Taipei timezone calculations.
 */

// Parse YYYY-MM-DD to a local Date object without timezone shifting
export function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Format to standard local date (e.g., "6月2日 (週二)" or "Jun 2 (Tue)")
export function formatToLocalDate(dateStr: string, locale: string = 'zh-TW'): string {
  if (!dateStr) return '';
  const date = parseLocalDate(dateStr);
  
  // Custom formatting for Traditional Chinese (zh-TW)
  if (locale.startsWith('zh')) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 (${weekday})`;
  }
  
  // Fallback for other locales (e.g. English)
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

// Format to standard local time (e.g., "18:00")
export function formatToLocalTime(dateStr: string, locale: string = 'zh-TW'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  
  // Extract local hours and minutes in the client context
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Format to full reservation datetime (e.g. "2026年6月3日 (週三) 18:00")
export function formatToFullDateTime(dateStr: string, locale: string = 'zh-TW'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  
  // Convert standard ISO timestamp to Taiwan local YYYY-MM-DD
  const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(date);
  const dateStrFormatted = formatToLocalDate(datePart, locale);
  const timeStrFormatted = formatToLocalTime(dateStr, locale);
  
  if (locale.startsWith('zh')) {
    const year = date.getFullYear();
    return `${year}年${dateStrFormatted} ${timeStrFormatted}`;
  }
  
  return `${dateStrFormatted} at ${timeStrFormatted}`;
}

// Get friendly label for date (e.g., "今天", "明天", or "")
export function getDateFriendlyLabel(dateStr: string, locale: string = 'zh-TW'): string {
  if (!dateStr) return '';
  
  // Calculate today and tomorrow dates in Asia/Taipei timezone
  const now = new Date();
  const taiwanDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const taiwanTomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(tomorrow);
  
  const target = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  
  if (target === taiwanDateStr) {
    return locale.startsWith('zh') ? '今天' : 'Today';
  }
  if (target === taiwanTomorrowStr) {
    return locale.startsWith('zh') ? '明天' : 'Tomorrow';
  }
  return '';
}
