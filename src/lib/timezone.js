/**
 * Timezone utilities for displaying game times in the user's local zone.
 *
 * The Odds API returns commence_time as UTC ISO strings (e.g. "2026-05-02T23:10:00Z").
 * This module detects the user's local timezone and provides formatters that
 * convert UTC times to local with a short timezone label (e.g. "7:30 PM ET").
 */

/** User's IANA timezone (e.g. "America/New_York", "Europe/London") */
export const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Get the short timezone abbreviation for a given date in the user's timezone.
 * e.g. "ET", "CT", "PT", "GMT", "IST"
 *
 * Uses Intl to extract the abbreviated timezone name.
 */
export function getTimezoneAbbr(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    timeZoneName: 'short',
  }).formatToParts(date);

  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  return tzPart?.value || '';
}

/**
 * Format a UTC ISO date string or Date object to a localized time string
 * with timezone abbreviation.
 *
 * @param {string|Date} utcTime - UTC ISO string or Date object
 * @param {object} [opts] - Options
 * @param {boolean} [opts.includeDate] - Include weekday + date (for non-today/tomorrow)
 * @returns {string} e.g. "7:30 PM ET", "Tomorrow 3:15 PM CT"
 */
export function formatGameTime(utcTime, { includeDate = false } = {}) {
  const date = utcTime instanceof Date ? utcTime : new Date(utcTime);
  const now = new Date();
  const tzAbbr = getTimezoneAbbr(date);

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: userTimezone,
  });

  if (includeDate) {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: userTimezone,
    });
    return `${dateStr} ${timeStr} ${tzAbbr}`;
  }

  // Check if today/tomorrow in user's local timezone
  const localDateStr = date.toLocaleDateString('en-US', { timeZone: userTimezone });
  const todayStr = now.toLocaleDateString('en-US', { timeZone: userTimezone });

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-US', { timeZone: userTimezone });

  if (localDateStr === todayStr) {
    return `Today ${timeStr} ${tzAbbr}`;
  } else if (localDateStr === tomorrowStr) {
    return `Tomorrow ${timeStr} ${tzAbbr}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: userTimezone,
    });
    return `${dateStr} ${timeStr} ${tzAbbr}`;
  }
}

/**
 * Get the local calendar date string for grouping purposes.
 * Returns the date as it appears in the user's timezone.
 *
 * @param {string|Date} utcTime
 * @returns {string} Localized date string for comparison
 */
export function getLocalDateString(utcTime) {
  const date = utcTime instanceof Date ? utcTime : new Date(utcTime);
  return date.toLocaleDateString('en-US', { timeZone: userTimezone });
}

/**
 * Format a date for use as a group header label in the user's local timezone.
 *
 * @param {string|Date} utcTime
 * @returns {string} e.g. "Today", "Tomorrow", "Wednesday, May 7"
 */
export function formatDateGroupLabel(utcTime) {
  const date = utcTime instanceof Date ? utcTime : new Date(utcTime);
  const now = new Date();

  const localDateStr = getLocalDateString(date);
  const todayStr = getLocalDateString(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  if (localDateStr === todayStr) return 'Today';
  if (localDateStr === tomorrowStr) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: userTimezone,
  });
}
