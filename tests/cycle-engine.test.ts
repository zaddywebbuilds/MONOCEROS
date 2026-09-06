import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";

import {
  BUSINESS_TIMEZONE,
  DEFAULT_CYCLE_CONFIG,
  countdownTo,
  currentCycleStart,
  cycleEndFor,
  formatCycleLabel,
  maturityFor,
  nextCycleStart,
  progressBetween,
  zonedWeekday,
  type CycleConfig,
} from "@/lib/time";

/**
 * The weekly cycle engine.
 *
 * This is the most consequential rule on the platform: it decides which week a
 * subscriber's money starts working, so the boundary cases are tested
 * explicitly rather than by inference.
 */

/** Builds a UTC instant from an Africa/Lagos wall-clock time. */
function lagos(dateTime: string): Date {
  return fromZonedTime(dateTime, BUSINESS_TIMEZONE);
}

describe("cycle boundary — the Friday rule", () => {
  it("puts a payment approved at Thursday 23:59 WAT into the very next morning's cycle", () => {
    const approvedAt = lagos("2026-09-10T23:59:00"); // Thursday
    const cycle = nextCycleStart(approvedAt);

    expect(formatCycleLabel(cycle)).toBe("Friday, 11 September 2026");
    expect(cycle.getTime() - approvedAt.getTime()).toBe(60_000);
  });

  it("pushes a payment approved exactly at Friday 00:00 WAT to the following Friday", () => {
    const approvedAt = lagos("2026-09-11T00:00:00"); // Friday, on the boundary
    const cycle = nextCycleStart(approvedAt);

    expect(formatCycleLabel(cycle)).toBe("Friday, 18 September 2026");
  });

  it("pushes a payment approved at Friday 00:01 WAT to the following Friday", () => {
    const approvedAt = lagos("2026-09-11T00:01:00");
    const cycle = nextCycleStart(approvedAt);

    expect(formatCycleLabel(cycle)).toBe("Friday, 18 September 2026");
  });

  it("keeps a payment approved late on Friday in the following week", () => {
    const approvedAt = lagos("2026-09-11T23:59:59");
    expect(formatCycleLabel(nextCycleStart(approvedAt))).toBe("Friday, 18 September 2026");
  });

  it("routes mid-week approvals to the upcoming Friday", () => {
    const cases: [string, string][] = [
      ["2026-09-05T09:00:00", "Friday, 11 September 2026"], // Saturday
      ["2026-09-06T09:00:00", "Friday, 11 September 2026"], // Sunday
      ["2026-09-07T09:00:00", "Friday, 11 September 2026"], // Monday
      ["2026-09-09T18:30:00", "Friday, 11 September 2026"], // Wednesday
    ];

    for (const [approved, expected] of cases) {
      expect(formatCycleLabel(nextCycleStart(lagos(approved)))).toBe(expected);
    }
  });

  it("always returns an instant that is a Friday at midnight in Lagos", () => {
    for (let day = 1; day <= 28; day += 1) {
      const at = lagos(`2026-09-${String(day).padStart(2, "0")}T13:07:00`);
      const cycle = nextCycleStart(at);

      expect(zonedWeekday(cycle)).toBe(5);
      expect(cycle.getTime()).toBeGreaterThan(at.getTime());
    }
  });

  it("never returns a boundary more than seven days away", () => {
    for (let hour = 0; hour < 24 * 7; hour += 7) {
      const at = new Date(lagos("2026-09-01T00:00:00").getTime() + hour * 3_600_000);
      const cycle = nextCycleStart(at);
      const gapDays = (cycle.getTime() - at.getTime()) / 86_400_000;

      expect(gapDays).toBeGreaterThan(0);
      expect(gapDays).toBeLessThanOrEqual(7);
    }
  });
});

describe("current cycle", () => {
  it("reports the Friday that has already opened", () => {
    const wednesday = lagos("2026-09-16T10:00:00");
    expect(formatCycleLabel(currentCycleStart(wednesday))).toBe("Friday, 11 September 2026");
  });

  it("treats the boundary instant itself as the current cycle", () => {
    const boundary = lagos("2026-09-11T00:00:00");
    expect(currentCycleStart(boundary).getTime()).toBe(boundary.getTime());
  });

  it("closes a cycle exactly seven days after it opens", () => {
    const start = lagos("2026-09-11T00:00:00");
    expect(cycleEndFor(start).getTime() - start.getTime()).toBe(7 * 86_400_000);
  });
});

describe("configurable schedule", () => {
  it("honours a different weekday and opening time", () => {
    const config: CycleConfig = { weekday: 1, time: "09:30", timeZone: BUSINESS_TIMEZONE };
    const at = lagos("2026-09-09T12:00:00"); // Wednesday

    const cycle = nextCycleStart(at, config);

    expect(zonedWeekday(cycle)).toBe(1);
    expect(formatCycleLabel(cycle)).toBe("Monday, 14 September 2026");
  });

  it("rejects a malformed opening time rather than guessing", () => {
    expect(() =>
      nextCycleStart(new Date(), { weekday: 5, time: "25:00", timeZone: BUSINESS_TIMEZONE }),
    ).toThrow(/Invalid cycle time/);
  });

  it("defaults to Friday at midnight in Africa/Lagos", () => {
    expect(DEFAULT_CYCLE_CONFIG).toEqual({
      weekday: 5,
      time: "00:00",
      timeZone: "Africa/Lagos",
    });
  });
});

describe("maturity", () => {
  it("matures exactly 30 calendar days after activation", () => {
    const started = lagos("2026-09-11T00:00:00");
    const matures = maturityFor(started, 30);

    expect(formatCycleLabel(matures)).toBe("Sunday, 11 October 2026");
    expect(matures.getTime() - started.getTime()).toBe(30 * 86_400_000);
  });

  it("respects a package with a different term length", () => {
    const started = lagos("2026-09-11T00:00:00");
    expect(maturityFor(started, 60).getTime() - started.getTime()).toBe(60 * 86_400_000);
  });

  it("is stable regardless of when it is recalculated", () => {
    const started = lagos("2026-09-11T00:00:00");
    const first = maturityFor(started, 30);
    const second = maturityFor(started, 30);

    expect(first.toISOString()).toBe(second.toISOString());
  });
});

describe("countdown", () => {
  it("derives the remaining time from the target and the current instant", () => {
    const now = new Date("2026-09-11T00:00:00.000Z");
    const target = new Date(now.getTime() + 2 * 86_400_000 + 14 * 3_600_000 + 32 * 60_000);

    const countdown = countdownTo(target, now);

    expect(countdown.days).toBe(2);
    expect(countdown.hours).toBe(14);
    expect(countdown.minutes).toBe(32);
    expect(countdown.expired).toBe(false);
  });

  it("reports expiry once the target has passed", () => {
    const now = new Date("2026-10-12T00:00:00.000Z");
    const countdown = countdownTo(new Date("2026-10-11T00:00:00.000Z"), now);

    expect(countdown.expired).toBe(true);
    expect(countdown.days).toBe(0);
  });

  it("clamps progress to the 0…1 range", () => {
    const start = new Date("2026-09-11T00:00:00.000Z");
    const end = new Date("2026-10-11T00:00:00.000Z");

    expect(progressBetween(start, end, start)).toBe(0);
    expect(progressBetween(start, end, end)).toBe(1);
    expect(progressBetween(start, end, new Date("2026-11-01T00:00:00.000Z"))).toBe(1);
    expect(progressBetween(start, end, new Date("2026-09-26T00:00:00.000Z"))).toBeCloseTo(0.5, 2);
  });
});
