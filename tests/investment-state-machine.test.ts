import { describe, expect, it } from "vitest";
import type { InvestmentStatus } from "@prisma/client";

import {
  CLOSED_INVESTMENT_STATUSES,
  INVESTMENT_STATUS_LABEL,
  INVESTMENT_STATUS_TONE,
  INVESTMENT_TRANSITIONS,
  OPEN_INVESTMENT_STATUSES,
  canTransition,
  nextActionFor,
  timelineIndexFor,
} from "@/lib/domain/investment-status";

/**
 * The investment state machine.
 *
 * The service layer refuses any transition not listed here, so these tests are
 * the specification of what is and is not reachable.
 */

const ALL_STATUSES = Object.keys(INVESTMENT_TRANSITIONS) as InvestmentStatus[];

describe("permitted transitions", () => {
  it("walks the happy path from draft to completion", () => {
    const path: InvestmentStatus[] = [
      "DRAFT",
      "PAYMENT_PENDING",
      "PAYMENT_SUBMITTED",
      "PAYMENT_UNDER_REVIEW",
      "QUEUED",
      "ACTIVE",
      "MATURED",
      "WITHDRAWAL_REQUESTED",
      "COMPLETED",
    ];

    for (let index = 0; index < path.length - 1; index += 1) {
      expect(
        canTransition(path[index]!, path[index + 1]!),
        `${path[index]} → ${path[index + 1]}`,
      ).toBe(true);
    }
  });

  it("allows a payment to be approved without an explicit review step", () => {
    expect(canTransition("PAYMENT_SUBMITTED", "QUEUED")).toBe(true);
  });

  it("lets a rejected payment be resubmitted", () => {
    expect(canTransition("PAYMENT_REJECTED", "PAYMENT_SUBMITTED")).toBe(true);
  });

  it("returns an investment to matured when a withdrawal is declined", () => {
    expect(canTransition("WITHDRAWAL_REQUESTED", "MATURED")).toBe(true);
  });

  it("allows a rollover only from maturity", () => {
    expect(canTransition("MATURED", "ROLLED_OVER")).toBe(true);

    for (const status of ALL_STATUSES.filter((s) => s !== "MATURED")) {
      expect(canTransition(status, "ROLLED_OVER"), `${status} → ROLLED_OVER`).toBe(false);
    }
  });
});

describe("forbidden transitions", () => {
  it("cannot skip the cycle and go straight from queued to matured", () => {
    expect(canTransition("QUEUED", "MATURED")).toBe(false);
  });

  it("cannot withdraw before maturity", () => {
    expect(canTransition("ACTIVE", "WITHDRAWAL_REQUESTED")).toBe(false);
    expect(canTransition("QUEUED", "WITHDRAWAL_REQUESTED")).toBe(false);
    expect(canTransition("PAYMENT_PENDING", "WITHDRAWAL_REQUESTED")).toBe(false);
  });

  it("cannot activate an investment whose payment has not been approved", () => {
    expect(canTransition("PAYMENT_SUBMITTED", "ACTIVE")).toBe(false);
    expect(canTransition("PAYMENT_PENDING", "ACTIVE")).toBe(false);
    expect(canTransition("PAYMENT_REJECTED", "ACTIVE")).toBe(false);
  });

  it("cannot cancel an investment once it is running", () => {
    expect(canTransition("ACTIVE", "CANCELLED")).toBe(false);
    expect(canTransition("MATURED", "CANCELLED")).toBe(false);
  });

  it("treats terminal states as terminal", () => {
    for (const terminal of ["COMPLETED", "ROLLED_OVER", "CANCELLED"] as InvestmentStatus[]) {
      expect(INVESTMENT_TRANSITIONS[terminal]).toEqual([]);
    }
  });

  it("never allows a status to transition to itself", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransition(status, status), `${status} → ${status}`).toBe(false);
    }
  });
});

describe("status classification", () => {
  it("classifies every status as either open or closed, never both", () => {
    for (const status of ALL_STATUSES) {
      const open = OPEN_INVESTMENT_STATUSES.includes(status);
      const closed = CLOSED_INVESTMENT_STATUSES.includes(status);

      if (status === "DRAFT") continue; // a draft is not yet committed either way
      expect(open !== closed, `${status} is ${open ? "open" : ""}${closed ? "closed" : ""}`).toBe(
        true,
      );
    }
  });

  it("gives every status a label, a tone and a next action", () => {
    for (const status of ALL_STATUSES) {
      expect(INVESTMENT_STATUS_LABEL[status]).toBeTruthy();
      expect(INVESTMENT_STATUS_TONE[status]).toBeTruthy();
      expect(nextActionFor(status)).toBeTruthy();
    }
  });

  it("places active investments after queued ones on the timeline", () => {
    expect(timelineIndexFor("ACTIVE")).toBeGreaterThan(timelineIndexFor("QUEUED"));
    expect(timelineIndexFor("MATURED")).toBeGreaterThan(timelineIndexFor("ACTIVE"));
    expect(timelineIndexFor("COMPLETED")).toBeGreaterThan(timelineIndexFor("MATURED"));
  });

  it("uses the agreed status colours", () => {
    expect(INVESTMENT_STATUS_TONE.QUEUED).toBe("pending");
    expect(INVESTMENT_STATUS_TONE.ACTIVE).toBe("active");
    expect(INVESTMENT_STATUS_TONE.MATURED).toBe("matured");
    expect(INVESTMENT_STATUS_TONE.PAYMENT_REJECTED).toBe("rejected");
    expect(INVESTMENT_STATUS_TONE.COMPLETED).toBe("neutral");
  });
});
