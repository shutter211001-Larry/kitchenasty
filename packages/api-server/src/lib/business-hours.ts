import { OperatingHour } from '@prisma/client';

interface BusinessHourSettings {
  preOpeningBuffer?: number;
  postClosingBuffer?: number;
}

/**
 * Checks if a given date falls within the operating hours of a location,
 * correctly handling overnight shifts and preparation buffers.
 */
export function isWithinHours(
  date: Date,
  hours: OperatingHour[],
  settings: BusinessHourSettings = {}
): { isOpen: boolean; error?: string } {
  // Use Intl to get current day and time components in Taiwan
  const taiwanParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    hour: 'numeric', minute: 'numeric', weekday: 'short',
    hour12: false
  }).formatToParts(date);

  const m: any = {};
  taiwanParts.forEach(p => m[p.type] = p.value);
  
  const daysMap: any = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  const dayOfWeek = daysMap[m.weekday];
  const prevDayOfWeek = (dayOfWeek + 6) % 7;
  const currentMinutes = Number(m.hour) * 60 + Number(m.minute);

  const { preOpeningBuffer = 0, postClosingBuffer = 0 } = settings;
  let isOpen = false;
  let timeRangesStr = '';

  for (const session of hours) {
    if (session.isClosed) continue;

    const [openH, openM] = session.openTime.split(':').map(Number);
    const [closeH, closeM] = session.closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM + preOpeningBuffer;
    const closeMinutes = closeH * 60 + closeM - postClosingBuffer;
    const isOvernight = (closeH * 60 + closeM) <= (openH * 60 + openM);

    if (session.dayOfWeek === dayOfWeek) {
      if (isOvernight) {
        if (currentMinutes >= openMinutes) {
          isOpen = true;
          break;
        }
      } else {
        if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
          isOpen = true;
          break;
        }
      }
      timeRangesStr += `${timeRangesStr ? ', ' : ''}${session.openTime}-${session.closeTime}`;
    } else if (session.dayOfWeek === prevDayOfWeek) {
      if (isOvernight) {
        if (currentMinutes <= closeMinutes) {
          isOpen = true;
          break;
        }
      }
    }
  }

  if (!isOpen) {
    return { 
      isOpen: false, 
      error: `Scheduled time must be within business hours (${timeRangesStr || 'Closed'}) considering preparation buffers.` 
    };
  }

  return { isOpen: true };
}

/**
 * Generates available time slots for a specific day, handling multiple sessions and overnight logic.
 */
export function generateDaySlots(
  targetDate: Date,
  sessions: OperatingHour[],
  interval: number,
  settings: BusinessHourSettings = {},
  minStartTime?: Date
): string[] {
  let allSlots: string[] = [];

  // Get YYYY-MM-DD in Taiwan
  const taiwanDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(targetDate);
  // Create a real UTC date that represents 00:00 in Taiwan
  const startOfDayTaiwan = new Date(`${taiwanDateStr}T00:00:00.000+08:00`);

  for (const session of sessions) {
    if (session.isClosed) continue;

    const [openH, openM] = session.openTime.split(':').map(Number);
    const [closeH, closeM] = session.closeTime.split(':').map(Number);

    const sessionStart = new Date(startOfDayTaiwan.getTime());
    sessionStart.setMinutes(openH * 60 + openM + (settings.preOpeningBuffer || 0));

    const sessionEnd = new Date(startOfDayTaiwan.getTime());
    sessionEnd.setMinutes(closeH * 60 + closeM - (settings.postClosingBuffer || 0));

    if ((closeH * 60 + closeM) <= (openH * 60 + openM)) {
      sessionEnd.setDate(sessionEnd.getDate() + 1);
    }

    const current = new Date(sessionStart);

    // If minStartTime is provided, align current to it
    if (minStartTime && current < minStartTime) {
      const diffMs = minStartTime.getTime() - sessionStart.getTime();
      const minutesToSkip = Math.ceil(diffMs / (60000 * interval)) * interval;
      if (minutesToSkip > 0) {
        current.setTime(sessionStart.getTime() + minutesToSkip * 60000);
      }
    }

    while (current <= sessionEnd) {
      if (current >= sessionStart) {
        allSlots.push(current.toISOString());
      }
      current.setTime(current.getTime() + interval * 60000);
    }
  }

  return Array.from(new Set(allSlots)).sort();
}
