import "server-only";

import type { Prisma, TransactionStatus, TransactionType } from "@prisma/client";

import { prisma, type Tx } from "@/lib/prisma";
import { nextReference } from "@/lib/references";

/**
 * The user-facing transaction ledger.
 *
 * This is a record of events, not a balance store: the platform never holds a
 * mutable balance field that could drift from the investment records.
 */

export interface LedgerEntry {
  userId: string;
  investmentId?: string | null;
  type: TransactionType;
  status?: TransactionStatus;
  amount: Prisma.Decimal | string | number;
  description: string;
  metadata?: Prisma.InputJsonValue;
}

export async function recordTransaction(
  entry: LedgerEntry,
  client: Tx = prisma,
): Promise<void> {
  await client.transaction.create({
    data: {
      reference: await nextReference("transaction", client),
      userId: entry.userId,
      investmentId: entry.investmentId ?? null,
      type: entry.type,
      status: entry.status ?? "COMPLETED",
      amount: entry.amount as Prisma.Decimal,
      description: entry.description,
      metadata: entry.metadata,
    },
  });
}

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  DEPOSIT_SUBMITTED: "Deposit submitted",
  DEPOSIT_APPROVED: "Deposit approved",
  DEPOSIT_REJECTED: "Deposit rejected",
  INVESTMENT_ACTIVATED: "Investment activated",
  INVESTMENT_MATURED: "Investment matured",
  WITHDRAWAL_REQUESTED: "Withdrawal requested",
  WITHDRAWAL_APPROVED: "Withdrawal approved",
  WITHDRAWAL_PAID: "Withdrawal paid",
  WITHDRAWAL_REJECTED: "Withdrawal rejected",
  ROLLOVER_CREATED: "Rollover created",
};
