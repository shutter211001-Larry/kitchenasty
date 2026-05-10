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
  const dayOfWeek = date.getDay();
  // Filter all sessions for this day
  const sessions = hours.filter((h) => h.dayOfWeek === dayOfWeek && !h.isClosed);

  if (sessions.length === 0) {
    return { isOpen: false, error: 'Location is closed on this day.' };
  }

  const { preOpeningBuffer = 0, postClosingBuffer = 0 } = settings;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  let isOpen = false;
  let timeRangesStr = '';

  for (const session of sessions) {
    const [openH, openM] = session.openTime.split(':').map(Number);
    const [closeH, closeM] = session.closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM + preOpeningBuffer;
    const closeMinutes = closeH * 60 + closeM - postClosingBuffer;
    const isOvernight = closeMinutes < openMinutes;

    if (isOvernight) {
      if (currentMinutes >= openMinutes || currentMinutes <= closeMinutes) {
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
  }

  if (!isOpen) {
    return { 
      isOpen: false, 
      error: `Scheduled time must be within business hours (${timeRangesStr}) considering preparation buffers.` 
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

  for (const session of sessions) {
    if (session.isClosed) continue;

    const [openH, openM] = session.openTime.split(':').map(Number);
    const [closeH, closeM] = session.closeTime.split(':').map(Number);

    const start = new Date(targetDate);
    start.setHours(openH, openM, 0, 0);
    start.setMinutes(start.getMinutes() + (settings.preOpeningBuffer || 0));

    const end = new Date(targetDate);
    end.setHours(closeH, closeM, 0, 0);
    if (closeH < openH || (closeH === openH && closeM < openM)) {
      end.setDate(end.getDate() + 1);
    }
    end.setMinutes(end.getMinutes() - (settings.postClosingBuffer || 0));

    const current = new Date(start);

    // If minStartTime is provided (e.g., for "Today"), skip past slots
    if (minStartTime && current < minStartTime) {
      const minutes = minStartTime.getMinutes();
      const alignedMinutes = Math.ceil(minutes / interval) * interval;
      current.setHours(minStartTime.getHours());
      current.setMinutes(alignedMinutes, 0, 0);
    }

    while (current <= end) {
      if (current >= start) {
        allSlots.push(current.toISOString());
      }
      current.setMinutes(current.getMinutes() + interval);
    }
  }

  // Remove duplicates and sort (in case of overlapping sessions)
  return Array.from(new Set(allSlots)).sort();
}
