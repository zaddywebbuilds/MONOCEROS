import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Time and weekly-cycle mathematics.
 *
 * Rules that this module encodes (see docs/BUSINESS-RULES.md):
 *  - Every timestamp is stored in UTC.
 *  - Business time is Africa/Lagos (WAT, UTC+1, no daylight saving).
 *  - A new investment cycle opens every Friday at 00:00 Africa/Lagos.
 *  - A payment approved BEFORE a cycle boundary joins that cycle.
 *    A payment approved AT or AFTER the boundary waits for the following week.
 *    Both cases collapse to one rule: the eligible cycle start is the first
 *    boundary strictly greater than the approval instant.
 *  - Countdowns are always derived from `maturesAt - now`; no counter is ever
 *    decremented in the database.
 */

export const BUSINESS_TIMEZONE = "Africa/Lagos";

/** 0 = Sunday … 5 = Friday … 6 = Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const FRIDAY: Weekday = 5;

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export interface CycleConfig {
  /** Day the weekly cycle opens. Default Friday. */
  weekday: Weekday;
  /** Wall-clock opening time in HH:mm, business timezone. Default "00:00". */
  time: string;
  /** IANA timezone the schedule is expressed in. Default Africa/Lagos. */
  timeZone: string;
}

export const DEFAULT_CYCLE_CONFIG: CycleConfig = {
  weekday: FRIDAY,
  time: "00:00",
  timeZone: BUSINESS_TIMEZONE,
};

/** Day of week (0=Sun) of a UTC instant, evaluated in a given timezone. */
export function zonedWeekday(instant: Date, timeZone = BUSINESS_TIMEZONE): Weekday {
  // date-fns "i" token: 1 = Monday … 7 = Sunday
  const iso = Number(formatInTimeZone(instant, timeZone, "i"));
  return (iso % 7) as Weekday;
}

/** yyyy-MM-dd of a UTC instant in a given timezone. */
export function zonedDateKey(instant: Date, timeZone = BUSINESS_TIMEZONE): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

/** HH:mm of a UTC instant in a given timezone. */
function zonedTimeKey(instant: Date, timeZone = BUSINESS_TIMEZONE): string {
  return formatInTimeZone(instant, timeZone, "HH:mm");
}

/**
 * Adds calendar days to a yyyy-MM-dd date key.
 *
 * The arithmetic runs on a date-only value in UTC, so it is unaffected by the
 * timezone the server happens to be configured with and by any daylight-saving
 * transition in it. Date-only values have no offset to shift.
 */
function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) + days * 86_400_000);

  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Converts a local wall-clock date + time in `timeZone` into a UTC instant.
 * `dateKey` must be yyyy-MM-dd, `time` must be HH:mm.
 */
export function zonedInstant(dateKey: string, time: string, timeZone = BUSINESS_TIMEZONE): Date {
  return fromZonedTime(`${dateKey}T${time}:00`, timeZone);
}

function assertValidTime(time: string): void {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error(`Invalid cycle time "${time}" — expected HH:mm (24 hour).`);
  }
}

/**
 * The first cycle boundary strictly AFTER `from`.
 *
 * This single expression implements the business rule for both sides of the
 * cutoff. A payment approved at Thursday 23:59 WAT returns the Friday that is
 * one minute away; a payment approved at Friday 00:00 or 00:01 WAT returns the
 * Friday seven days later.
 */
export function nextCycleStart(
  from: Date,
  config: CycleConfig = DEFAULT_CYCLE_CONFIG,
): Date {
  assertValidTime(config.time);
  const { weekday, time, timeZone } = config;

  // Walk forward from the business-local calendar date of `from`. Eight days is
  // enough to find the next matching weekday in every case.
  const startKey = zonedDateKey(from, timeZone);

  for (let offset = 0; offset <= 8; offset += 1) {
    const candidate = zonedInstant(shiftDateKey(startKey, offset), time, timeZone);

    if (zonedWeekday(candidate, timeZone) !== weekday) continue;
    if (candidate.getTime() > from.getTime()) return candidate;
  }

  throw new Error("Unable to compute the next cycle start.");
}

/**
 * The most recent cycle boundary at or before `from`.
 * Used to identify the cycle that is currently running.
 */
export function currentCycleStart(
  from: Date,
  config: CycleConfig = DEFAULT_CYCLE_CONFIG,
): Date {
  assertValidTime(config.time);
  const { weekday, time, timeZone } = config;

  const startKey = zonedDateKey(from, timeZone);

  for (let offset = 0; offset <= 8; offset += 1) {
    const candidate = zonedInstant(shiftDateKey(startKey, -offset), time, timeZone);

    if (zonedWeekday(candidate, timeZone) !== weekday) continue;
    if (candidate.getTime() <= from.getTime()) return candidate;
  }

  throw new Error("Unable to compute the current cycle start.");
}

/** Cycle boundary one week after `cycleStart`, in business-timezone days. */
export function cycleEndFor(cycleStart: Date, timeZone = BUSINESS_TIMEZONE): Date {
  return maturityFor(cycleStart, 7, timeZone);
}

/**
 * Maturity instant for an investment activated at `startedAt`.
 *
 * The term is counted in CALENDAR days in the business timezone, not in the
 * timezone the server happens to run in. The date part is advanced on a
 * date-only value and the original wall-clock time is re-anchored in the
 * business zone, so the result is identical on every host and stable across
 * restarts, deployments and client clock changes.
 */
export function maturityFor(
  startedAt: Date,
  durationDays: number,
  timeZone = BUSINESS_TIMEZONE,
): Date {
  const dateKey = shiftDateKey(zonedDateKey(startedAt, timeZone), durationDays);
  return zonedInstant(dateKey, zonedTimeKey(startedAt, timeZone), timeZone);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "September 11, 2026" in business time. */
export function formatBusinessDate(instant: Date | string, timeZone = BUSINESS_TIMEZONE): string {
  return formatInTimeZone(new Date(instant), timeZone, "MMMM d, yyyy");
}

/**
 * Short label for a timezone. The IANA database has no abbreviation for
 * Africa/Lagos that Intl will produce (it returns "GMT+1"), so the one
 * abbreviation the business actually uses is named explicitly and every other
 * zone falls back to its identifier rather than to a guess.
 */
function timeZoneLabel(timeZone: string): string {
  return timeZone === BUSINESS_TIMEZONE ? "WAT" : timeZone;
}

/** "11 Sep 2026, 00:00 WAT" */
export function formatBusinessDateTime(
  instant: Date | string,
  timeZone = BUSINESS_TIMEZONE,
): string {
  const formatted = formatInTimeZone(new Date(instant), timeZone, "d MMM yyyy, HH:mm");
  return `${formatted} ${timeZoneLabel(timeZone)}`;
}

/** "Friday, 11 September 2026" */
export function formatCycleLabel(instant: Date | string, timeZone = BUSINESS_TIMEZONE): string {
  return formatInTimeZone(new Date(instant), timeZone, "EEEE, d MMMM yyyy");
}

/** Short table format: "11 Sep 2026" */
export function formatShortDate(
  instant: Date | string | null | undefined,
  timeZone = BUSINESS_TIMEZONE,
): string {
  if (!instant) return "—";
  return formatInTimeZone(new Date(instant), timeZone, "d MMM yyyy");
}

// ---------------------------------------------------------------------------
// Countdown
// ---------------------------------------------------------------------------

export interface Countdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Always derived from a target instant minus the current instant. */
export function countdownTo(target: Date | string, now: Date = new Date()): Countdown {
  const totalMs = new Date(target).getTime() - now.getTime();
  const clamped = Math.max(totalMs, 0);
  return {
    totalMs,
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped % 86_400_000) / 3_600_000),
    minutes: Math.floor((clamped % 3_600_000) / 60_000),
    seconds: Math.floor((clamped % 60_000) / 1000),
    expired: totalMs <= 0,
  };
}

/** "23 Days 14 Hours" — coarse label for cards and tables. */
export function formatCountdownCoarse(countdown: Countdown): string {
  if (countdown.expired) return "Matured";
  if (countdown.days > 0) {
    return `${countdown.days} ${countdown.days === 1 ? "Day" : "Days"} ${countdown.hours} ${
      countdown.hours === 1 ? "Hour" : "Hours"
    }`;
  }
  if (countdown.hours > 0) return `${countdown.hours}h ${countdown.minutes}m`;
  return `${countdown.minutes}m`;
}

/** Fraction of an investment term elapsed, 0…1. */
export function progressBetween(start: Date | string, end: Date | string, now = new Date()): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (e <= s) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - s) / (e - s)));
}
